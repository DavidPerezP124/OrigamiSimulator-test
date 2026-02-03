/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const oddAssignmentIndex = (assignments) => (
	assignments.filter(a => a === "M").length
	> assignments.filter(a => a === "V").length
		? assignments.indexOf("V")
		: assignments.indexOf("M")
);
const foldDegree4 = (sectors, assignments, foldAngle = 0) => {
	const odd = oddAssignmentIndex(assignments.map(a => a.toUpperCase()));
	if (odd === -1) { return undefined; }
	const a = sectors[(odd + 1) % sectors.length];
	const b = sectors[(odd + 2) % sectors.length];
	const pbc = Math.max(-Math.PI, Math.min(Math.PI, foldAngle));
	const cosE = -Math.cos(a) * Math.cos(b)
		+ Math.sin(a) * Math.sin(b) * Math.cos(Math.PI - pbc);
	const res = Math.cos(Math.PI - pbc)
		- ((Math.sin(Math.PI - pbc) ** 2) * Math.sin(a) * Math.sin(b))
		/ (1 - cosE);
	const pab = -Math.acos(res) + Math.PI;
	return (odd % 2 === 0
		? [pab, pbc, pab, pbc].map((n, i) => (odd === i ? -n : n))
		: [pbc, pab, pbc, pab].map((n, i) => (odd === i ? -n : n)));
};

export { foldDegree4 };
