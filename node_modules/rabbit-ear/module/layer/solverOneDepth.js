/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import Messages from '../environment/messages.js';
import { propagate } from './propagate.js';
import { getBranches } from './getBranches.js';

const solveBranch = (
	constraints,
	lookup,
	unsolvedKeys,
	...orders
) => {
	if (!unsolvedKeys.length) { return []; }
	const guessKey = unsolvedKeys[0];
	const tryPropagate = (guessValue) => {
		const guess = { [guessKey]: guessValue };
		try {
			const result = propagate(constraints, lookup, [guessKey], ...orders, guess);
			return Object.assign(result, guess);
		} catch (error) { return undefined; }
	};
	const guessResults = [1, 2]
		.map(tryPropagate)
		.filter(a => a !== undefined);
	const resultCount = guessResults
		.map(result => Object.keys(result).length);
	const completed = guessResults
		.filter((_, i) => resultCount[i] === unsolvedKeys.length);
	const unfinished = guessResults
		.filter((_, i) => resultCount[i] !== unsolvedKeys.length);
	const recursed = unfinished
		.map(order => solveBranch(
			constraints,
			lookup,
			unsolvedKeys.filter(key => !(key in order)),
			...orders,
			order,
		));
	return completed
		.map(order => [...orders, order])
		.concat(...recursed);
};
const solver = ({ constraints, lookup, facePairs, orders }) => {
	let initialResult;
	try {
		initialResult = propagate(constraints, lookup, Object.keys(orders), orders);
	} catch (error) {
		throw new Error(Messages.noLayerSolution, { cause: error });
	}
	const remainingKeys = facePairs
		.filter(key => !(key in orders))
		.filter(key => !(key in initialResult));
	let branchResults;
	try {
		branchResults = getBranches(remainingKeys, constraints, lookup)
			.map(unsolvedKeys => solveBranch(
				constraints,
				lookup,
				unsolvedKeys,
				orders,
				initialResult,
			));
	} catch (error) {
		throw new Error(Messages.noLayerSolution, { cause: error });
	}
	const root = { ...orders, ...initialResult };
	branchResults
		.forEach(branch => branch
			.forEach(solution => solution.splice(0, 2)));
	const branches = branchResults
		.map(branch => branch
			.map(solution => Object.assign({}, ...solution)));
	return { root, branches };
};

export { solver };
