/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const ordersTest = (orders, name = "orders") => {
	const sameFaceOrders = orders
		.map(([a, b], i) => (a === b ? [a, b, i] : undefined))
		.filter(a => a !== undefined)
		.map(([a, b, i]) => `${name} between the same face ${a}, ${b} at index ${i}`);
	const pairHash = {};
	const duplicateOrders = orders
		.filter(([a, b]) => {
			const key = a < b ? `${a} ${b}` : `${b} ${a}`;
			const isDuplicate = pairHash[key] === true;
			pairHash[key] = true;
			return isDuplicate;
		})
		.map(([a, b]) => `${name} duplicate orders found at indices ${a}, ${b}`);
	return sameFaceOrders.concat(duplicateOrders);
};
const validateOrders = (graph) => {
	const ordersErrors = [];
	if (graph.faceOrders) {
		ordersErrors.push(...ordersTest(graph.faceOrders, "faceOrders"));
	}
	if (graph.edgeOrders) {
		ordersErrors.push(...ordersTest(graph.edgeOrders, "edgeOrders"));
	}
	return ordersErrors;
};

export { validateOrders };
