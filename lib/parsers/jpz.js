var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * JPZ Parser
 *
 * @description Parses .jpz formatted puzzles (NOT CURRENTLY IMPLEMENTED)
 * @module xpuz/parsers/jpz
 */

var isString = require("lodash/isString");
var isObject = require("lodash/isObject");
var Promise = require("bluebird");
var fs = require("fs");
// fs is stubbed out for browser builds
var readFile = fs.readFile ? Promise.promisify(fs.readFile) : function () {};
var Puzzle = require("../puzzle");

function _parsePuzzle(puzzle) {
	return new Promise(function (resolve, reject) {
		if (isString(puzzle)) {
			// path to puzzle
			return readFile(puzzle).then(function (fileContent) {
				return resolve(new Puzzle(fileContent.toString()));
			}).catch(function (ex) {
				reject(new Error("Unable to read JPZ puzzle from file " + puzzle + ": " + ex.message));
			});
		} else if (isObject(puzzle)) {
			return resolve(new Puzzle(puzzle));
		} else {
			return reject(new Error("parse() expects either a path string or an object"));
		}
	});
}

/**
 * JPZ parser class
 */

var JPZParser = function () {
	function JPZParser() {
		_classCallCheck(this, JPZParser);
	}

	_createClass(JPZParser, [{
		key: "parse",

		/**
   * Parses a {@link module:xpuz/puzzle~Puzzle} from the input
   *
   * @param {string|object} puzzle - the source to parse the puzzle from; if a string,
   *	it is assumed to be a file path, if an object, it defines a Puzzle object
   *
   * @return {external:Promise<module:xpuz/puzzle~Puzzle>} a promise that resolves with
   *	the parsed puzzle object
   */
		value: function parse(puzzle) {
			return _parsePuzzle(puzzle);
		}
	}]);

	return JPZParser;
}();

exports = module.exports = JPZParser;
//# sourceMappingURL=jpz.js.map