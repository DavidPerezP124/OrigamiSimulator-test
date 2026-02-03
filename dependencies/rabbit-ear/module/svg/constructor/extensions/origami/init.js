/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import NS from '../../../spec/namespace.js';
import RabbitEarWindow from '../../../environment/window.js';
import lib from '../../../environment/lib.js';
import { findElementTypeInParents } from '../../../general/dom.js';

const applyViewBox = (parent, element, graph, options = {}) => {
	const unitBounds = { min: [0, 0], max: [1, 1], span: [1, 1] };
	const box = lib.ear.graph.boundingBox(graph) || unitBounds;
	const svgElement = findElementTypeInParents(parent, "svg");
	if (svgElement && options && options.viewBox) {
		const viewBoxValue = [box.min, box.span]
			.flatMap(p => [p[0], p[1]])
			.join(" ");
		svgElement.setAttributeNS(null, "viewBox", viewBoxValue);
	}
};
const init = (parent, graph, options = {}) => {
	const g = RabbitEarWindow().document.createElementNS(NS, "g");
	lib.ear.convert.renderSVG(graph, g, {
		viewBox: true,
		strokeWidth: true,
		...options,
	});
	applyViewBox(parent, g, graph, {
		viewBox: true,
		strokeWidth: true,
		...options,
	});
	return g;
};

export { init as default };
