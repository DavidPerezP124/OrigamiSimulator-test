/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { subtract } from '../../math/vector.js';
import { sortPointsAlongVector } from '../../general/sort.js';

const sortVerticesCounterClockwise = ({ vertices_coords }, vertices, vertex) => (
	vertices
		.map(v => vertices_coords[v])
		.map(coord => subtract(coord, vertices_coords[vertex]))
		.map(vec => Math.atan2(vec[1], vec[0]))
		.map(angle => (angle > -EPSILON ? angle : angle + Math.PI * 2))
		.map((a, i) => ({ a, i }))
		.sort((a, b) => a.a - b.a)
		.map(el => el.i)
		.map(i => vertices[i])
);
const sortVerticesAlongVector = ({ vertices_coords }, vertices, vector) => (
	sortPointsAlongVector(
		vertices.map(v => vertices_coords[v]),
		vector,
	).map(i => vertices[i])
);

export { sortVerticesAlongVector, sortVerticesCounterClockwise };
