/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makeVerticesToEdge } from './lookup.js';

const makeVerticesEdgesUnsorted = ({ edges_vertices }) => {
	const vertices_edges = [];
	edges_vertices.forEach((ev, i) => ev
		.forEach((v) => {
			if (vertices_edges[v] === undefined) {
				vertices_edges[v] = [];
			}
			vertices_edges[v].push(i);
		}));
	return vertices_edges;
};
const makeVerticesEdges = ({ edges_vertices, vertices_vertices }) => {
	const edge_map = makeVerticesToEdge({ edges_vertices });
	return vertices_vertices
		.map((verts, i) => verts
			.map(v => edge_map[`${i} ${v}`]));
};

export { makeVerticesEdges, makeVerticesEdgesUnsorted };
