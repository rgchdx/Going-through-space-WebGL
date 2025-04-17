"use strict";

var stars = function () {
  let canvas, gl, program;
  let sphereVertices, sphereIndices; 

  // Where the viewer is looking from
  let eye = vec3(0, 0, 5);
  // Where the viewer is looking at
  let at = vec3(0, 0, 0);
  // Specifying the up direction
  let up = vec3(0, 1, 0);

  // Setting up the projection matrix
  // The fov is the field of view in degrees
  let fov = 60;
  // Near is the distance to the near clipping plane
  let near = 0.1;
  // Far is the distance to the far clipping plane
  let far = 100;

  let rotationAngle = 0;

  // Finding colors and positions for the planets
  let spheres = [
    { pos: vec3(-3, 1, -5), color: vec4(0.4, 0.2, 0.1, 1.0) }, // Mars
    { pos: vec3(0, -1, -10), color: vec4(0.0, 0.5, 1.0, 1.0) }, // Earth
    { pos: vec3(3, 0, -20), color: vec4(1.0, 0.8, 0.2, 1.0) }  // Jupiter
  ];

  window.onload = function init() {
    // Getting canvas elements
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) alert("WebGL 2.0 isn't available");

    // Setting viewport and black background
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Enable depth testing for 3D
    gl.enable(gl.DEPTH_TEST);

    // Initialize shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create sphere with radius of 1 and 40 latitude and longitude bands
    // This returns a tuple of vertices and indices
    const sphereData = createSphere(1, 20, 20);
    sphereVertices = sphereData.vertices;
    sphereIndices = sphereData.indices;

    // Buffer for the vertices
    // Create a buffer to hold the position datapoints for the planets
    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereVertices), gl.STATIC_DRAW);

    let aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    // Buffer for the indices
    // Create and bind index buffer for lines
    const iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereIndices), gl.STATIC_DRAW);

    // Setting up event listeners for key presses to move around the scene
    window.addEventListener("keydown", keyPressed);

    render();
  };

  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Setting up the projection matrix
    // Transforming the 3D coordinates to 2D. Defines how the 3D schene is projected onto the 2D viewpoint.
    let projectionMatrix = perspective(fov, canvas.width / canvas.height, near, far);
    // Sending the projection matrix to the shader
    // The flatten will convert the matrix to a 1D array
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjectionMatrix"), false, flatten(projectionMatrix));

    if (spheres[0]){
        rotationAngle += 0.5; // Increase rotation each frame
    } else if (spheres[1]){
        rotationAngle +=0.3
    } else {
        rotationAngle += 0.8
    }

    for (let i = 0; i < spheres.length; ++i) {
      // Setting up the model view matrix
      // Defines the camera position and orientation in the scene
      // lookAt function generates a view matrix that transforms the scene so taht the camera position is at eye,
      // oriented to look at the object at the at point, and up so we know which is the up direction.
      let mv = lookAt(eye, at, up);

      // Bobbing effect. Uses the sin function ot go up and down with the wave.
      let floatY;
      if (i==0){
        floatY = Math.sin(rotationAngle * 0.02 + i) * 0.2;
      } else if (i==1){
        floatY = Math.sin(rotationAngle * 0.05 + i) * 0.2;
      } else {
        floatY = Math.sin(rotationAngle * 0.01 + i) * 0.2;
      }

      // Applying the translation and rotation
      // Adding the bobbing effect on the y-axis
      mv = mult(mv, translate(spheres[i].pos[0], spheres[i].pos[1] + floatY, spheres[i].pos[2]));
      // Adding the rotation effect with the y-axis as the axis of rotation
      mv = mult(mv, rotate(rotationAngle, vec3(0, 1, 0)));

      // Sending the model view matrix to the shader
      gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(mv));
      gl.uniform4fv(gl.getUniformLocation(program, "uColor"), spheres[i].color);

      // Draw the outline using lines
      // this is using the information from the index buffer above and concatenating each vertex with the next indexed vertex
      gl.drawElements(gl.LINES, sphereIndices.length, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(render);
  }

  // Creating spheres using latitude and longitude bands
  function createSphere(radius, latBands, longBands) {
    // Position array to hold the vertices
    let vertices = [];
    let indices = [];

    for (let lat = 0; lat <= latBands; ++lat) {
      let theta = lat * Math.PI / latBands;
      let sinTheta = Math.sin(theta);
      let cosTheta = Math.cos(theta);
      for (let lon = 0; lon <= longBands; ++lon) {
        let phi = lon * 2 * Math.PI / longBands;
        let sinPhi = Math.sin(phi);
        let cosPhi = Math.cos(phi);
        let x = cosPhi * sinTheta;
        let y = cosTheta;
        let z = sinPhi * sinTheta;
        // Adding vertex to the array for each longitude and latitude
        vertices.push(vec4(radius * x, radius * y, radius * z, 1.0));
      }
    }

    // Generate indices for lines (outline)
    // We iterate over the longitude and latitude bands to get the indicies
    for (let lat = 0; lat < latBands; ++lat) {
      for (let lon = 0; lon < longBands; ++lon) {
        let first = lat * (longBands + 1) + lon;
        let second = first + longBands + 1;
        // Horizontal lines: we get the one vertex and the next one in the same latitude band
        indices.push(first, first + 1);
        // Vertical lines: we get the one next over in the next latitude band
        indices.push(first, second);
      }
    }

    return { vertices, indices };
  }

  // Function to handle key presses using switch
  function keyPressed(event) {
    const speed = 0.4;
    switch (event.key) {
      case 'w': eye[2] -= speed; break;
      case 's': eye[2] += speed; break;
      case 'a': eye[0] += speed; break;
      case 'd': eye[0] -= speed; break;
      case 'ArrowUp': at[1] += speed; break;
      case 'ArrowDown': at[1] -= speed; break;
      case 'ArrowLeft': at[0] -= speed; break;
      case 'ArrowRight': at[0] += speed; break;
    }
  }
};

stars();