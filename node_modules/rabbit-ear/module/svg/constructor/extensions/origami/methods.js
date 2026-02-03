/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import TransformMethods from '../shared/transforms.js';
import methods$1 from '../shared/urls.js';
import * as dom from '../shared/dom.js';

const getChildWithClass = (group, className) => {
	const childNodes = group ? group.childNodes : undefined;
	if (!childNodes) { return null; }
	return Array.from(childNodes)
		.filter(el => el.getAttribute("class") === className)
		.shift();
};
const vertices = (...args) => getChildWithClass(args[0], "vertices");
const edges = (...args) => getChildWithClass(args[0], "edges");
const faces = (...args) => getChildWithClass(args[0], "faces");
const boundaries = (...args) => getChildWithClass(args[0], "boundaries");
const methods = {
	vertices,
	edges,
	faces,
	boundaries,
	...TransformMethods,
	...methods$1,
	...dom,
};

export { methods as default };
