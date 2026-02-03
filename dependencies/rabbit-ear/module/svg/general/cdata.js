/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import RabbitEarWindow from '../environment/window.js';

const makeCDATASection = (text) => (new (RabbitEarWindow()).DOMParser())
	.parseFromString("<root></root>", "text/xml")
	.createCDATASection(text);

export { makeCDATASection };
