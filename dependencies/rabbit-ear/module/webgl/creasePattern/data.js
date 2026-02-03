/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makeEdgesVector } from '../../graph/make/edges.js';
import { dark, light } from '../general/colors.js';

const make2D = (coords) => coords
	.map(coord => [0, 1]
		.map(i => coord[i] || 0));
const makeCPEdgesVertexData = (graph, options) => {
	if (!graph || !graph.vertices_coords || !graph.edges_vertices) { return undefined; }
	const assignmentColors = options && options.dark ? dark : light;
	const assignment_color = {
		...assignmentColors,
		...options,
	};
	const vertices_coords = make2D(graph.edges_vertices
		.flatMap(edge => edge
			.map(v => graph.vertices_coords[v]))
		.flatMap(coord => [coord, coord]));
	const edgesVector = make2D(makeEdgesVector(graph));
	const vertices_color = graph.edges_assignment
		? graph.edges_assignment.flatMap(a => [
			assignment_color[a],
			assignment_color[a],
			assignment_color[a],
			assignment_color[a],
		])
		: graph.edges_vertices.flatMap(() => [
			assignment_color.U,
			assignment_color.U,
			assignment_color.U,
			assignment_color.U,
		]);
	const verticesEdgesVector = edgesVector
		.flatMap(el => [el, el, el, el]);
	const vertices_vector = graph.edges_vertices
		.flatMap(() => [[1, 0], [-1, 0], [-1, 0], [1, 0]]);
	return {
		vertices_coords,
		vertices_color,
		verticesEdgesVector,
		vertices_vector,
	};
};

export { makeCPEdgesVertexData };
