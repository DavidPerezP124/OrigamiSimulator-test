/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import RabbitEarWindow from '../environment/window.js';
import NS from '../spec/namespace.js';
import nodes_children from '../spec/nodes_children.js';
import nodes_attributes from '../spec/nodes_attributes.js';
import { toCamel } from '../general/string.js';
import extensions from './extensions/index.js';

const passthroughArgs = (...args) => args;
const Constructor = (name, parent, ...initArgs) => {
	const nodeName = extensions[name] && extensions[name].nodeName
		? extensions[name].nodeName
		: name;
	const { init, args, methods } = extensions[name] || {};
	const attributes = nodes_attributes[nodeName] || [];
	const children = nodes_children[nodeName] || [];
	const element = init
		?	init(parent, ...initArgs)
		: RabbitEarWindow().document.createElementNS(NS, nodeName);
	if (parent && !element.parentElement) { parent.appendChild(element); }
	const processArgs = args || passthroughArgs;
	processArgs(...initArgs).forEach((v, i) => {
		element.setAttribute(nodes_attributes[nodeName][i], v);
	});
	if (methods) {
		Object.keys(methods)
			.forEach(methodName => Object.defineProperty(element, methodName, {
				value: function () {
					return methods[methodName](element, ...arguments);
				},
			}));
	}
	attributes.forEach((attribute) => {
		const attrNameCamel = toCamel(attribute);
		if (element[attrNameCamel]) { return; }
		Object.defineProperty(element, attrNameCamel, {
			value: function () {
				element.setAttribute(attribute, ...arguments);
				return element;
			},
		});
	});
	children.forEach((childNode) => {
		if (element[childNode]) { return; }
		const value = function () { return Constructor(childNode, element, ...arguments); };
		Object.defineProperty(element, childNode, { value });
	});
	return element;
};

export { Constructor as default };
