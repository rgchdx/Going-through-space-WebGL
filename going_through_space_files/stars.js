"use strict";

var hat = function() {

var gl;

var nRows = 50;
var nColumns = 50;

// data for radial hat function: sin(Pi*r)/(Pi*r)

var data = [];
for(var i = 0; i < nRows; ++i) {
    data.push([]);
    // This variable is calculated as a scaled value based on the row index i. Maps i to a range of -2pi to 2pi
    var x = Math.PI*(4*i/nRows-2.0);

    for(var j = 0; j < nColumns; ++j) {
        // This variable is calculated as a scaled value based on the column index j. Maps j to a range of -2pi to 2pi
        var y = Math.PI*(4*j/nRows-2.0);
        // r is calculated as the euclidean distance from the origin (0,0) to the point (x,y)
        var r = Math.sqrt(x*x+y*y);

        // take care of 0/0 for r = 0

        // The value of data[i][j] is calculated using the radial hat function
        data[i][j] = r ? Math.sin(r) / r : 1.0;
    }
}

var positionsArray = [];

var colorLoc;

// Defining the near and far clippping planes for the viewing volume in the projection matrix
var near = -10;
var far = 10;
// Represents the distance from the camera to the target point (at)
var radius = 1.0;
// Angles for spherical coordinates
var theta = 0.0;
var phi = 0.0;
// A small angular increment used to adjust theta or phi for camera
var dr = 5.0 * Math.PI/180.0;

const black = vec4(0.0, 0.0, 0.0, 1.0);
const red = vec4(1.0, 0.0, 0.0, 1.0);


// To tell which is which for the camera
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// Defining the boundaries of the viewing volume for an orthographic projection or perspective projection
// These values determine the visible region of the scene
var left = -2.0;
var right = 2.0;
var top = 2.0;
var bottom = -2.0;

// Model view and projection matrices
var modeViewMatrix, projectionMatrix;
// Uniform locations for the model view and projection matrices
var modelViewMatrixLoc, projectionMatrixLoc;

window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert( "WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // enable depth testing and polygon offset
    // so lines will be in front of filled triangles

    // Enables depth testing, which ensures that fragments closer to the camera are rendered in front of those farther
    // away.
    gl.enable(gl.DEPTH_TEST);
    // Sets the depth comparison function to less than or equal, meaning that a fragment will be drawn if its depth
    gl.depthFunc(gl.LEQUAL);
    // Enables polygon offset fill, which is used to adjust the depth of filled polygons to prevent z-fighting
    gl.enable(gl.POLYGON_OFFSET_FILL);
    // Sets the polygon offset parameters, which control the depth offset applied to filled polygons
    gl.polygonOffset(1.0, 2.0);

// vertex array of nRows*nColumns quadrilaterals
// (two triangles/quad) from data

    // Loop through the data array to create the vertex positions for the quads
    for(var i=0; i<nRows-1; i++) {
        for(var j=0; j<nColumns-1;j++) {
            positionsArray.push( vec4(2*i/nRows-1, data[i][j], 2*j/nColumns-1, 1.0));
            positionsArray.push( vec4(2*(i+1)/nRows-1, data[i+1][j], 2*j/nColumns-1, 1.0));
            positionsArray.push( vec4(2*(i+1)/nRows-1, data[i+1][j+1], 2*(j+1)/nColumns-1, 1.0));
            positionsArray.push( vec4(2*i/nRows-1, data[i][j+1], 2*(j+1)/nColumns-1, 1.0) );
    }
}
    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);


    var vBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferId);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation( program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( positionLoc);

    colorLoc = gl.getUniformLocation(program, "uColor");

    modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");

// buttons for moving viewer and changing size

    // The buttons are assigned to functions that modify the corresponding variables which are the camera parameters
    // and the projection parameters
    document.getElementById("Button1").onclick = function(){near  *= 1.1; far *= 1.1;};
    document.getElementById("Button2").onclick = function(){near  *= 0.9; far *= 0.9;};
    document.getElementById("Button3").onclick = function(){radius *= 2.0;};
    document.getElementById("Button4").onclick = function(){radius *= 0.5;};
    document.getElementById("Button5").onclick = function(){theta += dr;};
    document.getElementById("Button6").onclick = function(){theta -= dr;};
    document.getElementById("Button7").onclick = function(){phi += dr;};
    document.getElementById("Button8").onclick = function(){phi -= dr;};
    document.getElementById("Button9").onclick = function(){left  *= 0.9; right *= 0.9;};
    document.getElementById("Button10").onclick = function(){left *= 1.1; right *= 1.1;};
    document.getElementById("Button11").onclick = function(){top  *= 0.9; bottom *= 0.9;};
    document.getElementById("Button12").onclick = function(){top *= 1.1; bottom *= 1.1;};

    render();

}


function render()
{
    // clear the color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Computes the camera position in spherical coordinates
    var eye = vec3(radius*Math.sin(theta)*Math.cos(phi),
                    radius*Math.sin(theta)*Math.sin(phi),
                    radius*Math.cos(theta));

    // setting up the model view matrix and where the camera is going to be
    var modelViewMatrix = lookAt(eye, at, up);
    var projectionMatrix = ortho(left, right, bottom, top, near, far);

    // send the model view and projection matrices to the shaders
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // draw each quad as two filled red triangles
    // and then as two black line loops

    for(var i=0; i<positionsArray.length; i+=4) {
        gl.uniform4fv(colorLoc, red);
        gl.drawArrays( gl.TRIANGLE_FAN, i, 4 );
        gl.uniform4fv(colorLoc, black);
        gl.drawArrays( gl.LINE_LOOP, i, 4 );
    }


    requestAnimationFrame(render);
}

}

hat();
