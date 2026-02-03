/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const makePermutations = (...counts) => {
	const totalLength = counts.reduce((a, b) => a * b, 1);
	const maxPlace = counts.slice();
	for (let i = maxPlace.length - 2; i >= 0; i -= 1) {
		maxPlace[i] *= maxPlace[i + 1];
	}
	maxPlace.push(1);
	maxPlace.shift();
	return Array.from(Array(totalLength))
		.map((_, i) => counts
			.map((c, j) => Math.floor(i / maxPlace[j]) % c));
};
const getBranchCount = ({ branches }) => {
	if (!branches) { return "leaf"; }
	return branches.map(choices => ({
		choices: choices.length,
		branches: choices.flatMap(getBranchCount),
	}));
};
const getBranchStructure = ({ branches }) => {
	if (branches === undefined) { return []; }
	return branches.map(branch => branch.map(getBranchStructure));
};
const getBranchLeafStructure = ({ branches }) => {
	if (branches === undefined) { return "leaf"; }
	return branches.map(branch => branch.map(getBranchLeafStructure));
};
const gather = ({ orders, branches }, pattern = []) => [
	orders,
	...(branches || []).flatMap(branch => gather(branch[pattern.shift() || 0], pattern)),
];
const compile = ({ orders, branches }, pattern) => (
	gather({ orders, branches }, pattern).flat()
);
const gatherAll = ({ orders, branches }) => {
	if (!branches) { return [[orders]]; }
	const branchResults = branches.map(andItem => andItem.flatMap(gatherAll));
	return makePermutations(...branchResults.map(arr => arr.length))
		.map(indices => indices
			.flatMap((index, i) => branchResults[i][index]))
		.map(solution => [orders, ...solution]);
};
const compileAll = ({ orders, branches }) => (
	gatherAll({ orders, branches }).map(arr => arr.flat())
);
const LayerPrototype = {
	count: function () {
		return getBranchCount(this);
	},
	structure: function () {
		return getBranchStructure(this);
	},
	leaves: function () {
		return getBranchLeafStructure(this);
	},
	gather: function (...pattern) {
		return gather(this, pattern);
	},
	gatherAll: function () {
		return gatherAll(this);
	},
	compile: function (...pattern) {
		return compile(this, pattern);
	},
	compileAll: function () {
		return compileAll(this);
	},
	faceOrders: function (...pattern) {
		return compile(this, pattern);
	},
};

export { LayerPrototype, compile, compileAll, gather, gatherAll, getBranchStructure };
