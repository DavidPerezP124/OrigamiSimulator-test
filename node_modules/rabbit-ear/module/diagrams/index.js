/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as arrows from './arrows.js';
import * as axiomArrows from './axiomArrows.js';

const diagram = {
	...arrows,
	...axiomArrows,
};

export { diagram as default };
