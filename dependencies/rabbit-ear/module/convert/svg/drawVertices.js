/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import SVG from '../../svg/index.js';
import { setKeysAndValues } from '../general/svg.js';

const drawVertices = (graph, options = {}) => {
	const g = SVG.g();
	if (!graph || !graph.vertices_coords) { return g; }
	graph.vertices_coords
		.map(v => SVG.circle(v[0], v[1], 0.01))
		.forEach(v => g.appendChild(v));
	setKeysAndValues(g, options);
	return g;
};

export { drawVertices };
