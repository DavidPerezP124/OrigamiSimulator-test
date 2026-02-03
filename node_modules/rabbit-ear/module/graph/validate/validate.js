/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { validateTypes } from './validateTypes.js';
import { validateReferences } from './validateReferences.js';
import { validateReflexive } from './validateReflexive.js';
import { validateWinding } from './validateWinding.js';
import { validateAssignments } from './validateAssignments.js';
import { validateOrders } from './validateOrders.js';

const validate = (graph) => (validateTypes(graph)
	.concat(validateReferences(graph))
	.concat(validateReflexive(graph))
	.concat(validateWinding(graph))
	.concat(validateAssignments(graph))
	.concat(validateOrders(graph))
);

export { validate };
