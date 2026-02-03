/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { epsilonEqual } from '../math/compare.js';
import { uniqueElements } from '../general/array.js';
import { clusterScalars } from '../general/cluster.js';
import { makeVerticesEdgesUnsorted } from './make/verticesEdges.js';

const edgeifyFaces = ({ vertices_coords, faces_vertices }, axis = 0) => (
	faces_vertices.map(vertices => [
		vertices.reduce((a, b) => (vertices_coords[a][axis] < vertices_coords[b][axis]
			? a
			: b)),
		vertices.reduce((a, b) => (vertices_coords[a][axis] > vertices_coords[b][axis]
			? a
			: b)),
	]));
const sweepVertices = (
	{ vertices_coords },
	axis = 0,
	epsilon = EPSILON,
) => clusterScalars(vertices_coords.map(p => p[axis]), epsilon)
	.map(vertices => ({
		vertices,
		t: vertices.reduce((p, c) => p + vertices_coords[c][axis], 0) / vertices.length,
	}));
const sweepValues = (
	{ edges_vertices, vertices_edges },
	values,
	epsilon = EPSILON,
) => {
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	}
	const edgesValues = edges_vertices.map(edge => edge.map(e => values[e]));
	const isDegenerate = edgesValues.map(([a, b]) => epsilonEqual(a, b, epsilon));
	const edgesDirection = edgesValues.map(([a, b]) => Math.sign(a - b));
	const edgesVertexSide = edges_vertices
		.map(([v1, v2], i) => (isDegenerate[i]
			? { [v1]: 0, [v2]: 0 }
			: { [v1]: edgesDirection[i], [v2]: -edgesDirection[i] }));
	return clusterScalars(values, epsilon)
		.map(vertices => vertices.filter(v => vertices_edges[v]))
		.filter(vertices => vertices.length)
		.map(vertices => ({
			vertices,
			t: vertices.reduce((p, c) => p + values[c], 0) / vertices.length,
			start: uniqueElements(vertices.flatMap(v => vertices_edges[v]
				.filter(edge => edgesVertexSide[edge][v] <= 0))),
			end: uniqueElements(vertices.flatMap(v => vertices_edges[v]
				.filter(edge => edgesVertexSide[edge][v] >= 0))),
		}));
};
const sweepEdges = (
	{ vertices_coords, edges_vertices, vertices_edges },
	axis = 0,
	epsilon = EPSILON,
) => sweepValues(
	{ edges_vertices, vertices_edges },
	vertices_coords.map(p => p[axis]),
	epsilon,
);
const sweepFaces = (
	{ vertices_coords, faces_vertices },
	axis = 0,
	epsilon = EPSILON,
) => sweepValues(
	{ edges_vertices: edgeifyFaces({ vertices_coords, faces_vertices }, axis) },
	vertices_coords.map(p => p[axis]),
	epsilon,
);
const sweep = ({
	vertices_coords, edges_vertices, faces_vertices,
}, axis = 0, epsilon = EPSILON) => {
	const values = vertices_coords.map(p => p[axis]);
	const faces_edgeVertices = edgeifyFaces({ vertices_coords, faces_vertices }, axis);
	const vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	const vertices_faces = makeVerticesEdgesUnsorted({ edges_vertices: faces_edgeVertices });
	const edgesValues = edges_vertices.map(edge => edge.map(e => values[e]));
	const facesValues = faces_edgeVertices.map(face => face.map(e => values[e]));
	const edgesDegenerate = edgesValues.map(([a, b]) => epsilonEqual(a, b, epsilon));
	const facesDegenerate = facesValues.map(([a, b]) => epsilonEqual(a, b, epsilon));
	const edgesDirection = edgesValues.map(([a, b]) => Math.sign(a - b));
	const facesDirection = facesValues.map(([a, b]) => Math.sign(a - b));
	const edgesVertexSide = edges_vertices
		.map(([v1, v2], i) => (edgesDegenerate[i]
			? { [v1]: 0, [v2]: 0 }
			: { [v1]: edgesDirection[i], [v2]: -edgesDirection[i] }));
	const facesVertexSide = faces_vertices
		.map(([v1, v2], i) => (facesDegenerate[i]
			? { [v1]: 0, [v2]: 0 }
			: { [v1]: facesDirection[i], [v2]: -facesDirection[i] }));
	return clusterScalars(values, epsilon)
		.map(vertices => ({
			vertices,
			t: vertices.reduce((p, c) => p + values[c], 0) / vertices.length,
			edges: {
				start: uniqueElements(vertices
					.filter(v => vertices_edges[v] !== undefined)
					.flatMap(v => vertices_edges[v]
						.filter(edge => edgesVertexSide[edge][v] <= 0))),
				end: uniqueElements(vertices
					.filter(v => vertices_edges[v] !== undefined)
					.flatMap(v => vertices_edges[v]
						.filter(edge => edgesVertexSide[edge][v] >= 0))),
			},
			faces: {
				start: uniqueElements(vertices
					.filter(v => vertices_faces[v] !== undefined)
					.flatMap(v => vertices_faces[v]
						.filter(face => facesVertexSide[face][v] <= 0))),
				end: uniqueElements(vertices
					.filter(v => vertices_faces[v] !== undefined)
					.flatMap(v => vertices_faces[v]
						.filter(face => facesVertexSide[face][v] >= 0))),
			},
		}));
};

export { sweep, sweepEdges, sweepFaces, sweepValues, sweepVertices };
