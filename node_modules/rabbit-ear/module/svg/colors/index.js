/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import cssColors from './cssColors.js';
import * as convert from './convert.js';
import * as parseColor from './parseColor.js';

const colors = {
	cssColors,
	...convert,
	...parseColor,
};

export { colors as default };
