/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { resize, distance, subtract2, subtract3 } from '../math/vector.js';
import { nearestPointOnLine } from '../math/nearest.js';
import { arrayMinimumIndex } from '../general/array.js';
import { clampSegment } from '../math/line.js';
import { getDimensionQuick } from '../fold/spec.js';
import { makeFacesCenterQuick } from './make/faces.js';
import { faceContainingPoint } from './faces/facePoint.js';

const nearestVertex = ({ vertices_coords }, point) => {
	if (!vertices_coords) { return undefined; }
	const dimension = getDimensionQuick({ vertices_coords });
	if (dimension === undefined) { return undefined; }
	const p = resize(dimension, point);
	const nearest = vertices_coords
		.map((v, i) => ({ d: distance(p, v), i }))
		.sort((a, b) => a.d - b.d)
		.shift();
	return nearest ? nearest.i : undefined;
};
const nearestPoints2 = ({ vertices_coords, edges_vertices }, point) => edges_vertices
	.map(e => e.map(ev => vertices_coords[ev]))
	.map(e => nearestPointOnLine(
		{ vector: subtract2(e[1], e[0]), origin: e[0] },
		point,
		clampSegment,
	));
const nearestPoints3 = ({ vertices_coords, edges_vertices }, point) => edges_vertices
	.map(e => e.map(ev => vertices_coords[ev]))
	.map(e => nearestPointOnLine(
		{ vector: subtract3(e[1], e[0]), origin: e[0] },
		point,
		clampSegment,
	));
const nearestEdge = ({ vertices_coords, edges_vertices }, point) => {
	if (!vertices_coords || !edges_vertices) { return undefined; }
	const nearest_points = getDimensionQuick({ vertices_coords }) === 2
		? nearestPoints2({ vertices_coords, edges_vertices }, point)
		: nearestPoints3({ vertices_coords, edges_vertices }, point);
	return arrayMinimumIndex(nearest_points, p => distance(p, point));
};
const nearestFace = (graph, point) => {
	const face = faceContainingPoint(graph, point);
	if (face !== undefined) { return face; }
	if (graph.edges_faces) {
		const edge = nearestEdge(graph, point);
		if (edge === undefined) { return undefined; }
		const faces = graph.edges_faces[edge];
		if (faces.length === 1) { return faces[0]; }
		if (faces.length > 1) {
			const faces_center = makeFacesCenterQuick({
				vertices_coords: graph.vertices_coords,
				faces_vertices: faces.map(f => graph.faces_vertices[f]),
			});
			const distances = faces_center
				.map(center => distance(center, point));
			let shortest = 0;
			for (let i = 0; i < distances.length; i += 1) {
				if (distances[i] < distances[shortest]) { shortest = i; }
			}
			return faces[shortest];
		}
	}
	return undefined;
};

export { nearestEdge, nearestFace, nearestVertex };
