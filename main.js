window.onload = () => {
    'use strict';

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./sw.js');
    }
    camStart();
    setUpPanel();
}

var gl;
var canvas;
var Param1 = 1.0;
var Param2 = 1.0;
var Param3 = 1.0;
var Param4 = 1.0;
var mouseX = 0.5;
var mouseY = 0.5;
var keyState1 = 0;
var keyState2 = 0;
var keyState3 = 0;
var keyState4 = 0;
var keyStatel = 0;
var keyStater = 0;

function initGL() {
    try {
        gl = canvas.getContext("experimental-webgl", {
            antialias: true
        });
        //            gl = canvas.getContext("experimental-webgl", {preserveDrawingBuffer: true});
    } catch (e) {}
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "f") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "v") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var programsArray = new Array();
var current_program;
var index = 0;

function initShaders() {
    programsArray.push(createProgram("shader-vs", "shader-1-fs"));
    programsArray.push(createProgram("shader-vs", "shader-2-fs"));
    programsArray.push(createProgram("shader-vs", "shader-3-fs"));
    programsArray.push(createProgram("shader-vs", "shader-4-fs"));
    current_program = programsArray[0];
}

function createProgram(vertexShaderId, fragmentShaderId) {
    var shaderProgram;
    var fragmentShader = getShader(gl, fragmentShaderId);
    var vertexShader = getShader(gl, vertexShaderId);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    //       gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.resolutionUniform = gl.getUniformLocation(shaderProgram, "resolution");
    shaderProgram.mouse = gl.getUniformLocation(shaderProgram, "mouse");
    shaderProgram.time = gl.getUniformLocation(shaderProgram, "time");
    shaderProgram.Param1 = gl.getUniformLocation(shaderProgram, "Param1");
    shaderProgram.Param2 = gl.getUniformLocation(shaderProgram, "Param2");
    shaderProgram.Param3 = gl.getUniformLocation(shaderProgram, "Param3");
    shaderProgram.Param4 = gl.getUniformLocation(shaderProgram, "Param4");
    return shaderProgram;
}

var webcam;
var texture;

