/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import RabbitEarWindow from '../environment/window.js';
import { str_svg } from '../environment/strings.js';
import { nodeNames } from '../spec/nodes.js';
import Constructor from './index.js';

const constructorList = {};
nodeNames.forEach(nodeName => {
	constructorList[nodeName] = (...args) => Constructor(nodeName, null, ...args);
});
const constructors = Object.assign(constructorList);
const svg = (...args) => {
	const svgElement = Constructor(str_svg, null, ...args);
	const initialize = () => args
		.filter(arg => typeof arg === "function")
		.forEach(func => func.call(svgElement, svgElement));
	if (RabbitEarWindow().document.readyState === "loading") {
		RabbitEarWindow().document.addEventListener("DOMContentLoaded", initialize);
	} else {
		initialize();
	}
	return svgElement;
};

export { constructors, svg };
