/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import makeCoordinates from './makeCoordinates.js';

const viewBoxValuesToString = function (x, y, width, height, padding = 0) {
	const scale = 1.0;
	const d = (width / scale) - width;
	const X = (x - d) - padding;
	const Y = (y - d) - padding;
	const W = (width + d * 2) + padding * 2;
	const H = (height + d * 2) + padding * 2;
	return [X, Y, W, H].join(" ");
};
const makeViewBox = (...args) => {
	const nums = makeCoordinates(...args.flat());
	if (nums.length === 2) { nums.unshift(0, 0); }
	return nums.length === 4
		? viewBoxValuesToString(nums[0], nums[1], nums[2], nums[3])
		: undefined;
};

export { makeViewBox as default };
