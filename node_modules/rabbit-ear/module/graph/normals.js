/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { resize3, parallel, subtract3, normalize3, cross3 } from '../math/vector.js';

const makeFacesNormal = ({ vertices_coords, faces_vertices }) => {
	const vertices_coords3D = vertices_coords.map(resize3);
	return faces_vertices
		.map(vertices => vertices
			.map(vertex => vertices_coords3D[vertex]))
		.map(polygon => {
			let a;
			let b;
			let i = 0;
			do {
				a = subtract3(polygon[(i + 1) % polygon.length], polygon[i]);
				b = subtract3(polygon[(i + 2) % polygon.length], polygon[i]);
				i += 1;
			} while (i < polygon.length && parallel(a, b));
			return normalize3(cross3(a, b));
		});
};
const makeVerticesNormal = ({ vertices_coords, faces_vertices, faces_normal }) => {
	if (!faces_normal) {
		faces_normal = makeFacesNormal({ vertices_coords, faces_vertices });
	}
	const mkzero = () => [0, 0, 0];
	const vertices_normals = vertices_coords.map(mkzero);
	faces_vertices
		.forEach((vertices, f) => vertices
			.forEach(v => {
				vertices_normals[v][0] += faces_normal[f][0];
				vertices_normals[v][1] += faces_normal[f][1];
				vertices_normals[v][2] += faces_normal[f][2];
			}));
	return vertices_normals.map(v => normalize3(v));
};

export { makeFacesNormal, makeVerticesNormal };
