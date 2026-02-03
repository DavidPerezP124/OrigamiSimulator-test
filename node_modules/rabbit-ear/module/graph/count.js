/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { filterKeysWithPrefix, filterKeysWithSuffix } from '../fold/spec.js';

const ordersArrayNames = {
	edges: "edgeOrders",
	faces: "faceOrders",
};
const maxArraysLength = (arrays) => Math.max(0, ...(arrays
	.filter(el => el !== undefined)
	.map(el => el.length)));
const maxValueInArrayInArray = (arrays) => {
	let max = -1;
	arrays
		.filter(a => a !== undefined)
		.forEach(arr => arr
			.forEach(el => el
				.forEach((e) => {
					if (e > max) { max = e; }
				})));
	return max;
};
const maxValueInOrders = (array) => {
	let max = -1;
	array.forEach(el => {
		if (el[0] > max) { max = el[0]; }
		if (el[1] > max) { max = el[1]; }
	});
	return max;
};
const count = (graph, key) => (
	maxArraysLength(filterKeysWithPrefix(graph, key).map(k => graph[k])));
const countVertices = ({
	vertices_coords,
	vertices_vertices,
	vertices_edges,
	vertices_faces,
}) => (
	maxArraysLength([
		vertices_coords,
		vertices_vertices,
		vertices_edges,
		vertices_faces,
	]));
const countEdges = ({ edges_vertices, edges_faces }) => (
	maxArraysLength([edges_vertices, edges_faces]));
const countFaces = ({ faces_vertices, faces_edges, faces_faces }) => (
	maxArraysLength([faces_vertices, faces_edges, faces_faces]));
const countImplied = (graph, key) => Math.max(
	maxValueInArrayInArray(
		filterKeysWithSuffix(graph, key).map(str => graph[str]),
	),
	graph[ordersArrayNames[key]]
		? maxValueInOrders(graph[ordersArrayNames[key]])
		: -1,
) + 1;
const countImpliedVertices = graph => countImplied(graph, "vertices");
const countImpliedEdges = graph => countImplied(graph, "edges");
const countImpliedFaces = graph => countImplied(graph, "faces");

export { count, countEdges, countFaces, countImplied, countImpliedEdges, countImpliedFaces, countImpliedVertices, countVertices };
