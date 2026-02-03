/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { subtract, magnitude, resize2, resize3 } from '../../math/vector.js';
import { boundingBox } from '../../math/polygon.js';
import { getDimensionQuick } from '../../fold/spec.js';

const makeEdgesCoords = ({ vertices_coords, edges_vertices }) => (
	edges_vertices.map(ev => [vertices_coords[ev[0]], vertices_coords[ev[1]]])
);
const makeEdgesVector = ({ vertices_coords, edges_vertices }) => {
	const dimensions = getDimensionQuick({ vertices_coords });
	const resize = dimensions === 2 ? resize2 : resize3;
	return makeEdgesCoords({ vertices_coords, edges_vertices })
		.map(([a, b]) => resize(subtract(b, a)));
};
const makeEdgesLength = ({ vertices_coords, edges_vertices }) => (
	makeEdgesVector({ vertices_coords, edges_vertices }).map(magnitude)
);
const makeEdgesBoundingBox = ({
	vertices_coords, edges_vertices,
}, epsilon) => (
	makeEdgesCoords({ vertices_coords, edges_vertices })
		.map(coords => boundingBox(coords, epsilon))
);

export { makeEdgesBoundingBox, makeEdgesCoords, makeEdgesLength, makeEdgesVector };
