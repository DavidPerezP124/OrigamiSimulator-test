/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { boundingBox } from './boundary.js';
import { distance } from '../math/vector.js';

const shortestEdgeLength = ({ vertices_coords, edges_vertices }) => {
	const lengths = edges_vertices
		.map(ev => ev.map(v => vertices_coords[v]))
		.map(([a, b]) => distance(a, b))
		.filter(len => len > 1e-4);
	const minLen = lengths
		.reduce((a, b) => Math.min(a, b), Infinity);
	return minLen === Infinity ? undefined : minLen;
};
const getEpsilon = ({ vertices_coords, edges_vertices }) => {
	const shortest = shortestEdgeLength({ vertices_coords, edges_vertices });
	const bounds = boundingBox({ vertices_coords });
	const graphSpan = bounds && bounds.span ? Math.max(...bounds.span) : 1;
	const spanScale = graphSpan * 1e-2;
	const edgeScale = shortest / 20;
	return shortest === undefined ? spanScale : Math.min(spanScale, edgeScale);
};
const makeEpsilon = ({ vertices_coords, edges_vertices }) => {
	const shortest = shortestEdgeLength({ vertices_coords, edges_vertices });
	if (shortest) { return Math.max(shortest * 1e-4, 1e-10); }
	const bounds = boundingBox({ vertices_coords });
	return bounds && bounds.span
		? Math.max(1e-6 * Math.max(...bounds.span), 1e-10)
		: 1e-6;
};

export { getEpsilon, makeEpsilon, shortestEdgeLength };
