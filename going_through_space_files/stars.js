"use strict";

var stars = function () {
  let canvas, gl, program;
  let sphereVertices;

  let eye = vec3(0, 0, 5);
  let at = vec3(0, 0, 0);
  let up = vec3(0, 1, 0);

  let fov = 60;
  let near = 0.1;
  let far = 100;

  let spheres = [
    { pos: vec3(-3, 0, -5), color: vec4(0.4, 0.2, 0.1, 1.0) }, // Mars
    { pos: vec3(0, 0, -10), color: vec4(0.0, 0.5, 1.0, 1.0) }, // Earth
    { pos: vec3(3, 0, -20), color: vec4(1.0, 0.8, 0.2, 1.0) }  // Jupiter
  ];

  window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    sphereVertices = createSphere(1, 40, 40);

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereVertices), gl.STATIC_DRAW);

    let aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    window.addEventListener("keydown", keyPressed);

    render();
  };

  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projectionMatrix = perspective(fov, canvas.width / canvas.height, near, far);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjectionMatrix"), false, flatten(projectionMatrix));

    for (let i = 0; i < spheres.length; ++i) {
      let mv = lookAt(eye, at, up);
      mv = mult(mv, translate(spheres[i].pos[0], spheres[i].pos[1], spheres[i].pos[2]));

      gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(mv));
      gl.uniform4fv(gl.getUniformLocation(program, "uColor"), spheres[i].color);

      gl.drawArrays(gl.POINTS, 0, sphereVertices.length);
    }

    requestAnimationFrame(render);
  }

  function createSphere(radius, latBands, longBands) {
    let vertices = [];

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

        vertices.push(vec4(radius * x, radius * y, radius * z, 1.0));
      }
    }

    return vertices;
  }

  function keyPressed(event) {
    const speed = 0.4;
    switch (event.key) {
      case 'w': eye[2] -= speed; break;
      case 's': eye[2] += speed; break;
      case 'a': eye[0] += speed; break;
      case 'd': eye[0] -= speed; break;
    }
  }
};

stars();