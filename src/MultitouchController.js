var MULTITOUCH_CONTROLLER = MULTITOUCH_CONTROLLER || {};

MULTITOUCH_CONTROLLER.Controller = function(parameters) {

	// camera is really the only necessity
	if (parameters.camera === undefined) {
		console.error("Error: Controller requires a camera.");
		return {}; // designed to not work if no camera
	} else {
		this.camera = parameters.camera;
	}
	this.container = parameters.container || document.body; // container for event listening, document.body is the fallback
	this.multitouch = parameters.multitouch || true; // multitouch flag
	this.fov = parameters.fov || false;

	this.CAMERA_MAX = (this.fov) ? this.camera.fov : this.camera.position.z; // get the initial state of the z, will be the max. min is 0 implicitly

	this.interacting = false;
	this.pan = new MULTITOUCH_CONTROLLER.Vector().zero(); // pan offset
	this.release = new MULTITOUCH_CONTROLLER.Vector().zero(); // release speed
	this.press = new MULTITOUCH_CONTROLLER.Vector().zero(); // current press coordinates
	this.previous_press = new MULTITOUCH_CONTROLLER.Vector().zero(); // old press coordinates
	this.ZERO = new MULTITOUCH_CONTROLLER.Vector().zero();

	this.previous_time = 0;
	this.pointer = false;
	this.touch_count = 0;
	this.touches = [];
	this.touch_change = false;
	this.dist = 0;
	this.createEvents(); // set up the event listeners

	this.controls_camera = (this.camera instanceof MULTITOUCH_CONTROLLER.Camera) ? true : false;
}

/*
 * Check for updates
 */
MULTITOUCH_CONTROLLER.Controller.prototype.update = function() {

	// calculate zoom to adjust panning at different zoom levels
	var _zoom = this.CAMERA_MAX / this.camera.position.z;

	this.camera.position.x /= _zoom;
	this.camera.position.y /= _zoom;

	// if user is using an MULTITOUCH_CONTROLLER.Camera
	if (this.controls_camera) {
		this.camera.update();
	}

	// check if need to release
	if (!this.release.equals(this.ZERO) && !this.interacting) {
		this.releasePress();
	}

	// reset the camera
	this.camera.position.x *= _zoom;
	this.camera.position.y *= _zoom;
}

/*
 * Handle releasing animation
 */
MULTITOUCH_CONTROLLER.Controller.prototype.releasePress = function() {

	this.camera.position.x += this.release.x; // update release
	this.camera.position.y += this.release.y;
	this.release.multiply(0.9); // slow down release speed

	// if release is really slow, zero it out
	if (Math.abs(this.release.x) < 0.1 && Math.abs(this.release.y) < 0.1) {
		this.release.zero();
	}
}

/*
 * Set up all the event listeners
 */
