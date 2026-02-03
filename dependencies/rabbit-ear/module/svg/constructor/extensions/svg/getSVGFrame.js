/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { str_function } from '../../../environment/strings.js';
import { getViewBox } from '../../../general/viewBox.js';

const getSVGFrame = function (element) {
	const viewBox = getViewBox(element);
	if (viewBox !== undefined) {
		return viewBox;
	}
	if (typeof element.getBoundingClientRect === str_function) {
		const rr = element.getBoundingClientRect();
		return [rr.x, rr.y, rr.width, rr.height];
	}
	return [];
};

export { getSVGFrame as default };
