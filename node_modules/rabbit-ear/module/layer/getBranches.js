/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { tacoTypeNames, constraintToFacePairsStrings } from './general.js';

const getBranches = (
	remainingKeys,
	constraints,
	lookup,
) => {
	const keys = {};
	remainingKeys.forEach(key => { keys[key] = true; });
	let i = 0;
	const groups = [];
	while (i < remainingKeys.length) {
		if (!keys[remainingKeys[i]]) { i += 1; continue; }
		const group = [];
		const stack = [remainingKeys[i]];
		const stackHash = { [remainingKeys[i]]: true };
		do {
			const key = stack.pop();
			delete keys[key];
			group.push(key);
			const neighborsHash = {};
			tacoTypeNames.forEach(type => {
				const indices = lookup[type][key];
				if (!indices) { return; }
				indices
					.map(c => constraints[type][c])
					.map(faces => constraintToFacePairsStrings[type](faces)
						.forEach(facePair => { neighborsHash[facePair] = true; }));
			});
			const neighbors = Object.keys(neighborsHash)
				.filter(facePair => keys[facePair])
				.filter(facePair => !stackHash[facePair]);
			stack.push(...neighbors);
			neighbors.forEach(facePair => { stackHash[facePair] = true; });
		} while (stack.length);
		i += 1;
		groups.push(group);
	}
	return groups;
};

export { getBranches };
