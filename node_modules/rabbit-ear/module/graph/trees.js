/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const minimumSpanningTrees = (array_array = [], rootIndices = []) => {
	if (array_array.length === 0) { return []; }
	const trees = [];
	const unvisited = {};
	array_array.forEach((_, i) => { unvisited[i] = true; });
	do {
		const rootIndex = rootIndices.filter(i => unvisited[i]).shift();
		const startIndex = rootIndex !== undefined
			? rootIndex
			: parseInt(Object.keys(unvisited).shift(), 10);
		delete unvisited[startIndex];
		const tree = [];
		let currentLevel = [{ index: startIndex }];
		do {
			tree.push(currentLevel);
			const nextLevel = currentLevel
				.flatMap(current => array_array[current.index]
					.filter(i => unvisited[i] && i !== null && i !== undefined)
					.map(index => ({ index, parent: current.index })));
			const duplicates = {};
			nextLevel.forEach((el, i) => {
				if (!unvisited[el.index]) { duplicates[i] = true; }
				delete unvisited[el.index];
			});
			currentLevel = nextLevel.filter((_, i) => !duplicates[i]);
		} while (currentLevel.length);
		trees.push(tree);
	} while (Object.keys(unvisited).length);
	return trees;
};

export { minimumSpanningTrees };
