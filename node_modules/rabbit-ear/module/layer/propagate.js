/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { table } from './table.js';
import { tacoTypeNames, constraintToFacePairs, emptyCategoryObject } from './general.js';
import { uniqueElements } from '../general/array.js';

const buildRuleAndLookup = (type, constraint, ...orders) => {
	const flipFacePairOrder = { 0: 0, 1: 2, 2: 1 };
	const facePairsArray = constraintToFacePairs[type](constraint);
	const flipped = facePairsArray.map(pair => pair[1] < pair[0]);
	const facePairs = facePairsArray.map((pair, i) => (flipped[i]
		? `${pair[1]} ${pair[0]}`
		: `${pair[0]} ${pair[1]}`));
	const key = facePairs
		.map(facePair => orders.find(o => o[facePair]))
		.map((order, i) => (order === undefined ? 0 : order[facePairs[i]]))
		.map((value, i) => (flipped[i] ? flipFacePairOrder[value] : value))
		.join("");
	if (table[type][key] === true || table[type][key] === false) {
		return table[type][key];
	}
	const [pairIndex, suggestedOrder] = table[type][key];
	const facePair = facePairs[pairIndex];
	const order = flipped[pairIndex]
		? flipFacePairOrder[suggestedOrder]
		: suggestedOrder;
	return [facePair, order];
};
const getConstraintIndicesFromFacePairs = (
	constraints,
	lookup,
	facePairsSubsetArray,
) => {
	const constraintIndices = emptyCategoryObject();
	tacoTypeNames.forEach(type => {
		const constraintIndicesWithDups = facePairsSubsetArray
			.flatMap(facePair => lookup[type][facePair]);
		constraintIndices[type] = uniqueElements(constraintIndicesWithDups)
			.filter(i => constraints[type][i]);
	});
	return constraintIndices;
};
const propagate = (
	constraints,
	constraintsLookup,
	initiallyModifiedFacePairs,
	...orders
) => {
	let modifiedFacePairs = initiallyModifiedFacePairs;
	const newOrders = {};
	do {
		const modifiedConstraintIndices = getConstraintIndicesFromFacePairs(
			constraints,
			constraintsLookup,
			modifiedFacePairs,
		);
		const roundModificationsFacePairs = {};
		for (let t = 0; t < tacoTypeNames.length; t += 1) {
			const type = tacoTypeNames[t];
			const indices = modifiedConstraintIndices[type];
			for (let i = 0; i < indices.length; i += 1) {
				const lookupResult = buildRuleAndLookup(
					type,
					constraints[type][indices[i]],
					...orders,
					newOrders,
				);
				if (lookupResult === true) { continue; }
				if (lookupResult === false) {
					throw new Error(`invalid ${type} ${indices[i]}:${constraints[type][indices[i]]}`);
				}
				if (newOrders[lookupResult[0]]) {
					if (newOrders[lookupResult[0]] !== lookupResult[1]) {
						throw new Error(`conflict ${type} ${indices[i]}:${constraints[type][indices[i]]}`);
					}
				} else {
					const [key, value] = lookupResult;
					roundModificationsFacePairs[key] = true;
					newOrders[lookupResult[0]] = value;
				}
			}
		}
		modifiedFacePairs = Object.keys(roundModificationsFacePairs);
	} while (modifiedFacePairs.length);
	return newOrders;
};

export { propagate };
