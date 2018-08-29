const MutableJPZParser = require("../../parsers/jpz");
const Utils = require("../utils");

class JPZParser extends MutableJPZParser {
	parse(...args) {
		return super.parse(...args).then(
			Utils.toImmutable
		);
	}

	generate(puzzle) {
		return super.generate(Utils.toMutable(puzzle));
	}
}

module.exports = JPZParser;
