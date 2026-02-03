/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const tacoTypeNames = [
	"taco_taco",
	"taco_tortilla",
	"tortilla_tortilla",
	"transitivity",
];
const emptyCategoryObject = () => ({
	taco_taco: undefined,
	taco_tortilla: undefined,
	tortilla_tortilla: undefined,
	transitivity: undefined,
});
const constraintToFacePairs = ({
	taco_taco: f => [
		[f[0], f[2]],
		[f[1], f[3]],
		[f[1], f[2]],
		[f[0], f[3]],
		[f[0], f[1]],
		[f[2], f[3]],
	],
	taco_tortilla: f => [[f[0], f[2]], [f[0], f[1]], [f[1], f[2]]],
	tortilla_tortilla: f => [[f[0], f[2]], [f[1], f[3]]],
	transitivity: f => [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]],
});
const sortedPairString = pair => (pair[0] < pair[1]
	? `${pair[0]} ${pair[1]}`
	: `${pair[1]} ${pair[0]}`);
const constraintToFacePairsStrings = ({
	taco_taco: f => [
		sortedPairString([f[0], f[2]]),
		sortedPairString([f[1], f[3]]),
		sortedPairString([f[1], f[2]]),
		sortedPairString([f[0], f[3]]),
		sortedPairString([f[0], f[1]]),
		sortedPairString([f[2], f[3]]),
	],
	taco_tortilla: f => [
		sortedPairString([f[0], f[2]]),
		sortedPairString([f[0], f[1]]),
		sortedPairString([f[1], f[2]]),
	],
	tortilla_tortilla: f => [
		sortedPairString([f[0], f[2]]),
		sortedPairString([f[1], f[3]]),
	],
	transitivity: f => [
		sortedPairString([f[0], f[1]]),
		sortedPairString([f[1], f[2]]),
		sortedPairString([f[2], f[0]]),
	],
});
const signedLayerSolverValue = { 0: 0, 1: 1, 2: -1 };
const solverSolutionToFaceOrders = (facePairOrders, faces_winding) => {
	const keys = Object.keys(facePairOrders);
	const faceOrdersPairs = keys
		.map(string => string.split(" ").map(n => parseInt(n, 10)));
	const solutions = faceOrdersPairs.map((faces, i) => {
		const value = signedLayerSolverValue[facePairOrders[keys[i]]];
		const side = (!faces_winding[faces[1]]) ? -value : value;
		return side;
	});
	return faceOrdersPairs.map(([a, b], i) => [a, b, solutions[i]]);
};
const mergeWithoutOverwrite = (orders) => {
	const result = {};
	orders.forEach(order => Object.keys(order).forEach(key => {
		if (result[key] !== undefined && result[key] !== order[key]) {
			throw new Error(`two competing results: ${result[key]}, ${order[key]}, for "${key}"`);
		}
		result[key] = order[key];
	}));
	return result;
};

export { constraintToFacePairs, constraintToFacePairsStrings, emptyCategoryObject, mergeWithoutOverwrite, solverSolutionToFaceOrders, tacoTypeNames };
