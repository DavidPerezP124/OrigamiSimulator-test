/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makeEdgesIsFolded, edgesFoldAngleAreAllFlat } from '../../fold/spec.js';
import { resize2, normalize2, subtract2, rotate90, rotate270, dot, scale2, add2, resize3 } from '../../math/vector.js';
import { identity2x3, multiplyMatrix2Vector2 } from '../../math/matrix2.js';
import { identity3x4, multiplyMatrix3Vector3 } from '../../math/matrix3.js';
import { makeVerticesFaces } from '../make/verticesFaces.js';
import { makeVerticesToEdge } from '../make/lookup.js';
import { makeFacesFaces } from '../make/facesFaces.js';
import { minimumSpanningTrees } from '../trees.js';
import { facesSharedEdgesVertices, makeFacesMatrix } from '../faces/matrix.js';

const makeVerticesCoords3DFolded = ({
	vertices_coords, vertices_faces, edges_vertices, edges_foldAngle,
	edges_assignment, faces_vertices, faces_faces, faces_matrix,
}, rootFaces) => {
	if (!vertices_coords || !vertices_coords.length) { return []; }
	if (!faces_vertices || !faces_vertices.length) {
		return vertices_coords.map(resize3);
	}
	faces_matrix = makeFacesMatrix({
		vertices_coords, edges_vertices, edges_foldAngle, edges_assignment, faces_vertices, faces_faces,
	}, rootFaces);
	if (!vertices_faces) {
		vertices_faces = makeVerticesFaces({ faces_vertices });
	}
	const vertices_matrix = vertices_faces
		.map(faces => faces.find(f => f != null))
		.map(face => (face === undefined
			? [...identity3x4]
			: faces_matrix[face]));
	return vertices_coords
		.map(resize3)
		.map((coord, i) => multiplyMatrix3Vector3(vertices_matrix[i], coord));
};
const makeVerticesCoordsFlatFolded = (
	{
		vertices_coords, edges_vertices, edges_foldAngle,
		edges_assignment, faces_vertices, faces_faces,
	},
	rootFaces = [],
) => {
	if (!vertices_coords || !vertices_coords.length) { return []; }
	if (!faces_vertices || !faces_vertices.length) {
		return vertices_coords.map(resize2);
	}
	if (!faces_faces) {
		faces_faces = makeFacesFaces({ faces_vertices });
	}
	const edges_isFolded = makeEdgesIsFolded({
		edges_vertices, edges_foldAngle, edges_assignment,
	});
	const vertices_coordsFolded = [];
	const faces_flipped = [];
	const edgesMap = makeVerticesToEdge({ edges_vertices });
	minimumSpanningTrees(faces_faces, rootFaces).forEach(tree => {
		const rootRow = tree.shift();
		if (!rootRow || !rootRow.length) { return; }
		const root = rootRow[0];
		faces_flipped[root.index] = false;
		faces_vertices[root.index]
			.forEach(v => { vertices_coordsFolded[v] = [...vertices_coords[v]]; });
		tree.forEach(level => level
			.forEach(entry => {
				const edgeKey = facesSharedEdgesVertices(
					faces_vertices[entry.index],
					faces_vertices[entry.parent],
				).shift().join(" ");
				const edge = edgesMap[edgeKey];
				const coords = edges_vertices[edge].map(v => vertices_coordsFolded[v]);
				if (coords[0] === undefined || coords[1] === undefined) { return; }
				const coords_cp = edges_vertices[edge].map(v => vertices_coords[v]);
				const origin_cp = coords_cp[0];
				const vector_cp = normalize2(subtract2(coords_cp[1], coords_cp[0]));
				const normal_cp = rotate90(vector_cp);
				faces_flipped[entry.index] = edges_isFolded[edge]
					? !faces_flipped[entry.parent]
					: faces_flipped[entry.parent];
				const vector_folded = normalize2(subtract2(coords[1], coords[0]));
				const origin_folded = coords[0];
				const normal_folded = faces_flipped[entry.index]
					? rotate270(vector_folded)
					: rotate90(vector_folded);
				faces_vertices[entry.index]
					.filter(v => vertices_coordsFolded[v] === undefined)
					.forEach(v => {
						const to_point = subtract2(vertices_coords[v], origin_cp);
						const project_norm = dot(to_point, normal_cp);
						const project_line = dot(to_point, vector_cp);
						const walk_up = scale2(vector_folded, project_line);
						const walk_perp = scale2(normal_folded, project_norm);
						const folded_coords = add2(add2(origin_folded, walk_up), walk_perp);
						vertices_coordsFolded[v] = folded_coords;
					});
			}));
	});
	return vertices_coordsFolded;
};
const makeVerticesCoordsFolded = (graph, rootFaces) => (
	edgesFoldAngleAreAllFlat(graph)
		? makeVerticesCoordsFlatFolded(graph, rootFaces)
		: makeVerticesCoords3DFolded(graph, rootFaces));
const makeVerticesCoordsFoldedFromMatrix2 = ({
	vertices_coords, vertices_faces, faces_vertices,
}, faces_matrix) => {
	if (!vertices_faces) {
		vertices_faces = makeVerticesFaces({ faces_vertices });
	}
	const vertices_face = vertices_faces
		.map(faces => faces.find(f => f != null));
	const vertices_matrix = vertices_face
		.map(face => (face === undefined
			? identity2x3
			: faces_matrix[face]));
	return vertices_coords
		.map(resize2)
		.map((point, i) => multiplyMatrix2Vector2(vertices_matrix[i], point))
};

export { makeVerticesCoords3DFolded, makeVerticesCoordsFlatFolded, makeVerticesCoordsFolded, makeVerticesCoordsFoldedFromMatrix2 };