MULTITOUCH_CONTROLLER.Controller.prototype.createEvents = function() {

	var _that = this; // preserve name space

	/*
	 * Press down event
	 */
	function onPressDown(event) {
		event.preventDefault();

		// if user is using an MULTITOUCH_CONTROLLER.Camera
		if (_that.controls_camera && event.target !== _that.camera.camera) {
			console.log("using camera", event.target.parentNode);
			//onPressDown(event);
			var _cache = event;
			_cache.target = event.target.parentNode;
		}

		// if not interacting
		if (!_that.interacting) {
			_that.interacting = true; // set interacting to true
			
			// for touchstart
			if (event.type === "touchstart") {

				var t = 0;
				_that.press.zero(); // zero out press tracker

				// get touch total
				for (t = 0; t < event.touches.length; t++) {
					_that.press.x += event.touches[t].clientX;
					_that.press.y += event.touches[t].clientY;
				}
	
				_that.press.divide(t); // average it

				_that.touch_count = t; // update touch count
				_that.dist = 0; // reset distance
			} else { // mouse and pointer
				
				_that.press.x = event.clientX; // get clientX/Y
				_that.press.y = event.clientY;

				if (_that.pointer && event.pointerType === "touch") {
					_that.touches.push(event); // push the first touch onto the array
					_that.touch_count = 1;
				}
			}

			_that.camera.position.y *= -1;
			_that.pan.addVectors(_that.press, _that.camera.position); // pan holds your current location
			_that.camera.position.y *= -1;

			_that.release.zero(); // release is zeroed out
			_that.previous_press.copy(_that.press);
		} else {

			// if adding pointer touches
			if (_that.pointer && event.pointerType === "touch") {

				_that.touches.push(event); // add the touch to the array
				_that.touch_count++; // increment touch count
				_that.touch_change = true; // touches have changed

				var _move = new MULTITOUCH_CONTROLLER.Vector(),
					_diff = new MULTITOUCH_CONTROLLER.Vector();

				// offset for the new press location
				for (var t = 0; t < _that.touch_count; t++) {
					_move.x += _that.touches[t].clientX;
					_move.y += _that.touches[t].clientY;
				}

				// update all the location information
				_move.divide(_that.touch_count);
				_diff.subVectors(_move, _that.previous_press);
				_that.pan.add(_diff);
				_that.previous_press.add(_diff);
			}
		}
	}

	/*
	 * Handler for moving the view
	 */
	function onPressMove(event) {
		event.preventDefault();

		// only act if the user is interacting
		if (_that.interacting) {

			_that.previous_press.copy(_that.press); // update previous press location

			if (event.type === "touchmove") { // touch move event

				// reset vars
				var t = 0;
				_that.touch_change = false;
				_that.press.zero();

				// touch average
				for (t = 0; t < event.touches.length; t++) {
					_that.press.x += event.touches[t].clientX;
					_that.press.y += event.touches[t].clientY;
				}

				_that.press.divide(t);

				// if t and stored length differ, touches changed
				if (t !== _that.touch_count) {
					_that.touch_change = true;

					var _diff = new MULTITOUCH_CONTROLLER.Vector();

					_diff.subVectors(_that.press, _that.previous_press);
					_that.pan.add(_diff);
					_that.previous_press.add(_diff);

					_that.touch_count = event.touches.length;
				}
			} else { // pointer events

				// pointer touch
				if (_that.pointer && event.pointerType === "touch") {
	
					_that.touch_change = false;

					var _p_id = event.pointerId; // update touch based on pointer id

					_that.press.zero();

					for (var p = 0; p < _that.touch_count; p++) {
						if (_p_id === _that.touches[p].pointerId) {
							_that.touches.splice(p, 1);
							_that.touches.push(event);
						}

						_that.press.x += _that.touches[p].clientX;
						_that.press.y += _that.touches[p].clientY;
					}

					_that.press.divide(_that.touch_count);
				} else { // mouse is a simple case

					_that.press.x = event.clientX;
					_that.press.y = event.clientY;
				}
			}

			_that.camera.position.x = (_that.pan.x - _that.press.x);
			_that.camera.position.y = (_that.press.y - _that.pan.y);

			// check for a pinch zoom
			if (_that.touch_count >= 2) {
				if (_that.pointer) {
					onPinchZoom(_that.touches);
				} else {
					onPinchZoom(event.touches);
				}
			}

			_that.previous_time = event.timeStamp;
		}
	}
	
	/*
	 * Handle for press up event
	 */
	function onPressUp(event) {
		event.preventDefault();

		// end a pointer touch
		if (_that.pointer && event.pointerType === "touch") {
			var _p_id = -1;
			for (var p = 0; p < _that.touch_count; p++) {
				if (event.pointerId === _that.touches[p].pointerId) {
					_p_id = p
				}
			}
			if (_p_id > -1) {
				_that.touches.splice(_p_id, 1); // remove touch if it exists
			}
			_that.touch_count = _that.touches.length;
		}

		// if mouse up or ALL touches are completed
		if ((_that.pointer && (event.pointerType === "mouse" || (event.pointerType === "touch" && _that.touch_count === 0))) || (event.type === "mouseup" || (event.type === "touchend" && event.touches.length === 0))) {
			_that.interacting = false;

			// this prevents the image from releasing if it has been held still, should be 1 frame at 30fps, 2 at 60 fps
			if (event.timeStamp - _that.previous_time < 35) {

				_that.release.subVectors(_that.previous_press, _that.press); // set release speed
				_that.release.y *= -1;
			}
		}

	}

	/*
	 * Handle a pinch zoom event
	 */
	function onPinchZoom(pinch) {

		var _current_dist = new MULTITOUCH_CONTROLLER.Vector(),
			_total_dist = 0,
			_delta = 0;

		// calculate the current total distance
		for (var t = 0; t < pinch.length; t++) {
			_current_dist.subVectors(_that.press, new MULTITOUCH_CONTROLLER.Vector(pinch[t].clientX, pinch[t].clientY));
			_total_dist += _current_dist.magnitude();
		}

		// if touches changed
		if (_that.dist === 0 || _that.touch_change) {
			_that.dist = _total_dist;
			return;
		}
		// delta
		_delta = (_total_dist - _that.dist);

		// update current distance to remember
		_that.dist = _total_dist;

		boundZoom(_delta);
	}

	/*
	 * Handle the mouse wheel events
	 */
	function onMouseWheel(event) {
		event.preventDefault();

		var _delta = 0; // delta is set up

		if (event.wheelDeltaY) {

			_delta = event.wheelDeltaY * 0.05;
		} else if (event.wheelDelta) {

			_delta = event.wheelDelta * 0.05;
		} else if (event.deltaY) {

			_delta = -event.deltaY;
		} else if (event.detail) {

			_delta = event.detail;
		}

		boundZoom(_delta);
	}

	/*
	 * Bounds the zoom level
	 */
	function boundZoom(delta) {

		if (_that.fov) {
			_that.camera.fov -= delta;
			if (_that.camera.fov < 0.1) {
				_that.camera.fov = 0.1;
			}
		} else {
			_that.camera.position.z -= delta;

			if (_that.camera.position.z < 200) {
				_that.camera.position.z = 200;
			}
		}
	}

	// set up the event listeners
	if (window.PointerEvent) { // IE
		this.pointer = true;
		this.container.addEventListener('pointerdown', onPressDown, false);
		this.container.addEventListener('pointermove', onPressMove, false);
		this.container.addEventListener('pointerup', onPressUp, false);
	} else {
		// mouse event
		this.container.addEventListener('mousedown', onPressDown, false);
		this.container.addEventListener('mousemove', onPressMove, false);
		this.container.addEventListener('mouseup', onPressUp, false);
		if (this.multitouch) { // touch enabled
			this.container.addEventListener('touchstart', onPressDown, false);
			this.container.addEventListener('touchmove', onPressMove, false);
			this.container.addEventListener('touchend', onPressUp, false);
		}
	}
	this.container.addEventListener('mousewheel', onMouseWheel, false);
	this.container.addEventListener('wheel', onMouseWheel, false); // Firefox
}

