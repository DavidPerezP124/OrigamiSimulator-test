/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import RabbitEarWindow from '../../environment/window.js';
import { getRootParent } from '../../svg/general/dom.js';

const parseCSSStyleSheet = (sheet) => {
	if (!sheet.cssRules) { return {}; }
	const stylesheets = {};
	for (let i = 0; i < sheet.cssRules.length; i += 1) {
		const cssRules = sheet.cssRules[i];
		if (cssRules.constructor.name !== "CSSStyleRule") { continue; }
		const cssStyleRule = cssRules;
		const selectorList = cssStyleRule.selectorText
			.split(/,/gm)
			.filter(Boolean)
			.map(str => str.trim());
		const style = {};
		Object.values(cssStyleRule.style)
			.forEach(key => { style[key] = cssStyleRule.style[key]; });
		selectorList.forEach(selector => {
			stylesheets[selector] = style;
		});
	}
	return stylesheets;
};
const parseStyleElement = (style) => {
	const styleSheet = "sheet" in style ? style.sheet : undefined;
	if (styleSheet) { return parseCSSStyleSheet(styleSheet); }
	const rootParent = getRootParent(style);
	const isHTMLBound = rootParent.constructor === RabbitEarWindow().HTMLDocument;
	if (!isHTMLBound) {
		const prevParent = style.parentNode;
		if (prevParent != null) {
			prevParent.removeChild(style);
		}
		const body = RabbitEarWindow().document.body != null
			? RabbitEarWindow().document.body
			: RabbitEarWindow().document.createElement("body");
		body.appendChild(style);
		const parsedStyle = parseCSSStyleSheet(styleSheet);
		body.removeChild(style);
		if (prevParent != null) {
			prevParent.appendChild(style);
		}
		return parsedStyle;
	}
	return [];
};
const getStylesheetStyle = (key, nodeName, attributes, sheets = []) => {
	const classes = attributes.class
		? attributes.class
			.split(/\s/)
			.filter(Boolean)
			.map(i => i.trim())
			.map(str => `.${str}`)
		: [];
	const id = attributes.id
		? `#${attributes.id}`
		: null;
	if (id) {
		for (let s = 0; s < sheets.length; s += 1) {
			if (sheets[s][id] && sheets[s][id][key]) {
				return sheets[s][id][key];
			}
		}
	}
	for (let s = 0; s < sheets.length; s += 1) {
		for (let c = 0; c < classes.length; c += 1) {
			if (sheets[s][classes[c]] && sheets[s][classes[c]][key]) {
				return sheets[s][classes[c]][key];
			}
		}
		if (sheets[s][nodeName] && sheets[s][nodeName][key]) {
			return sheets[s][nodeName][key];
		}
	}
	return undefined;
};

export { getStylesheetStyle, parseCSSStyleSheet, parseStyleElement };
