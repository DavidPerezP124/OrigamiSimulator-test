/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { str_string, str_id } from '../../../environment/strings.js';
import { toCamel } from '../../../general/string.js';

const findIdURL = function (arg) {
	if (arg == null) { return ""; }
	if (typeof arg === str_string) {
		return arg.slice(0, 3) === "url"
			? arg
			: `url(#${arg})`;
	}
	if (arg.getAttribute != null) {
		const idString = arg.getAttribute(str_id);
		return `url(#${idString})`;
	}
	return "";
};
const methods = {};
["clip-path",
	"mask",
	"symbol",
	"marker-end",
	"marker-mid",
	"marker-start",
].forEach(attr => {
	methods[toCamel(attr)] = (element, parent) => {
		element.setAttribute(attr, findIdURL(parent));
		return element;
	};
});

export { methods as default };
