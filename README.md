## Multitouch Controller

#### Javascript Library to abstract touch and mouse controls

This is a lightweight, cross-browser library that allows the user to forget about controls. Just pass a container and a camera to the controller and it will handle all events for you. The camera is manipulated according to the events and updated every frame. You the user decide how you want to use that information (bound conditions and the like.)

There are no dependencies for this library. Some of the test cases do use an external library (to test compatability), so to make those cases work you will need to get the source code for [Gallery.js](https://github.com/bsboiko/Gallery.js) and place it in the `examples/` directory.

#### Basic usage

The MultitouchController.js library has a simple Vector and Camera prototype in the situation that you don't use another library (like [Three.js](https://github.com/mrdoob/three.js) or Gallery.js).

This sets up a simple picture container with only one image.

##### HTML

``` html

<div id="container">
  <div id="camera">
    <img src="examples/images/subPic1.jpg" id="image">
  </div>
</div>

```

Here we have set up the container that will hold everything, our 'fake' camera that will act on the scene, and our image that is nested within the camera.

##### CSS

``` html

body {
  margin: 0px;
  touch-action: none;
}

#container {
  position: absolute;
  width: 700px;
  height: 500px;
  background: #000000;
  overflow: hidden;
}

#image {
  position: absolute;
}

```

Some notes: the `touch-action: none` property exists to disable default page touch events in IE. The `position: absolute` is crucial; if your images are acting weird, that's probably why. The width and height options are completely arbitrary, and I just like a black background. `overflow: hidden` is used to make sure that the images don't roll out of the container region.

##### JavaScript

``` html

<script src="src/MultitouchController.js"></script>

<script>

  var controls,
      container,
      camera,
      image;
      
  function init() {
    container = document.getElementById("container");
    image = document.getElementById("image");
    camera = new MULTITOUCH_CONTROLLER.Camera(document.getElementById("camera"), image);
    
    controls = new MULTITOUCH_CONTROLLER.Controller({
      camera: camera,
      container: container
    });
    
    update();
  }

  function update() {
    controls.update();
    
    requestAnimationFrame(update);
  }

```

This imports the MultitouchController library, gets the container and image elements, and creates the camera using the camera div and the image element. Then it creates a new Controller instance with the camera object and the container element. Finally it lets it run and updates. The Camera object within this library will move the image according to output from the camera, but it will not apply any bound conditions. That is up to you to define.
