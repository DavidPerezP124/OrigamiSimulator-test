/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makeEdgesIsFolded } from '../../fold/spec.js';
import { resize3, subtract3, subtract2, resize2 } from '../../math/vector.js';
import { identity2x3, makeMatrix2Reflect, multiplyMatrices2 } from '../../math/matrix2.js';
import { identity3x4, makeMatrix3Rotate, multiplyMatrices3 } from '../../math/matrix3.js';
import { makeVerticesToEdge } from '../make/lookup.js';
import { makeEdgesFoldAngle } from '../make/edgesFoldAngle.js';
import { makeEdgesAssignmentSimple } from '../make/edgesAssignment.js';
import { makeFacesFaces } from '../make/facesFaces.js';
import { rotateCircularArray } from '../../general/array.js';
import { minimumSpanningTrees } from '../trees.js';

const facesSharedEdgesVertices = (verticesA, verticesB) => {
	const hash = {};
	verticesB.forEach(v => { hash[v] = true; });
	const inCommon = verticesA.map(v => (hash[v] ? v : undefined));
	return rotateCircularArray(inCommon, inCommon.indexOf(undefined))
		.map((v, i, arr) => [v, arr[(i + 1) % arr.length]])
		.filter(pair => pair[0] !== undefined && pair[1] !== undefined);
};
const unassigned_angle = { U: true, u: true };
const makeFacesMatrix = (
	{
		vertices_coords, edges_vertices, edges_foldAngle,
		edges_assignment, faces_vertices, faces_faces,
	},
	rootFaces,
) => {
	if (!edges_assignment && edges_foldAngle) {
		edges_assignment = makeEdgesAssignmentSimple({ edges_foldAngle });
	}
	if (!edges_foldAngle) {
		if (edges_assignment) {
			edges_foldAngle = makeEdgesFoldAngle({ edges_assignment });
		} else {
			edges_foldAngle = Array(edges_vertices.length).fill(0);
		}
	}
	if (!faces_faces) {
		faces_faces = makeFacesFaces({ faces_vertices });
	}
	const edge_map = makeVerticesToEdge({ edges_vertices });
	const faces_matrix = faces_vertices.map(() => [...identity3x4]);
	minimumSpanningTrees(faces_faces, rootFaces)
		.forEach(tree => tree
			.slice(1)
			.forEach(level => level
				.forEach((entry) => {
					const edge_vertices = facesSharedEdgesVertices(
						faces_vertices[entry.index],
						faces_vertices[entry.parent],
					).shift();
					const coords = edge_vertices
						.map(v => vertices_coords[v])
						.map(resize3);
					const edgeKey = edge_vertices.join(" ");
					const edge = edge_map[edgeKey];
					const foldAngle = unassigned_angle[edges_assignment[edge]]
						? Math.PI
						: (edges_foldAngle[edge] * Math.PI) / 180;
					const local_matrix = makeMatrix3Rotate(
						foldAngle,
						subtract3(coords[1], coords[0]),
						coords[0],
					);
					faces_matrix[entry.index] = multiplyMatrices3(faces_matrix[entry.parent], local_matrix);
				})));
	return faces_matrix;
};
const makeFacesMatrix2 = (
	{
		vertices_coords, edges_vertices, edges_foldAngle,
		edges_assignment, faces_vertices, faces_faces,
	},
	rootFaces,
) => {
	if (!edges_foldAngle) {
		if (edges_assignment) {
			edges_foldAngle = makeEdgesFoldAngle({ edges_assignment });
		} else {
			edges_foldAngle = Array(edges_vertices.length).fill(0);
		}
	}
	if (!faces_faces) {
		faces_faces = makeFacesFaces({ faces_vertices });
	}
	const edges_is_folded = makeEdgesIsFolded({ edges_vertices, edges_foldAngle, edges_assignment });
	const edge_map = makeVerticesToEdge({ edges_vertices });
	const faces_matrix = faces_vertices.map(() => identity2x3);
	minimumSpanningTrees(faces_faces, rootFaces)
		.forEach(tree => tree
			.slice(1)
			.forEach(level => level
				.forEach((entry) => {
					const edge_vertices = facesSharedEdgesVertices(
						faces_vertices[entry.index],
						faces_vertices[entry.parent],
					).shift();
					const coords = edge_vertices.map(v => vertices_coords[v]);
					const edgeKey = edge_vertices.join(" ");
					const edge = edge_map[edgeKey];
					const reflect_vector = subtract2(coords[1], coords[0]);
					const reflect_origin = resize2(coords[0]);
					const local_matrix = edges_is_folded[edge]
						? makeMatrix2Reflect(reflect_vector, reflect_origin)
						: identity2x3;
					faces_matrix[entry.index] = multiplyMatrices2(faces_matrix[entry.parent], local_matrix);
				})));
	return faces_matrix;
};

export { facesSharedEdgesVertices, makeFacesMatrix, makeFacesMatrix2 };
