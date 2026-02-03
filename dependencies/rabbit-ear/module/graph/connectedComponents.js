/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const connectedComponents = (array_array) => {
	const components = [];
	const recurse = (index, currentGroup) => {
		if (components[index] !== undefined) { return 0; }
		components[index] = currentGroup;
		array_array[index].forEach(i => recurse(i, currentGroup));
		return 1;
	};
	for (let row = 0, group = 0; row < array_array.length; row += 1) {
		if (!(row in array_array)) { continue; }
		group += recurse(row, group);
	}
	return components;
};
const connectedComponentsPairs = (array_array) => {
	const pairs = [];
	const circular = [];
	array_array.forEach((arr, i) => arr.forEach(j => {
		if (i < j) { pairs.push([i, j]); }
		if (i === j && !circular[i]) {
			circular[i] = true;
			pairs.push([i, j]);
		}
	}));
	return pairs;
};

export { connectedComponents, connectedComponentsPairs };
