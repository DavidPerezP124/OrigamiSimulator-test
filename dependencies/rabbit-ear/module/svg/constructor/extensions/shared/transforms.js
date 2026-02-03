/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { str_transform } from '../../../environment/strings.js';

const getAttr = (element) => {
	const t = element.getAttribute(str_transform);
	return (t == null || t === "") ? undefined : t;
};
const TransformMethods = {
	clearTransform: (el) => { el.removeAttribute(str_transform); return el; },
};
["translate", "rotate", "scale", "matrix"].forEach(key => {
	TransformMethods[key] = (element, ...args) => {
		element.setAttribute(
			str_transform,
			[getAttr(element), `${key}(${args.join(" ")})`]
				.filter(a => a !== undefined)
				.join(" "),
		);
		return element;
	};
});

export { TransformMethods as default };
