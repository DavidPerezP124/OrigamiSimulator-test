/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { resize2, distance2 } from '../math/vector.js';
import { collinearPoints } from '../math/line.js';
import { trilateration2 } from '../math/triangle.js';

const transferPointInFaceBetweenGraphs = (from, to, face, point) => {
	const faceVerticesInitial = to.faces_vertices[face]
		.filter(v => from.vertices_coords[v] && to.vertices_coords[v]);
	const faceVertsInitialCollinear = faceVerticesInitial
		.map((v, i, arr) => [
			arr[(i + arr.length - 1) % arr.length], v, arr[(i + 1) % arr.length],
		])
		.map(verts => {
			const [a, b, c] = verts.map(v => from.vertices_coords[v]);
			const [d, e, f] = verts.map(v => to.vertices_coords[v]);
			return [a, b, c, d, e, f];
		})
		.map(([a, b, c, d, e, f]) => collinearPoints(a, b, c) || collinearPoints(d, e, f));
	const faceVertsValid = faceVerticesInitial
		.filter((_, i) => !faceVertsInitialCollinear[i]);
	if (faceVertsValid.length < 3) { return undefined; }
	const [a, b, c] = faceVertsValid;
	const toPoly = [
		resize2(to.vertices_coords[a]),
		resize2(to.vertices_coords[b]),
		resize2(to.vertices_coords[c]),
	];
	const distances = [
		distance2(from.vertices_coords[a], point),
		distance2(from.vertices_coords[b], point),
		distance2(from.vertices_coords[c], point),
	];
	return trilateration2(toPoly, distances);
};

export { transferPointInFaceBetweenGraphs };
