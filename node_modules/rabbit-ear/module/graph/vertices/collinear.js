/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { collinearBetween } from '../../math/line.js';
import { makeVerticesEdgesUnsorted } from '../make/verticesEdges.js';

const getOtherVerticesInEdges = ({ edges_vertices }, vertex, edges) => (
	edges.map(edge => (edges_vertices[edge][0] === vertex
		? edges_vertices[edge][1]
		: edges_vertices[edge][0]))
);
const isVertexCollinear = ({
	vertices_coords, vertices_edges, edges_vertices,
}, vertex, epsilon = EPSILON) => {
	if (!vertices_coords || !edges_vertices) { return false; }
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	}
	const edges = vertices_edges[vertex];
	if (edges === undefined || edges.length !== 2) { return false; }
	const vertices = getOtherVerticesInEdges({ edges_vertices }, vertex, edges);
	const [a, b, c] = [vertices[0], vertex, vertices[1]]
		.map(v => vertices_coords[v]);
	return collinearBetween(a, b, c, false, epsilon);
};

export { getOtherVerticesInEdges, isVertexCollinear };
