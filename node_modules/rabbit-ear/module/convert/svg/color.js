/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import RabbitEarWindow from '../../environment/window.js';
import { rgbToAssignment } from '../../fold/colors.js';
import { parseColorToHex, parseColorToRgb } from '../../svg/colors/parseColor.js';

const colorToAssignment = (color, customAssignments) => {
	const hex = parseColorToHex(color).toUpperCase();
	return customAssignments && customAssignments[hex]
		? customAssignments[hex]
		: rgbToAssignment(...parseColorToRgb(color));
};
const opacityToFoldAngle = (opacity, assignment) => {
	switch (assignment) {
	case "M": case "m": return -180 * opacity;
	case "V": case "v": return 180 * opacity;
	default: return 0;
	}
};
const getEdgeStroke = (element, attributes) => {
	const computedStroke = RabbitEarWindow().getComputedStyle != null
		? RabbitEarWindow().getComputedStyle(element).stroke
		: "";
	if (computedStroke !== "" && computedStroke !== "none") {
		return computedStroke;
	}
	if (attributes.stroke !== undefined) {
		return attributes.stroke;
	}
	return undefined;
};
const getEdgeOpacity = (element, attributes) => {
	const computedOpacity = RabbitEarWindow().getComputedStyle != null
		? RabbitEarWindow().getComputedStyle(element).opacity
		: "";
	if (computedOpacity !== "") {
		const floatOpacity = parseFloat(computedOpacity);
		if (!Number.isNaN(floatOpacity)) { return floatOpacity; }
	}
	if (attributes.opacity !== undefined) {
		const floatOpacity = parseFloat(attributes.opacity);
		if (!Number.isNaN(floatOpacity)) { return floatOpacity; }
	}
	return undefined;
};

export { colorToAssignment, getEdgeOpacity, getEdgeStroke, opacityToFoldAngle };
