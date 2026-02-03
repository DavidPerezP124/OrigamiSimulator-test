/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { TWO_PI } from '../../math/constant.js';
import { resize2, flip2 } from '../../math/vector.js';
import { counterClockwiseSectors2 } from '../../math/radial.js';
import { makeEdgesVector } from './edges.js';
import { makeVerticesVertices } from './verticesVertices.js';

const makeVerticesVerticesVector = ({
	vertices_coords, vertices_vertices, vertices_edges, vertices_faces,
	edges_vertices, edges_vector, faces_vertices,
}) => {
	if (!edges_vector) {
		edges_vector = makeEdgesVector({ vertices_coords, edges_vertices });
	}
	if (!vertices_vertices) {
		vertices_vertices = makeVerticesVertices({
			vertices_coords, vertices_edges, vertices_faces, edges_vertices, faces_vertices,
		});
	}
	const edge_map = {};
	edges_vertices
		.map(vertices => vertices.join(" "))
		.forEach((key, e) => { edge_map[key] = e; });
	return vertices_vertices
		.map((_, a) => vertices_vertices[a]
			.map((b) => {
				const edge_a = edge_map[`${a} ${b}`];
				const edge_b = edge_map[`${b} ${a}`];
				if (edge_a !== undefined) { return resize2(edges_vector[edge_a]); }
				if (edge_b !== undefined) { return flip2(edges_vector[edge_b]); }
				return undefined;
			}));
};
const makeVerticesSectors = ({
	vertices_coords, vertices_vertices, edges_vertices, edges_vector,
}) => makeVerticesVerticesVector({
	vertices_coords, vertices_vertices, edges_vertices, edges_vector,
}).map(vectors => (vectors.length === 1
	? [TWO_PI]
	: counterClockwiseSectors2(vectors)));

export { makeVerticesSectors, makeVerticesVerticesVector };
