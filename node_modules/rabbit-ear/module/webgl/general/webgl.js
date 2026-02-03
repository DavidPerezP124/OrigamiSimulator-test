/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import Messages from '../../environment/messages.js';
import RabbitEarWindow from '../../environment/window.js';

const initializeWebGL = (canvasElement, preferredVersion) => {
	const devicePixelRatio = RabbitEarWindow().devicePixelRatio || 1;
	canvasElement.width = canvasElement.clientWidth * devicePixelRatio;
	canvasElement.height = canvasElement.clientHeight * devicePixelRatio;
	switch (preferredVersion) {
	case 1: return { gl: canvasElement.getContext("webgl"), version: 1 };
	case 2: return { gl: canvasElement.getContext("webgl2"), version: 2 };
	}
	const gl2 = canvasElement.getContext("webgl2");
	if (gl2) { return { gl: gl2, version: 2 }; }
	const gl1 = canvasElement.getContext("webgl");
	if (gl1) { return { gl: gl1, version: 1 }; }
	throw new Error(Messages.noWebGL);
};
const compileShader = (gl, shaderSource, shaderType) => {
	const shader = gl.createShader(shaderType);
	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		throw new Error(gl.getShaderInfoLog(shader));
	}
	return shader;
};
const createProgramAndAttachShaders = (gl, vertexShader, fragmentShader) => {
	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		throw new Error(gl.getProgramInfoLog(program));
	}
	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);
	return program;
};
const createProgram = (gl, vertexSource, fragmentSource) => {
	const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
	const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
	return createProgramAndAttachShaders(gl, vertexShader, fragmentShader);
};

export { createProgram, initializeWebGL };
