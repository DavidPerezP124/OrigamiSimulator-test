/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makePolygonCircumradius } from '../math/polygon.js';
import { populate } from '../graph/populate.js';

const makeRectCoords = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
const makeGraphWithBoundaryCoords = (vertices_coords) => ({
	vertices_coords,
	edges_vertices: vertices_coords
		.map((_, i, arr) => [i, (i + 1) % arr.length]),
	edges_assignment: Array(vertices_coords.length).fill("B"),
	faces_vertices: [vertices_coords.map((_, i) => i)],
	faces_edges: [vertices_coords.map((_, i) => i)],
});
const square = (scale = 1) => populate(
	makeGraphWithBoundaryCoords(makeRectCoords(scale, scale)),
);
const rectangle = (width = 1, height = 1) => populate(
	makeGraphWithBoundaryCoords(makeRectCoords(width, height)),
);
const polygon = (sides = 3, circumradius = 1) => populate(
	makeGraphWithBoundaryCoords(makePolygonCircumradius(sides, circumradius)),
);
const circle = (radius = 1, sides = 128) => polygon(sides, radius);

export { circle, polygon, rectangle, square };
