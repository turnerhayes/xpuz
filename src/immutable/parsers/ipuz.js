const MutableIPUZParser = require("../../parsers/ipuz");
const Utils = require("../utils");

class IPUZParser extends MutableIPUZParser {
	parse(...args) {
		return super.parse(...args).then(
			Utils.toImmutable
		);
	}

	generate(puzzle) {
		return super.generate(Utils.toMutable(puzzle));
	}
}

module.exports = IPUZParser;
