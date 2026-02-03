/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { subtract2, normalize2, dot2 } from '../math/vector.js';
import { assignmentCanBeFolded } from '../fold/spec.js';
import { makeVerticesEdgesUnsorted } from '../graph/make/verticesEdges.js';
import { counterClockwiseAngleRadians, isCounterClockwiseBetween, counterClockwiseOrder2 } from '../math/radial.js';

const alternatingSum = (numbers) => [0, 1]
	.map(even_odd => numbers
		.filter((_, i) => i % 2 === even_odd)
		.reduce((a, b) => a + b, 0));
const alternatingSumDifference = (sectors) => {
	const halfsum = sectors.reduce((a, b) => a + b, 0) / 2;
	return alternatingSum(sectors).map(s => s - halfsum);
};
const kawasakiSolutionsRadians = (radians) => radians
	.map((v, i, arr) => [v, arr[(i + 1) % arr.length]])
	.map(([a, b]) => counterClockwiseAngleRadians(a, b))
	.map((_, i, arr) => arr.slice(i + 1, arr.length).concat(arr.slice(0, i)))
	.map(opposite_sectors => alternatingSum(opposite_sectors).map(s => Math.PI - s))
	.map((kawasakis, i) => radians[i] + kawasakis[0])
	.map((angle, i) => (isCounterClockwiseBetween(
		angle,
		radians[i],
		radians[(i + 1) % radians.length],
	)
		? angle
		: undefined));
const kawasakiSolutionsVectors = (vectors) => (
	kawasakiSolutionsRadians(vectors.map(v => Math.atan2(v[1], v[0])))
		.map(a => (a === undefined
			? undefined
			: [Math.cos(a), Math.sin(a)]))
);
const kawasakiSolutions = (
	{ vertices_coords, vertices_edges, edges_assignment, edges_vertices },
	vertex,
) => {
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	}
	const edges = edges_assignment
		? vertices_edges[vertex]
			.filter(e => assignmentCanBeFolded[edges_assignment[e]])
		: vertices_edges[vertex];
	if (edges.length % 2 === 0) { return []; }
	const vert_edges_vertices = edges
		.map(edge => (edges_vertices[edge][0] === vertex
			? edges_vertices[edge]
			: [edges_vertices[edge][1], edges_vertices[edge][0]]));
	const vert_edges_coords = vert_edges_vertices
		.map(ev => ev.map(v => vertices_coords[v]));
	const vert_edges_vector = vert_edges_coords
		.map(coords => subtract2(coords[1], coords[0]));
	const sortedVectors = counterClockwiseOrder2(vert_edges_vector)
		.map(i => vert_edges_vector[i]);
	const result = kawasakiSolutionsVectors(sortedVectors);
	const normals = sortedVectors.map(normalize2);
	const filteredResults = result
		.filter(a => a !== undefined)
		.filter(vector => !normals
			.map(v => dot2(vector, v))
			.map(d => Math.abs(1 - d) < 1e-3)
			.reduce((a, b) => a || b, false));
	return filteredResults;
};

export { alternatingSum, alternatingSumDifference, kawasakiSolutions, kawasakiSolutionsRadians, kawasakiSolutionsVectors };
