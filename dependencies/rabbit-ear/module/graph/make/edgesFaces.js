/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { subtract2, cross2 } from '../../math/vector.js';
import { countImpliedEdges } from '../count.js';
import { makeFacesVerticesFromEdges } from './facesVertices.js';
import { makeFacesEdgesFromVertices } from './facesEdges.js';
import { makeEdgesVector } from './edges.js';
import { makeFacesCenterQuick } from './faces.js';

const makeEdgesFacesUnsorted = ({ edges_vertices, faces_vertices, faces_edges }) => {
	if (!faces_edges) {
		faces_edges = makeFacesEdgesFromVertices({ edges_vertices, faces_vertices });
	}
	const edges_faces = edges_vertices !== undefined
		? edges_vertices.map(() => [])
		: Array.from(Array(countImpliedEdges({ faces_edges }))).map(() => []);
	faces_edges.forEach((face, f) => {
		const hash = [];
		face.forEach((edge) => { hash[edge] = f; });
		hash.forEach((fa, e) => edges_faces[e].push(fa));
	});
	return edges_faces;
};
const makeEdgesFaces = ({
	vertices_coords, edges_vertices, edges_vector, faces_vertices, faces_edges, faces_center,
}) => {
	if (!edges_vertices || (!faces_vertices && !faces_edges)) {
		return makeEdgesFacesUnsorted({ faces_edges });
	}
	if (!faces_vertices) {
		faces_vertices = makeFacesVerticesFromEdges({ edges_vertices, faces_edges });
	}
	if (!faces_edges) {
		faces_edges = makeFacesEdgesFromVertices({ edges_vertices, faces_vertices });
	}
	if (!edges_vector) {
		edges_vector = makeEdgesVector({ vertices_coords, edges_vertices });
	}
	const edges_origin = edges_vertices.map(pair => vertices_coords[pair[0]]);
	if (!faces_center) {
		faces_center = makeFacesCenterQuick({ vertices_coords, faces_vertices });
	}
	const edges_faces = edges_vertices.map(() => []);
	faces_edges.forEach((face, f) => {
		const hash = [];
		face.forEach((edge) => { hash[edge] = f; });
		hash.forEach((fa, e) => edges_faces[e].push(fa));
	});
	edges_faces.forEach((faces, e) => {
		const faces_cross = faces
			.map(f => faces_center[f])
			.map(center => subtract2(center, edges_origin[e]))
			.map(vector => cross2(vector, edges_vector[e]));
		faces.sort((a, b) => faces_cross[a] - faces_cross[b]);
	});
	return edges_faces;
};

export { makeEdgesFaces, makeEdgesFacesUnsorted };
