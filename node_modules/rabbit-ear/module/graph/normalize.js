/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { remapKey } from './maps.js';

const normalize = (graph) => {
	const maps = { vertices: [], edges: [], faces: [] };
	let v = 0;
	let e = 0;
	let f = 0;
	graph.vertices_coords.forEach((_, i) => { maps.vertices[i] = v++; });
	graph.edges_vertices.forEach((_, i) => { maps.edges[i] = e++; });
	graph.faces_vertices.forEach((_, i) => { maps.faces[i] = f++; });
	remapKey(graph, "vertices", maps.vertices);
	remapKey(graph, "edges", maps.edges);
	remapKey(graph, "faces", maps.faces);
	return graph;
};

export { normalize };
