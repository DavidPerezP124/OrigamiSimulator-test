/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { countImpliedVertices } from '../count.js';
import { makeVerticesToFace } from './lookup.js';

const makeVerticesFacesUnsorted = ({ vertices_coords, vertices_edges, faces_vertices }) => {
	const vertArray = vertices_coords || vertices_edges;
	if (!faces_vertices) { return (vertArray || []).map(() => []); }
	const vertices_faces = vertArray !== undefined
		? vertArray.map(() => [])
		: Array.from(Array(countImpliedVertices({ faces_vertices }))).map(() => []);
	faces_vertices.forEach((face, f) => {
		const hash = [];
		face.forEach((vertex) => { hash[vertex] = f; });
		hash.forEach((fa, v) => vertices_faces[v].push(fa));
	});
	return vertices_faces;
};
const makeVerticesFaces = ({ vertices_coords, vertices_vertices, faces_vertices }) => {
	if (!faces_vertices) { return vertices_coords.map(() => []); }
	if (!vertices_vertices) {
		return makeVerticesFacesUnsorted({ vertices_coords, faces_vertices });
	}
	const face_map = makeVerticesToFace({ faces_vertices });
	return vertices_vertices
		.map((verts, v) => verts.map(vert => [v, vert].join(" ")))
		.map(keys => keys
			.map(key => face_map[key]));
};

export { makeVerticesFaces, makeVerticesFacesUnsorted };
