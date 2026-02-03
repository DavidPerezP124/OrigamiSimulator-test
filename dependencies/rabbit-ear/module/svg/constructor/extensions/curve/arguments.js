/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import makeCoordinates from '../../../arguments/makeCoordinates.js';
import makeCurvePath from './makeCurvePath.js';

const curveArguments = (...args) => [
	makeCurvePath(makeCoordinates(...args.flat())),
];

export { curveArguments as default };