/*
 * 3-D Vector used to help calculations
 */
MULTITOUCH_CONTROLLER.Vector = function(x, y, z) {
	
	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;
}

/*
 * Prototype for the vector
 */
MULTITOUCH_CONTROLLER.Vector.prototype = {

	// calculate the magnitude
	magnitude: function() {
		return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2));
	},

	// copy another vector into this one
	copy: function(a) {
		this.x = a.x;
		this.y = a.y;
		this.z = a.z;

		return this;
	},
 
	// set all the values
	set: function(set_x, set_y, set_z) {
		this.x = set_x || 0;
		this.y = set_y || 0;
		this.z = set_z || 0;
		
		return this;
	},

	// multiply by a scalar
	multiply: function(a) {
		this.x *= a;
		this.y *= a;
		this.z *= a; 

		return this;
	},

	// divide by a scalar
	divide: function(a) {
		if (a === 0) {
			return;
		}
		this.x /= a;
		this.y /= a;
		this.z /= a;

		return this;
	},

	// add another vector
	add: function(a) {
		this.x += a.x;
		this.y += a.y;
		this.z += a.z;

		return this;
	},
	 
	// store the sum of two vector in here
	addVectors: function(a, b) {
		this.x = a.x + b.x;
		this.y = a.y + b.y;
		this.z = a.z + b.z;

		return this;
	},
	
	// subtract a vector from here
	sub: function(a) {
		this.x -= a.x;
		this.y -= a.y;
		this.z -= a.z;

		return this;
	},

	// store diff of two vectors here
	subVectors: function(a, b) {
		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z; 

		return this;
	},

	// check equality against another vector
	equals: function(a) {
		return (this.x === a.x && this.y === a.y && this.z === a.z);
	},

	zero: function() {
		this.x = 0;
		this.y = 0;
		this.z = 0;

		return this;
	}
}

/*
 * Fake camera prototype to help users out
 */
MULTITOUCH_CONTROLLER.Camera = function(camera, container, zoom) {

	// camera container and the image container
	this.camera = camera;
	this.container = container;

	// set the position vector and the style and transforms
	this.init_zoom = zoom || 600;
	this.scale = 1;
	this.position = new MULTITOUCH_CONTROLLER.Vector(0, 0, this.init_zoom);
	this.camera.style.position = "absolute";
	this.camera.style.width = "inherit";
	this.camera.style.height = "inherit";
	this.camera.style.left = "0px";
	this.camera.style.top = "0px";

	// set the initial scale
	this.setScale();
}

/*
 * Camera operations
 */
MULTITOUCH_CONTROLLER.Camera.prototype = {

	// update the images and the camera zoom
	update: function() {

		// check zoom and scale
		var _zoom = this.init_zoom / this.position.z;

		// if the scale changed, update it
		if (_zoom !== this.scale) {
			this.scale = _zoom;
			this.setScale();

		}

		// move the images for panning action
		this.container.style.left = -this.position.x + "px";
		this.container.style.top = this.position.y + "px";
	},

	/*
	 * Set transform scale
	 */
	setScale: function() {

		var _scale = "scale(" + this.scale + ", " + this.scale + ")";

		this.camera.style.transform = _scale;
		this.camera.style.WebkitTransform = _scale;
		this.camera.style.MozTransform = _scale
		this.camera.style.OTransform = _scale;
		this.camera.style.MSTransform = _scale;
	}
}
