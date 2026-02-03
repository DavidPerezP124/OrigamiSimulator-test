/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { toKebab } from '../../../general/string.js';

const removeChildren = (element) => {
	while (element.lastChild) {
		element.removeChild(element.lastChild);
	}
	return element;
};
const appendTo = (element, parent) => {
	if (parent && parent.appendChild) {
		parent.appendChild(element);
	}
	return element;
};
const setAttributes = (element, attrs) => {
	Object.keys(attrs)
		.forEach(key => element.setAttribute(toKebab(key), attrs[key]));
	return element;
};

export { appendTo, removeChildren, setAttributes };
