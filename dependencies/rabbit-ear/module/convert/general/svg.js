/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { boundingBox } from '../../graph/boundary.js';
import { makeEdgesLength } from '../../graph/make/edges.js';

const unitBounds = { min: [0, 0], span: [1, 1] };
const setKeysAndValues = (el, attributes = {}) => Object
	.keys(attributes)
	.forEach(key => el.setAttributeNS(null, key, attributes[key]));
const boundingBoxToViewBox = (box) => [box.min, box.span]
	.flatMap(p => [p[0], p[1]])
	.join(" ");
const getViewBox = (graph) => {
	const box = boundingBox(graph);
	return box === undefined ? "" : boundingBoxToViewBox(box);
};
const getNthPercentileEdgeLength = (
	{ vertices_coords, edges_vertices, edges_length },
	n = 0.1,
) => {
	if (!vertices_coords || !edges_vertices) { return undefined; }
	if (!edges_length) {
		edges_length = makeEdgesLength({ vertices_coords, edges_vertices });
	}
	const sortedLengths = edges_length
		.slice()
		.sort((a, b) => a - b);
	const index_tenth_percent = Math.max(
		0,
		Math.min(
			Math.floor(sortedLengths.length * n),
			sortedLengths.length - 1,
		),
	);
	return sortedLengths[index_tenth_percent];
};
const getStrokeWidth = (graph, vmax) => {
	const v_max = (vmax === undefined
		? Math.max(...(boundingBox(graph) || unitBounds).span)
		: vmax);
	const edgeTenthPercent = getNthPercentileEdgeLength(graph, 0.1);
	return edgeTenthPercent
		? edgeTenthPercent * 0.1
		: v_max * 0.01;
};

export { boundingBoxToViewBox, getNthPercentileEdgeLength, getStrokeWidth, getViewBox, setKeysAndValues };
