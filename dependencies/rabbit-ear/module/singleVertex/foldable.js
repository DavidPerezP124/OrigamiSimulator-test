/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { D2R, EPSILON } from '../math/constant.js';
import { makeMatrix3RotateZ, invertMatrix3, makeMatrix3RotateX, multiplyMatrices3, identity3x4 } from '../math/matrix3.js';
import { makeVerticesVertices } from '../graph/make/verticesVertices.js';
import { makeVerticesEdges } from '../graph/make/verticesEdges.js';
import { makeVerticesFaces } from '../graph/make/verticesFaces.js';
import { makeVerticesVerticesVector } from '../graph/make/vertices.js';

const verticesFoldability = ({
	vertices_coords, vertices_vertices, vertices_edges, vertices_faces,
	edges_vertices, edges_foldAngle, edges_vector, faces_vertices,
}) => {
	if (!vertices_vertices) {
		vertices_vertices = makeVerticesVertices({
			vertices_coords, vertices_edges, vertices_faces, edges_vertices, faces_vertices,
		});
	}
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdges({ edges_vertices, vertices_vertices });
	}
	if (!vertices_faces) {
		vertices_faces = makeVerticesFaces({ vertices_coords, vertices_vertices, faces_vertices });
	}
	const vertices_vectors = makeVerticesVerticesVector({
		vertices_coords,
		vertices_vertices,
		vertices_edges,
		vertices_faces,
		edges_vertices,
		edges_vector,
		faces_vertices,
	});
	return vertices_coords.map((_, v) => {
		if (vertices_faces[v].includes(undefined)
			|| vertices_faces[v].includes(null)) { return 0; }
		const edgesAngles = vertices_vectors[v]
			.map(vec => Math.atan2(vec[1], vec[0]));
		const edgesFoldAngle = vertices_edges[v]
			.map(e => edges_foldAngle[e])
			.map(angle => angle * D2R);
		const aM = edgesAngles.map(a => makeMatrix3RotateZ(a));
		const aiM = aM.map(m => invertMatrix3(m));
		const fM = edgesFoldAngle.map(a => makeMatrix3RotateX(a));
		const localMatrices = vertices_vectors[v]
			.map((__, i) => multiplyMatrices3(
				aM[i],
				multiplyMatrices3(fM[i], aiM[i]),
			));
		let matrix = [...identity3x4];
		localMatrices.forEach(m => { matrix = multiplyMatrices3(matrix, m); });
		return Array.from(Array(9))
			.map((__, i) => Math.abs(matrix[i] - identity3x4[i]))
			.reduce((a, b) => a + b, 0);
	});
};
const verticesFoldable = (graph, epsilon = EPSILON) => (
	verticesFoldability(graph)
		.map(deviation => Math.abs(deviation) < epsilon)
);

export { verticesFoldability, verticesFoldable };
