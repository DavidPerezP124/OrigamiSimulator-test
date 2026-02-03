/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as objToFold from './objToFold.js';
import * as opxToFold from './opxToFold.js';
import * as svgToFold from './svgToFold.js';
import * as foldToSvg from './foldToSvg.js';
import * as foldToObj from './foldToObj.js';
import * as dom from './general/dom.js';
import * as options from './general/options.js';
import * as planarize from './general/planarize.js';
import * as svg from './general/svg.js';
import svg$1 from './svg/index.js';

const convert = {
	...objToFold,
	...opxToFold,
	...svgToFold,
	...foldToSvg,
	...foldToObj,
	...dom,
	...options,
	...planarize,
	...svg,
	...svg$1,
};

export { convert as default };
