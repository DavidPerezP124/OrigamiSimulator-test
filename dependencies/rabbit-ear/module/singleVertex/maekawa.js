/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { assignmentIsBoundary } from '../fold/spec.js';

const getUnassignedIndices = (edges_assignment) => edges_assignment
	.map((_, i) => i)
	.filter(i => edges_assignment[i] === "U" || edges_assignment[i] === "u");
const maekawaSolver = (vertices_edgesAssignments) => {
	const unassigneds = getUnassignedIndices(vertices_edgesAssignments);
	const permuts = Array.from(Array(2 ** unassigneds.length))
		.map((_, i) => i.toString(2))
		.map(l => Array(unassigneds.length - l.length + 1).join("0") + l)
		.map(str => Array.from(str).map(l => (l === "0" ? "V" : "M")));
	const all = permuts.map(perm => {
		const array = vertices_edgesAssignments.slice();
		unassigneds.forEach((index, i) => { array[index] = perm[i]; });
		return array;
	});
	const boundaryCount = vertices_edgesAssignments
		.filter(a => assignmentIsBoundary[a])
		.length;
	if (boundaryCount > 0) { return all; }
	const count_m = all.map(a => a.filter(l => l === "M" || l === "m").length);
	const count_v = all.map(a => a.filter(l => l === "V" || l === "v").length);
	return all.filter((_, i) => Math.abs(count_m[i] - count_v[i]) === 2);
};

export { maekawaSolver };
