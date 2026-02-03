/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { normalAxiom1, axiom1, normalAxiom2, axiom2, normalAxiom3, axiom3, normalAxiom4, axiom4, normalAxiom5, axiom5, normalAxiom6, axiom6, normalAxiom7, axiom7 } from './axioms.js';
import { validateAxiom1And2, validateAxiom3, validateAxiom4, validateAxiom5, validateAxiom6, validateAxiom7 } from './validate.js';
import { uniqueLineToVecLine } from '../math/convert.js';

const normalAxiom1InPolygon = (polygon, point1, point2) => {
	const isValid = validateAxiom1And2(polygon, point1, point2);
	return normalAxiom1(point1, point2).filter((_, i) => isValid[i]);
};
const axiom1InPolygon = (polygon, point1, point2) => {
	const isValid = validateAxiom1And2(polygon, point1, point2);
	return axiom1(point1, point2).filter((_, i) => isValid[i]);
};
const normalAxiom2InPolygon = (polygon, point1, point2) => {
	const isValid = validateAxiom1And2(polygon, point1, point2);
	return normalAxiom2(point1, point2).filter((_, i) => isValid[i]);
};
const axiom2InPolygon = (polygon, point1, point2) => {
	const isValid = validateAxiom1And2(polygon, point1, point2);
	return axiom2(point1, point2).filter((_, i) => isValid[i]);
};
const normalAxiom3InPolygon = (polygon, line1, line2) => {
	const solutions = normalAxiom3(line1, line2);
	const isValid = validateAxiom3(
		polygon,
		solutions.map(uniqueLineToVecLine),
		uniqueLineToVecLine(line1),
		uniqueLineToVecLine(line2),
	);
	return solutions.filter((_, i) => isValid[i]);
};
const axiom3InPolygon = (polygon, line1, line2) => {
	const solutions = axiom3(line1, line2);
	const isValid = validateAxiom3(polygon, solutions, line1, line2);
	return solutions.filter((_, i) => isValid[i]);
};
const normalAxiom4InPolygon = (polygon, line, point) => {
	const solutions = normalAxiom4(line, point);
	const isValid = validateAxiom4(
		polygon,
		solutions.map(uniqueLineToVecLine),
		uniqueLineToVecLine(line),
		point,
	);
	return solutions.filter((_, i) => isValid[i]);
};
const axiom4InPolygon = (polygon, line, point) => {
	const solutions = axiom4(line, point);
	const isValid = validateAxiom4(polygon, solutions, line, point);
	return solutions.filter((_, i) => isValid[i]);
};
const normalAxiom5InPolygon = (polygon, line, point1, point2) => {
	const solutions = normalAxiom5(line, point1, point2);
	const isValid = validateAxiom5(
		polygon,
		solutions.map(uniqueLineToVecLine),
		uniqueLineToVecLine(line),
		point1,
		point2,
	);
	return solutions.filter((_, i) => isValid[i]);
};
const axiom5InPolygon = (polygon, line, point1, point2) => {
	const solutions = axiom5(line, point1, point2);
	const isValid = validateAxiom5(polygon, solutions, line, point1, point2);
	return solutions.filter((_, i) => isValid[i]);
};
const normalAxiom6InPolygon = (polygon, line1, line2, point1, point2) => {
	const solutions = normalAxiom6(line1, line2, point1, point2);
	const isValid = validateAxiom6(
		polygon,
		solutions.map(uniqueLineToVecLine),
		uniqueLineToVecLine(line1),
		uniqueLineToVecLine(line2),
		point1,
		point2,
	);
	return solutions.filter((_, i) => isValid[i]);
};
const axiom6InPolygon = (polygon, line1, line2, point1, point2) => {
	const solutions = axiom6(line1, line2, point1, point2);
	const isValid = validateAxiom6(polygon, solutions, line1, line2, point1, point2);
	return solutions.filter((_, i) => isValid[i]);
};
const normalAxiom7InPolygon = (polygon, line1, line2, point) => {
	const solutions = normalAxiom7(line1, line2, point);
	const isValid = validateAxiom7(
		polygon,
		solutions.map(uniqueLineToVecLine),
		uniqueLineToVecLine(line1),
		uniqueLineToVecLine(line2),
		point,
	);
	return solutions.filter((_, i) => isValid[i]);
};
const axiom7InPolygon = (polygon, line1, line2, point) => {
	const solutions = axiom7(line1, line2, point);
	const isValid = validateAxiom7(polygon, solutions, line1, line2, point);
	return solutions.filter((_, i) => isValid[i]);
};

export { axiom1InPolygon, axiom2InPolygon, axiom3InPolygon, axiom4InPolygon, axiom5InPolygon, axiom6InPolygon, axiom7InPolygon, normalAxiom1InPolygon, normalAxiom2InPolygon, normalAxiom3InPolygon, normalAxiom4InPolygon, normalAxiom5InPolygon, normalAxiom6InPolygon, normalAxiom7InPolygon };
