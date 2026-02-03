/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { prepareForRendering } from '../../graph/rendering.js';
import { createProgram } from '../general/webgl.js';
import { makeFoldedVertexArrays, makeFoldedElementArrays, makeThickEdgesVertexArrays, makeThickEdgesElementArrays } from './arrays.js';
import { makeUniforms } from './uniforms.js';
import { model_100_frag, model_100_vert, model_300_frag, model_300_vert, outlined_model_100_frag, outlined_model_100_vert, outlined_model_300_frag, outlined_model_300_vert, simple_100_frag, thick_edges_100_vert, simple_300_frag, thick_edges_300_vert } from './shaders.js';

const foldedFormFaces = (gl, version = 1, graph = {}, options = {}) => {
	const exploded = prepareForRendering(graph, options);
	const program = version === 1
		? createProgram(gl, model_100_vert, model_100_frag)
		: createProgram(gl, model_300_vert, model_300_frag);
	return {
		program,
		vertexArrays: makeFoldedVertexArrays(gl, program, exploded, options),
		elementArrays: makeFoldedElementArrays(gl, version, exploded),
		flags: [gl.DEPTH_TEST],
		makeUniforms,
	};
};
const foldedFormFacesOutlined = (gl, version = 1, graph = {}, options = {}) => {
	const exploded = prepareForRendering(graph, options);
	const program = version === 1
		? createProgram(gl, outlined_model_100_vert, outlined_model_100_frag)
		: createProgram(gl, outlined_model_300_vert, outlined_model_300_frag);
	return {
		program,
		vertexArrays: makeFoldedVertexArrays(gl, program, exploded, options),
		elementArrays: makeFoldedElementArrays(gl, version, exploded),
		flags: [gl.DEPTH_TEST],
		makeUniforms,
	};
};
const foldedFormEdges = (gl, version = 1, graph = {}, options = {}) => {
	const program = version === 1
		? createProgram(gl, thick_edges_100_vert, simple_100_frag)
		: createProgram(gl, thick_edges_300_vert, simple_300_frag);
	return {
		program,
		vertexArrays: makeThickEdgesVertexArrays(gl, program, graph, options),
		elementArrays: makeThickEdgesElementArrays(gl, version, graph),
		flags: [gl.DEPTH_TEST],
		makeUniforms,
	};
};
const foldedForm = (gl, version = 1, graph = {}, options = {}) => {
	const programs = [];
	if (options.faces !== false) {
		if (options.outlines === false) {
			programs.push(foldedFormFaces(gl, version, graph, options));
		} else {
			programs.push(foldedFormFacesOutlined(gl, version, graph, options));
		}
	}
	if (options.edges === true) {
		programs.push(foldedFormEdges(gl, version, graph, options));
	}
	return programs;
};

export { foldedForm, foldedFormEdges, foldedFormFaces, foldedFormFacesOutlined };
