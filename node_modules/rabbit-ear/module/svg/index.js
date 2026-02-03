/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { setWindow } from './environment/window.js';
import NS from './spec/namespace.js';
import nodes_attributes from './spec/nodes_attributes.js';
import nodes_children from './spec/nodes_children.js';
import colors from './colors/index.js';
import general from './general/index.js';
import extensions from './constructor/extensions/index.js';
import { constructors, svg } from './constructor/elements.js';

const library = {
	NS,
	nodes_attributes,
	nodes_children,
	extensions,
	...colors,
	...general,
	...constructors,
	window: undefined,
};
const SVG = Object.assign(svg, library);
Object.defineProperty(SVG, "window", {
	enumerable: false,
	set: setWindow,
});

export { SVG as default };
