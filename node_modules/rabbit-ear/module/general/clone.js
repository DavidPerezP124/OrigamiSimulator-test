/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const clonePolyfill = function (o) {
	let newO;
	let i;
	if (typeof o !== "object") {
		return o;
	}
	if (!o) {
		return o;
	}
	if (Object.prototype.toString.apply(o) === "[object Array]") {
		newO = [];
		for (i = 0; i < o.length; i += 1) {
			newO[i] = clonePolyfill(o[i]);
		}
		return newO;
	}
	newO = {};
	for (i in o) {
		if (o.hasOwnProperty(i)) {
			newO[i] = clonePolyfill(o[i]);
		}
	}
	return newO;
};
const clone = (typeof structuredClone === "function"
	? structuredClone
	: clonePolyfill);

export { clone };
