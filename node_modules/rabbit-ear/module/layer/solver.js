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
	return guessResults.map(order => (
		Object.keys(order).length === unsolvedKeys.length
			? { orders: order }
			: {
				orders: order,
				branches: getBranches(
					unsolvedKeys.filter(key => !(key in order)),
					constraints,
					lookup,
				).map(branchUnsolvedKeys => solveBranch(
					constraints,
					lookup,
					branchUnsolvedKeys,
					...orders,
					order,
				)),
			}));
};
const solver = ({ constraints, lookup, facePairs, orders }) => {
	let initialResult;
	try {
		initialResult = propagate(constraints, lookup, Object.keys(orders), orders);
	} catch (error) {
		throw new Error(Messages.noLayerSolution, { cause: error });
	}
	const rootOrders = { ...orders, ...initialResult };
	const remainingKeys = facePairs.filter(key => !(key in rootOrders));
	try {
		return remainingKeys.length === 0
			? { orders: rootOrders }
			: {
				orders: rootOrders,
				branches: getBranches(remainingKeys, constraints, lookup)
					.map(unsolvedKeys => solveBranch(
						constraints,
						lookup,
						unsolvedKeys,
						orders,
						initialResult,
					)),
			};
	} catch (error) {
		throw new Error(Messages.noLayerSolution, { cause: error });
	}
};

export { solver };
