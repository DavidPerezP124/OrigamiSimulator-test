/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const solveFlatAdjacentEdges = (
	{ edges_faces, edges_assignment },
	faces_winding,
) => {
	const flipCondition = { 0: 0, 1: 2, 2: 1 };
	const assignmentOrder = { M: 1, m: 1, V: 2, v: 2 };
	const solution = {};
	edges_faces.forEach((faces, edge) => {
		const assignment = edges_assignment[edge];
		const localOrder = assignmentOrder[assignment];
		if (faces.length !== 2 || localOrder === undefined) { return; }
		const upright = faces_winding[faces[0]];
		const globalOrder = upright
			? localOrder
			: flipCondition[localOrder];
		const inOrder = faces[0] < faces[1];
		const key = inOrder ? faces.join(" ") : faces.slice().reverse().join(" ");
		const value = inOrder ? globalOrder : flipCondition[globalOrder];
		solution[key] = value;
	});
	return solution;
};

export { solveFlatAdjacentEdges };
