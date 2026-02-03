/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import cssColors from './cssColors.js';
import { hexToRgb, hslToRgb, rgbToHex } from './convert.js';

const getParenNumbers = str => {
	const match = str.match(/\(([^\)]+)\)/g);
	if (match == null || !match.length) { return []; }
	return match[0]
		.substring(1, match[0].length - 1)
		.split(/[\s,]+/)
		.map(parseFloat);
};
const parseColorToRgb = (string) => {
	if (cssColors[string]) { return hexToRgb(cssColors[string]); }
	if (string[0] === "#") { return hexToRgb(string); }
	if (string.substring(0, 4) === "rgba"
		|| string.substring(0, 3) === "rgb") {
		const values = getParenNumbers(string);
		[0, 1, 2]
			.filter(i => values[i] === undefined)
			.forEach(i => { values[i] = 0; });
		return values;
	}
	if (string.substring(0, 4) === "hsla"
		|| string.substring(0, 3) === "hsl") {
		const values = getParenNumbers(string);
		[0, 1, 2]
			.filter(i => values[i] === undefined)
			.forEach(i => { values[i] = 0; });
		return hslToRgb(values[0], values[1], values[2], values[3]);
	}
	return undefined;
};
const parseColorToHex = (string) => {
	if (cssColors[string]) { return cssColors[string].toUpperCase(); }
	if (string[0] === "#") {
		const [r, g, b, a] = hexToRgb(string);
		return rgbToHex(r, g, b, a);
	}
	if (string.substring(0, 4) === "rgba"
		|| string.substring(0, 3) === "rgb") {
		const [r, g, b, a] = getParenNumbers(string);
		return rgbToHex(r, g, b, a);
	}
	if (string.substring(0, 4) === "hsla"
		|| string.substring(0, 3) === "hsl") {
		const values = getParenNumbers(string);
		[0, 1, 2]
			.filter(i => values[i] === undefined)
			.forEach(i => { values[i] = 0; });
		const [h, s, l, a] = values;
		const [r, g, b] = hslToRgb(h, s, l, a);
		return rgbToHex(r, g, b, a);
	}
	return undefined;
};

export { parseColorToHex, parseColorToRgb };
