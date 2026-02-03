/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as axioms from './axioms.js';
import * as boundary from './boundary.js';
import * as validate from './validate.js';

const axiom = {
	...axioms,
	...boundary,
	...validate,
};

export { axiom as default };
