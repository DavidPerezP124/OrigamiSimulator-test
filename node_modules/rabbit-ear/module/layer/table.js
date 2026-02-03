/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const taco_taco_valid_states = [
	"111112",
	"111121",
	"111222",
	"112111",
	"121112",
	"121222",
	"122111",
	"122212",
	"211121",
	"211222",
	"212111",
	"212221",
	"221222",
	"222111",
	"222212",
	"222221",
];
const taco_tortilla_valid_states = ["112", "121", "212", "221"];
const tortilla_tortilla_valid_states = ["11", "22"];
const transitivity_valid_states = [
	"112",
	"121",
	"122",
	"211",
	"212",
	"221",
];
const setState = (states, t, key) => {
	const characters = Array.from(key).map(char => parseInt(char, 10));
	if (characters.filter(x => x === 0).length !== t) { return; }
	states[t][key] = false;
	const modifications = [];
	for (let i = 0; i < characters.length; i += 1) {
		const roundModifications = [];
		if (characters[i] !== 0) { continue; }
		for (let x = 1; x <= 2; x += 1) {
			characters[i] = x;
			if (states[t - 1][characters.join("")] !== false) {
				roundModifications.push([i, x]);
			}
		}
		characters[i] = 0;
		if (roundModifications.length) {
			states[t][key] = true;
		}
		if (roundModifications.length === 1) {
			modifications.push(roundModifications[0]);
		}
	}
	if (modifications.length) {
		states[t][key] = [modifications[0][0], modifications[0][1]];
	}
};
const makeLookupEntry = (valid_states) => {
	const chooseCount = valid_states[0].length;
	const states = Array
		.from(Array(chooseCount + 1))
		.map(() => ({}));
	Array.from(Array(2 ** chooseCount))
		.map((_, i) => i.toString(2))
		.map(str => Array.from(str).map(n => parseInt(n, 10) + 1).join(""))
		.map(str => (`11111${str}`).slice(-chooseCount))
		.forEach(key => { states[0][key] = false; });
	valid_states.forEach(s => { states[0][s] = true; });
	Array.from(Array(chooseCount))
		.map((_, i) => i + 1)
		.map(t => Array.from(Array(3 ** chooseCount))
			.map((_, i) => i.toString(3))
			.map(str => (`000000${str}`).slice(-chooseCount))
			.forEach(key => setState(states, t, key)));
	const lookup = states.reduce((a, b) => ({ ...a, ...b }));
	Object.keys(lookup)
		.filter(key => typeof lookup[key] === "object")
		.forEach(key => { lookup[key] = Object.freeze(lookup[key]); });
	return Object.freeze(lookup);
};
const table = {
	taco_taco: makeLookupEntry(taco_taco_valid_states),
	taco_tortilla: makeLookupEntry(taco_tortilla_valid_states),
	tortilla_tortilla: makeLookupEntry(tortilla_tortilla_valid_states),
	transitivity: makeLookupEntry(transitivity_valid_states),
};

export { table };
