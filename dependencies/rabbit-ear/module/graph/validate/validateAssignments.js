/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { assignmentFlatFoldAngle } from '../../fold/spec.js';

const assignmentsAndFoldAngleMatch = ({ edges_assignment, edges_foldAngle }) => {
	const angleSign = edges_foldAngle
		.map(Math.sign);
	const assignmentSign = edges_assignment
		.map(assign => assignmentFlatFoldAngle[assign])
		.map(Math.sign);
	return assignmentSign
		.map((s, i) => (s === angleSign[i]
			? undefined
			: `assignment does not match fold angle at ${i}: ${edges_assignment[i]}, ${edges_foldAngle[i]}`))
		.filter(a => a !== undefined);
};
const validateAssignments = (graph) => {
	const assignmentErrors = [];
	if (graph.edges_assignment && graph.edges_foldAngle) {
		assignmentErrors.push(...assignmentsAndFoldAngleMatch(graph));
	}
	return assignmentErrors;
};

export { validateAssignments };
