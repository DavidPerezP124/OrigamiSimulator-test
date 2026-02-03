/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { createProgram } from '../general/webgl.js';
import { makeCPFacesVertexArrays, makeCPFacesElementArrays, makeCPEdgesVertexArrays, makeCPEdgesElementArrays } from './arrays.js';
import { makeUniforms } from './uniforms.js';
import { cp_100_frag, cp_100_vert, thick_edges_100_vert, cp_300_frag, cp_300_vert, thick_edges_300_vert } from './shaders.js';

const cpFacesV1 = (gl, graph = {}, options = undefined) => {
	const program = createProgram(gl, cp_100_vert, cp_100_frag);
	return {
		program,
		vertexArrays: makeCPFacesVertexArrays(gl, program, graph),
		elementArrays: makeCPFacesElementArrays(gl, 1, graph),
		flags: [],
		makeUniforms,
	};
};
const cpEdgesV1 = (gl, graph = {}, options = undefined) => {
	const program = createProgram(gl, thick_edges_100_vert, cp_100_frag);
	return {
		program,
		vertexArrays: makeCPEdgesVertexArrays(gl, program, graph, options),
		elementArrays: makeCPEdgesElementArrays(gl, 1, graph),
		flags: [],
		makeUniforms,
	};
};
const cpFacesV2 = (gl, graph = {}, options = undefined) => {
	const program = createProgram(gl, cp_300_vert, cp_300_frag);
	return {
		program,
		vertexArrays: makeCPFacesVertexArrays(gl, program, graph),
		elementArrays: makeCPFacesElementArrays(gl, 2, graph),
		flags: [],
		makeUniforms,
	};
};
const cpEdgesV2 = (gl, graph = {}, options = undefined) => {
	const program = createProgram(gl, thick_edges_300_vert, cp_300_frag);
	return {
		program,
		vertexArrays: makeCPEdgesVertexArrays(gl, program, graph, options),
		elementArrays: makeCPEdgesElementArrays(gl, 2, graph),
		flags: [],
		makeUniforms,
	};
};
const creasePattern = (gl, version = 1, graph = {}, options = undefined) => {
	switch (version) {
	case 1:
		return [cpFacesV1(gl, graph, options), cpEdgesV1(gl, graph, options)];
	case 2:
	default:
		return [cpFacesV2(gl, graph, options), cpEdgesV2(gl, graph, options)];
	}
};

export { cpEdgesV1, cpEdgesV2, cpFacesV1, cpFacesV2, creasePattern };
