/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { foldKeys, filterKeysWithPrefix, filterKeysWithSuffix } from '../fold/spec.js';
import { uniqueSortedNumbers } from '../general/array.js';

const selfRelationalArraySubset = (array_array, indices) => {
	const hash = {};
	indices.forEach(f => { hash[f] = true; });
	const result = [];
	indices.forEach(i => {
		result[i] = array_array[i].filter(j => hash[j]);
	});
	return result;
};
const subgraphExclusive = (graph, indicesToKeep = {}) => {
	const indices = {
		vertices: [],
		edges: [],
		faces: [],
		...indicesToKeep,
	};
	const components = Object.keys(indices);
	const copy = { ...graph };
	foldKeys.graph.forEach(key => delete copy[key]);
	delete copy.file_frames;
	const lookup = {};
	components.forEach(component => { lookup[component] = {}; });
	components.forEach(component => indices[component].forEach(i => {
		lookup[component][i] = true;
	}));
	const keys = {};
	components.forEach(c => {
		filterKeysWithPrefix(graph, c).forEach(key => { keys[key] = {}; });
		filterKeysWithSuffix(graph, c).forEach(key => { keys[key] = {}; });
	});
	components.forEach(c => {
		filterKeysWithPrefix(graph, c).forEach(key => { keys[key].prefix = c; });
		filterKeysWithSuffix(graph, c).forEach(key => { keys[key].suffix = c; });
	});
	Object.keys(keys).forEach(key => { copy[key] = []; });
	Object.keys(keys).forEach(key => {
		const { prefix, suffix } = keys[key];
		if (prefix && suffix) {
			indices[prefix].forEach(i => {
				copy[key][i] = graph[key][i].filter(j => lookup[suffix][j]);
			});
		} else if (prefix) {
			indices[prefix].forEach(i => { copy[key][i] = graph[key][i]; });
		} else if (suffix) {
			copy[key] = graph[key].map(arr => arr.filter(j => lookup[suffix][j]));
		} else {
			copy[key] = graph[key];
		}
	});
	return copy;
};
const subgraph = (graph, indicesToKeep = {}) => {
	const indices = {
		vertices: [],
		edges: [],
		faces: [],
		...indicesToKeep,
	};
	const lookup = { vertices: {}, edges: {}, faces: {} };
	indices.vertices.forEach(v => { lookup.vertices[v] = true; });
	indices.edges.forEach(e => { lookup.edges[e] = true; });
	indices.edges
		.forEach(edge => graph.edges_vertices[edge]
			.forEach(v => { lookup.vertices[v] = true; }));
	indices.faces.forEach(f => { lookup.faces[f] = true; });
	indices.faces
		.forEach(face => graph.faces_vertices[face]
			.forEach(v => { lookup.vertices[v] = true; }));
	graph.faces_vertices
		.map((_, f) => f)
		.filter(f => graph.faces_vertices[f]
			.map(v => lookup.vertices[v])
			.reduce((a, b) => a && b, true))
		.forEach(f => { lookup.faces[f] = true; });
	graph.edges_vertices
		.map((_, e) => e)
		.filter(e => graph.edges_vertices[e]
			.map(v => lookup.vertices[v])
			.reduce((a, b) => a && b, true))
		.forEach(e => { lookup.edges[e] = true; });
	return subgraphExclusive(graph, {
		vertices: Object.keys(lookup.vertices),
		edges: Object.keys(lookup.edges),
		faces: Object.keys(lookup.faces),
	});
};
const subgraphWithFaces = (graph, faces) => {
	let vertices = [];
	if (graph.faces_vertices) {
		vertices = uniqueSortedNumbers(
			faces.flatMap(f => graph.faces_vertices[f]),
		);
	}
	let edges = [];
	if (graph.faces_edges) {
		edges = uniqueSortedNumbers(
			faces.flatMap(f => graph.faces_edges[f]),
		);
	} else if (graph.edges_vertices) {
		const vertices_lookup = {};
		vertices.forEach(v => { vertices_lookup[v] = true; });
		edges = graph.edges_vertices
			.map((v, i) => (vertices_lookup[v[0]] && vertices_lookup[v[1]]
				? i
				: undefined))
			.filter(a => a !== undefined);
	}
	return subgraphExclusive(graph, {
		vertices,
		edges,
		faces,
	});
};
const subgraphWithVertices = (graph, vertices = []) => {
	const components = { vertices: [], edges: [] };
	vertices.forEach(v => { components.vertices[v] = true; });
	if (graph.vertices_edges) {
		components.vertices
			.forEach((_, v) => graph.vertices_edges[v]
				.forEach(e => { components.edges[e] = true; }));
	}
	if (graph.edges_vertices) {
		components.edges
			.forEach((_, e) => graph.edges_vertices[e]
				.forEach(v => { components.vertices[v] = true; }));
	}
	return subgraphExclusive(graph, {
		vertices: components.vertices
			.map((v, i) => (v ? i : undefined))
			.filter(a => a !== undefined),
		edges: components.edges
			.map((e, i) => (e ? i : undefined))
			.filter(a => a !== undefined),
	});
};

export { selfRelationalArraySubset, subgraph, subgraphExclusive, subgraphWithFaces, subgraphWithVertices };