function initTexture() {
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

var ix = 0.0;
var end;
var st = new Date().getTime();

function update() {
    if (smoothMax == 0)
        Volume = 0;
    else if (smoothMax < nouislider.noUiSlider.get()[0] || smoothMax > nouislider.noUiSlider.get()[1])
        Volume = 0;
    else
        Volume = (smoothMax - nouislider.noUiSlider.get()[0]) / (nouislider.noUiSlider.get()[1] - nouislider.noUiSlider.get()[0]);
    Volume = 100 * Volume;

    if (Volume > 0) {
        if (Pitch == 0);
        else if (Pitch > nouisliderHz.noUiSlider.get()[1] || Pitch < nouisliderHz.noUiSlider.get()[0])
            Pitch = 0;
        else {
            Pitch = (Pitch - nouisliderHz.noUiSlider.get()[0]) / (nouisliderHz.noUiSlider.get()[1] - nouisliderHz.noUiSlider.get()[0]);
        }

        Fricative = 0;
        if (fricative) {
            if (fricValue < nouisliderz.noUiSlider.get()[1] && fricValue > nouisliderz.noUiSlider.get()[0]) {
                if (voicing) {
                    Fricative = 2;
                } else {
                    Fricative = 1;
                }
            }
        }
    } else {
        Pitch = 0;
        Fricative = 0;
    }

    Param1 = Volume;
    Param2 = Pitch * 100;

    if (Fricative > 0)
        Param3 = 1.;
    else
        Param3 = 0;
    console.log(Param1, Param2, Param3)

}

function setUniforms() {
    end = new Date().getTime();
    update();
    gl.uniformMatrix4fv(current_program.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(current_program.mvMatrixUniform, false, mvMatrix);
    gl.uniform2f(current_program.resolutionUniform, canvas.width, canvas.height);
    gl.uniform2f(current_program.mouse, mouseX, mouseY);
    gl.uniform1f(current_program.time, ((end - st) % 1000000) / 1000.0);
    gl.uniform1f(current_program.Param1, Param1);
    gl.uniform1f(current_program.Param2, Param2);
    gl.uniform1f(current_program.Param3, Param3);
    gl.uniform1f(current_program.Param4, Param4);
}

var cubeVertexPositionBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexIndexBuffer;

function initBuffers() {
    cubeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    vertices = [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeVertexPositionBuffer.itemSize = 2;
    cubeVertexPositionBuffer.numItems = 4;

    cubeVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    var textureCoords = [0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    cubeVertexTextureCoordBuffer.itemSize = 2;
    cubeVertexTextureCoordBuffer.numItems = 4;

    cubeVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    var cubeVertexIndices = [0, 1, 2, 0, 2, 3];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    cubeVertexIndexBuffer.itemSize = 1;
    cubeVertexIndexBuffer.numItems = 6;
}

function drawScene() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.enable(gl.BLEND);

    mat4.ortho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0, pMatrix);

    gl.useProgram(current_program);
    mat4.identity(mvMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    gl.vertexAttribPointer(current_program.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    //        gl.vertexAttribPointer(current_program.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, webcam);
    gl.uniform1i(current_program.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    setUniforms();
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
}

function tick() {
    requestAnimFrame(tick);
    drawScene();
}

function webGLStart() {
    canvas = document.getElementById("webgl-canvas");
    if (screen.width > 1500 || screen.height > 1500) {
        canvas.width = 768;
        canvas.height = 768;
    } else {
        canvas.width = 512;
        canvas.height = 512;
    }
    console.log(screen.width, screen.height);
    //canvas.width = 2096;  for screen capture or use 4k resolution with old firefox, i.e. 3840x2160
    //canvas.height =2096;
    initGL();
    initShaders();
    initBuffers();
    initTexture();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    tick();
}

var player;
var player1;
var player2;


function Action(i) {
    switch (i) {
        case 1: // style
            Param1 = Param1 + 1;
            if (Param1 > 4)
                Param1 = 1;
            break;
        case 2: // symetry
            Param2 = Param2 + 1;
            if (Param2 > 4)
                Param2 = 1;
            break;
        case 3: // colour
            Param3 = Param3 + 1;
            if (Param3 > 7)
                Param3 = 1;
            break;
        case 4: // background
            Param4 = Param4 + 1;
            if (Param4 > 6)
                Param4 = 1;
            break;
        case 5: // left
            index = index - 1;
            if (index < 0) index = 3;
            current_program = programsArray[index];
            break;
        case 6: // right
            index = index + 1;
            if (index > 3) index = 0;
            current_program = programsArray[index];
            break;
    }
}

function toggleButtons() {
    var button = document.querySelector('button');
    var button1 = document.querySelector('button1');
    var button2 = document.querySelector('button2');
    var button3 = document.querySelector('button3');

    button.hidden = !button.hidden;
    button1.hidden = !button1.hidden;
    button2.hidden = !button2.hidden;
    button3.hidden = !button3.hidden;
    settings.hidden = !settings.hidden;
    if (settings.hidden) {
        slideTo(panel, 130);
        slideTo(settings, 94);
        panelvisible = false;
    }
}

function MonitorKeyDown(e) { // stop autorepeat of keys with KeyState1-4 flags
    if (!e) e = window.event;
    if (e.keyCode == 32 || e.keyCode == 49) {
        if (keyState1 == 0)
            Action(4);
    } else if (e.keyCode == 50) {
        if (keyState2 == 0)
            Action(3);
        keyState2 = 1;
    } else if (e.keyCode == 51 || e.keyCode == 13) {
        if (keyState3 == 0)
            Action(1);
        keyState3 = 1;
    } else if (e.keyCode == 52) {
        if (keyState4 == 0)
            Action(2);
        keyState4 = 1;
    } else if (e.keyCode == 53) {
        toggleButtons();
    } else if (e.keyCode == 189) { // +
        if (keyStatel == 0)
            Action(5);
        buttonl
    } else if (e.keyCode == 187) { // -
        if (keyStater == 0)
            Action(6);
    }
    return false;
}

function MonitorKeyUp(e) {
    if (!e) e = window.event;
    if (e.keyCode == 32 || e.keyCode == 49) {
        keyState1 = 0;
    } else if (e.keyCode == 50) {
        keyState2 = 0;
    } else if (e.keyCode == 51 || e.keyCode == 13) {
        keyState3 = 0;
    } else if (e.keyCode == 52) {
        keyStatel = 0;
    } else if (e.keyCode == 189) {
        keyState4 = 0;
    } else if (e.keyCode == 187) {
        keyStater = 0;
    }
    return false;
}

var mouseState = 0;

function MonitorMouseDown(e) {
    if (!e) e = window.event;
    if (e.button == 0) {
        mouseState = 1;
        mouseX = e.clientX / canvas.scrollWidth;
        mouseY = 1.0 - e.clientY / canvas.scrollHeight;
    }
    var c = document.getElementById("container");
    c.style.filter = "sepia(1) hue-rotate(230deg) saturate(2)";
    toggleButtons();
    return false;
}

function MonitorMouseUp(e) {
    if (!e) e = window.event;
    if (e.button == 0) {
        mouseState = 0;
    }
    var c = document.getElementById("container");
    c.style.filter = "grayscale(0)";
    return false;
}


var c = document.getElementById("body");

function camStart() {
    var splash = document.querySelector('splash');
    var button = document.querySelector('button');
    var button1 = document.querySelector('button1');
    var button2 = document.querySelector('button2');
    var button3 = document.querySelector('button3');

    webcam = document.createElement('canvas'); //getElementById('webcam');
    keyState1 = 0;
    keyState2 = 0;
    keyState3 = 0;
    keyState4 = 0;

    //Param1 = Math.random(); // for Electra
    //Param2 = Math.random();

    splash.onclick = function (e) {
        //         if (document.body.requestFullscreen) {
        //             document.body.requestFullscreen();
        //         } else if (document.body.msRequestFullscreen) {
        //             document.body.msRequestFullscreen();
        //         } else if (document.body.mozRequestFullScreen) {
        //             document.body.mozRequestFullScreen();
        //         } else if (document.body.webkitRequestFullscreen) {
        //             document.body.webkitRequestFullscreen();
        //         }
        if (audioContext == null)
            startAudio();
        splash.hidden = true;
    }
    //    window.setTimeout(function () {//        if (document.body.requestFullscreen) {
    //            document.body.requestFullscreen();
    //        } else if (document.body.msRequestFullscreen) {
    //            document.body.msRequestFullscreen();
    //        } else if (document.body.mozRequestFullScreen) {
    //            document.body.mozRequestFullScreen();
    //        } else if (document.body.webkitRequestFullscreen) {
    //            document.body.webkitRequestFullscreen();
    //        }
    //
    //        splash.hidden = true;
    //    }, 5000); // hide Splash screen after 2.5 seconds
    webGLStart();

    document.onkeydown = MonitorKeyDown;
    document.onkeyup = MonitorKeyUp;

    canvas.onmousedown = MonitorMouseDown;
    canvas.onmouseup = MonitorMouseUp;
    canvas.onmousemove = function (e) {
        e = e || window.event;
        if (mouseState == 1) {
            mouseX = (mouseX + 7.0 * e.clientX / canvas.scrollWidth) / 8.0;
            mouseY = (mouseY + 7.0 * (1.0 - e.clientY / canvas.scrollHeight)) / 8.0;
        }
    }
    canvas.ontouchstart = function (e) {
        e.preventDefault();
        toggleButtons();
        var touchs = e.changedTouches;
        mouseX = touchs[0].clientX / canvas.scrollWidth;
        mouseY = 1.0 - touchs[0].clientY / canvas.scrollHeight;
        c.style.filter = "sepia(1) hue-rotate(230deg) saturate(2)";
    };
    canvas.ontouchend = function (e) {

        e.preventDefault();
        c.style.filter = "grayscale(0)";
    };
    canvas.ontouchmove = function (e) {
        e.preventDefault();
        var touches = e.changedTouches;
        mouseX = touches[0].clientX / canvas.scrollWidth; //] (mouseX + 7.0*touches/canvas.scrollWidth)/8.0;
        mouseY = 1.0 - touches[0].clientY / canvas.scrollHeight; //(mouseY + 7.0*(1.0 - e.clientY/canvas.scrollHeight))/8.0;
    };
    button.onmousedown = function (e) {
        Action(5);
    }
    button1.onmousedown = function (e) {
        Action(1);
    }
    button2.onmousedown = function (e) {
        Action(2);
    }
    button3.onmousedown = function (e) {
        Action(6);
    }

    button.ontouchstart = function (e) {
        e.preventDefault();
        Action(5);
    }
    button1.ontouchstart = function (e) {
        e.preventDefault();
        Action(1);
    }
    button2.ontouchstart = function (e) {
        e.preventDefault();
        Action(2);
    }
    button3.ontouchstart = function (e) {
        e.preventDefault();
        Action(6);
    }



    var gpad;

    function showPressedButton(index) {
        //      console.log("Pressed: ", index);
        if (!splash.hidden) { // splash screen
            splash.hidden = true;
        } else {
            crosshairs.hidden = false;
            switch (index) {
                case 0: // A
                case 8:
                case 9:
                    Action(1);
                    break;
                case 1: // B - 
                    Action(2);
                    break;
                case 2: // X
                    Action(3);
                    break;
                case 3: // Y
                    Action(4);
                    break;
                case 4: // LT
                case 6: //
                    Action(5);
                    break;
                case 5: // LT
                case 7: //
                    Action(6);
                    break;
                case 10: // XBox
                    break;
                case 12: // dpad handled by timer elsewhere
                case 13:
                case 14:
                case 15:
                    break;
                default:
            }
        }
    }

    function removePressedButton(index) {
        //        console.log("Releasd: ", index);
    }

    gamepads.addEventListener('connect', e => {
        //        crosshairs.hidden = false;
        console.log('Gamepad connected:');
        console.log(e.gamepad);
        gpad = e.gamepad;
        e.gamepad.addEventListener('buttonpress', e => showPressedButton(e.index));
        e.gamepad.addEventListener('buttonrelease', e => removePressedButton(e.index));
    });

    gamepads.addEventListener('disconnect', e => {
        console.log('Gamepad disconnected:');
        console.log(e.gamepad);
    });

    gamepads.start();

}


var nouislider;
var progress;
var progressback;
var nouisliderHz;
var progressHz;
var progressbackHz;
var nouisliderz;
var progressz;
var progressbackz;
var panel;
var panelvisible = false;

function setUpPanel() {
    panel = document.querySelector('panel');
    settings = document.querySelector('settings');
    panel.style.left = "130vw";
    panel.hidden = true;
    slideTo(panel, 130);
    //    mute = document.createElement("INPUT");
    //    mute.style.position = "absolute";
    //    mute.style.height = "3vh";
    //    mute.style.width = "3vw";
    //    mute.style.left = "18vw";
    //    mute.style.top = "2.5vh";
    //    mute.checked = false;
    //    mute.setAttribute("type", "checkbox");
    //    mute.checked = false;
    //    spdSlider = document.createElement("INPUT");
    //    spdSlider.setAttribute("type", "range");
    //    spdSlider.style.position = "absolute";
    //    spdSlider.style.height = "2vh";
    //    spdSlider.style.width = "18vw";
    //    spdSlider.style.left = "5vw";
    //    spdSlider.style.top = "9.5vh";
    //    spdSlider.style.color = 'green';
    //    spdSlider.value = 3;
    //    spdSlider.min = 1;
    //    spdSlider.max = 4;

    //    panel.appendChild(mute);
    //panel.appendChild(spdSlider);

    nouislider = document.createElement("LABEL");
    progress = document.createElement("LABEL");
    progressback = document.createElement("LABEL");
    nouisliderHz = document.createElement("LABEL");
    progressHz = document.createElement("LABEL");
    progressbackHz = document.createElement("LABEL");
    nouisliderz = document.createElement("LABEL");
    progressz = document.createElement("LABEL");
    progressbackz = document.createElement("LABEL");

    noUiSlider.create(nouislider, {
        start: [10, 100],
        connect: true,
        step: 1,
        range: {
            'min': 1,
            'max': 100
        },
        // make numbers whole
        format: {
            to: value => value,
            from: value => value
        }
    });
    progressback.style.position = "absolute";
    progressback.style.borderRadius = "15%";
    progressback.style.height = "2vh";
    progressback.style.width = "18vw";
    progressback.style.left = "4.5vw";
    progressback.style.top = "13vh";
    progressback.style.backgroundColor = 'lightgrey';

    progress.style.position = "absolute";
    progress.style.borderRadius = "15%";
    progress.style.height = "2vh";
    progress.style.width = "0vw";
    progress.style.left = "4.5vw";
    progress.style.top = "13vh";
    progress.style.backgroundColor = 'royalblue';

    nouislider.style.position = "absolute";
    nouislider.style.height = "2vh";
    nouislider.style.width = "18vw";
    nouislider.style.left = "4.5vw";
    nouislider.style.top = "13vh";

    noUiSlider.create(nouisliderHz, {
        start: [0, 400],
        connect: true,
        step: 10,
        range: {
            'min': 1,
            'max': 500
        },
        // make numbers whole
        format: {
            to: value => value,
            from: value => value
        }
    });
    progressbackHz.style.position = "absolute";
    progressbackHz.style.borderRadius = "15%";
    progressbackHz.style.height = "2vh";
    progressbackHz.style.width = "18vw";
    progressbackHz.style.left = "-104.5vw";
    progressbackHz.style.top = "17vh";
    progressbackHz.style.backgroundColor = 'lightgrey';

    progressHz.style.position = "absolute";
    progressHz.style.borderRadius = "15%";
    progressHz.style.height = "2vh";
    progressHz.style.width = "0vw";
    progressHz.style.left = "-104.5vw";
    progressHz.style.top = "17vh";
    progressHz.style.backgroundColor = 'royalblue';

    nouisliderHz.style.position = "absolute";
    nouisliderHz.style.height = "2vh";
    nouisliderHz.style.width = "18vw";
    nouisliderHz.style.left = "-104.5vw";
    nouisliderHz.style.top = "17vh";

    noUiSlider.create(nouisliderz, {
        start: [2000, 8000],
        connect: true,
        step: 100,
        range: {
            'min': 1000,
            'max': 8000
        },
        // make numbers whole
        format: {
            to: value => value,
            from: value => value
        }
    });
    progressbackz.style.position = "absolute";
    progressbackz.style.borderRadius = "15%";
    progressbackz.style.height = "2vh";
    progressbackz.style.width = "18vw";
    progressbackz.style.left = "4.5vw";
    progressbackz.style.top = "22vh";
    progressbackz.style.backgroundColor = 'lightgrey';

    progressz.style.position = "absolute";
    progressz.style.borderRadius = "15%";
    progressz.style.height = "2vh";
    progressz.style.width = "0vw";
    progressz.style.left = "4.5vw";
    progressz.style.top = "22vh";
    progressz.style.backgroundColor = 'royalblue';

    nouisliderz.style.position = "absolute";
    nouisliderz.style.height = "2vh";
    nouisliderz.style.width = "18vw";
    nouisliderz.style.left = "4.5vw";
    nouisliderz.style.top = "22vh";

    s = parseInt(localStorage.getItem("SpeechPatterns.slider1a"));
    nouislider.noUiSlider.set([localStorage.getItem("SpeechPatterns.slider1a"), localStorage.getItem("SpeechPatterns.slider1b")]);
    nouisliderHz.noUiSlider.set([localStorage.getItem("SpeechPatterns.slider2a"), localStorage.getItem("SpeechPatterns.slider2b")]);
    nouisliderz.noUiSlider.set([localStorage.getItem("SpeechPatterns.slider3a"), localStorage.getItem("SpeechPatterns.slider3b")]);
    nouislider.noUiSlider.on('change', saveSliders);
    nouisliderHz.noUiSlider.on('change', saveSliders);
    nouisliderz.noUiSlider.on('change', saveSliders);

    function saveSliders() {
        localStorage.setItem("SpeechPatterns.slider1a", nouislider.noUiSlider.get()[0]);
        localStorage.setItem("SpeechPatterns.slider1b", nouislider.noUiSlider.get()[1]);
        localStorage.setItem("SpeechPatterns.slider2a", nouisliderHz.noUiSlider.get()[0]);
        localStorage.setItem("SpeechPatterns.slider2b", nouisliderHz.noUiSlider.get()[1]);
        localStorage.setItem("SpeechPatterns.slider3a", nouisliderz.noUiSlider.get()[0]);
        localStorage.setItem("SpeechPatterns.slider3b", nouisliderz.noUiSlider.get()[1]);
    }

    panel.appendChild(progressback);
    panel.appendChild(progress);
    panel.appendChild(nouislider);
    panel.appendChild(progressbackHz);
    panel.appendChild(progressHz);
    panel.appendChild(nouisliderHz);
    panel.appendChild(progressbackz);
    panel.appendChild(progressz);
    panel.appendChild(nouisliderz);

    settings.style.left = "92vw";

    // Retrieve settings
    panel.onmousedown = function (e) { // speed, paddle size, ball size
        if (audioContext == null)
            startAudio();
        e.stopPropagation();
    }

    settings.onmousedown = function (e) { // speed, paddle size, ball size
        if (audioContext == null)
            startAudio();

        e.stopPropagation();
        if (panelvisible) { // save stored values
            panel.hidden = true;
            slideTo(panel, 130);
            slideTo(settings, 94);
        } else {
            slideTo(panel, 75);
            slideTo(settings, 76);
            panel.hidden = false;
        }
        panelvisible = !panelvisible;
    }

}

function slideTo(el, left) {
    var steps = 5;
    var timer = 50;
    var elLeft = parseInt(el.style.left) || 0;
    var diff = left - elLeft;
    var stepSize = diff / steps;
    console.log(stepSize, ", ", steps);

    function step() {
        elLeft += stepSize;
        el.style.left = elLeft + "vw";
        if (--steps) {
            setTimeout(step, timer);
        }
    }
    step();
}
