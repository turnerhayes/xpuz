const MutablePUZParser = require("../../parsers/puz");
const Utils = require("../utils");

class PUZParser extends MutablePUZParser {
	parse(...args) {
		return super.parse(...args).then(
			Utils.toImmutable
		);
	}

	generate(puzzle) {
		return super.generate(Utils.toMutable(puzzle));
	}
}

module.exports = PUZParser;
