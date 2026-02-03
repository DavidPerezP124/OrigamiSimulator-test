/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import general from './general/index.js';
import foldedForm from './foldedForm/index.js';
import creasePattern from './creasePattern/index.js';

const webgl = {
	...general,
	...foldedForm,
	...creasePattern,
};

export { webgl as default };
