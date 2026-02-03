/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import SVG from '../../svg/index.js';
import { addClass } from '../../svg/general/dom.js';
import { boundaries } from '../../graph/boundary.js';
import { isFoldedForm } from '../../fold/spec.js';
import { setKeysAndValues } from '../general/svg.js';

const BOUNDARY_FOLDED = {
	fill: "none",
};
const BOUNDARY_CP = {
	stroke: "black",
	fill: "white",
};
const drawBoundaries = (graph, options = {}) => {
	const g = SVG.g();
	if (!graph) { return g; }
	const polygons = boundaries(graph)
		.map(({ vertices }) => vertices.map(v => graph.vertices_coords[v]))
		.filter(polygon => polygon.length);
	polygons.forEach(polygon => {
		const svgPolygon = SVG.polygon(polygon);
		addClass(svgPolygon, "boundary");
		g.appendChild(svgPolygon);
	});
	setKeysAndValues(g, isFoldedForm(graph) ? BOUNDARY_FOLDED : BOUNDARY_CP);
	setKeysAndValues(g, options);
	return g;
};

export { drawBoundaries };
