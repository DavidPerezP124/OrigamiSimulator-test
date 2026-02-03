/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { str_string, str_function } from '../environment/strings.js';

const svgIsIterable = (obj) => obj != null
	&& typeof obj[Symbol.iterator] === str_function;
const svgSemiFlattenArrays = function () {
	switch (arguments.length) {
	case 0: return Array.from(arguments);
	case 1: return svgIsIterable(arguments[0]) && typeof arguments[0] !== str_string
		? svgSemiFlattenArrays(...arguments[0])
		: [arguments[0]];
	default:
		return Array.from(arguments).map(a => (svgIsIterable(a)
			? [...svgSemiFlattenArrays(a)]
			: a));
	}
};

export { svgSemiFlattenArrays as default, svgSemiFlattenArrays };
