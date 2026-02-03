/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { exclude, include } from '../../math/compare.js';
import { add2, scale2 } from '../../math/vector.js';
import { overlapConvexPolygonPoint } from '../../math/overlap.js';

const facesContainingPoint = (
	{ vertices_coords, faces_vertices = [] },
	point,
	domainFunction = include,
) => (!vertices_coords
	? []
	: faces_vertices
		.map((fv, i) => ({ face: fv.map(v => vertices_coords[v]), i }))
		.filter(f => overlapConvexPolygonPoint(f.face, point, domainFunction).overlap)
		.map(el => el.i)
);
const faceContainingPoint = (
	{ vertices_coords, faces_vertices },
	point,
	vector,
) => {
	const facesInclusive = facesContainingPoint(
		{ vertices_coords, faces_vertices },
		point,
		include,
	);
	switch (facesInclusive.length) {
	case 0: return undefined;
	case 1: return facesInclusive[0];
	}
	if (!vector) { return facesInclusive[0]; }
	const nudgePoint = add2(point, scale2(vector, 1e-2));
	const polygons = facesInclusive
		.map(face => faces_vertices[face]
			.map(v => vertices_coords[v]));
	const facesExclusive = facesInclusive.filter((_, i) => (
		overlapConvexPolygonPoint(polygons[i], nudgePoint, exclude).overlap
	));
	switch (facesExclusive.length) {
	case 0: return facesInclusive.find((_, i) => (
		overlapConvexPolygonPoint(polygons[i], nudgePoint, include).overlap
	));
	case 1: return facesExclusive[0];
	default: return facesExclusive[0];
	}
};

export { faceContainingPoint, facesContainingPoint };
