var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * IPUZ file parser.
 *
 * @module xpuz/parsers/ipuz
 */

var Promise = require("bluebird");
var fs = require("fs");
// fs is stubbed out for browser builds
var readFile = fs.readFile ? Promise.promisify(fs.readFile) : function () {};
var max = require("lodash/max");
var get = require("lodash/get");
var isObject = require("lodash/isObject");
var isString = require("lodash/isString");
var reduce = require("lodash/reduce");
var Puzzle = require("../puzzle");

var BLOCK_VALUE = "#";

function _checkDimensions(puzzle) {
	var errors = [];

	var maxCellWidth = max(puzzle.puzzle, "length").length;

	var numRows = puzzle.puzzle.length;

	if (maxCellWidth > puzzle.dimensions.width) {
		errors.push("Too many puzzle cells (" + maxCellWidth + ") for puzzle width (" + puzzle.dimensions.width + ")");
	}

	if (numRows > puzzle.dimensions.height) {
		errors.push("Too many puzzle cells (" + numRows + ") for puzzle height (" + puzzle.dimensions.height + ")");
	}

	return errors;
}

function _getClueNumber(cell) {
	return isObject(cell) ? cell.cell : cell;
}

function _addClue(obj, clue) {
	obj[clue[0]] = clue[1];

	return obj;
}

function _convertPuzzle(ipuz) {
	var puzzle = new Puzzle({
		info: {
			title: ipuz.title,
			author: ipuz.author,
			copyright: ipuz.copyright,
			publisher: ipuz.publisher,
			difficulty: ipuz.difficulty,
			intro: ipuz.intro
		},
		grid: ipuz.puzzle.map(function (row) {
			return row.map(function (cell) {
				if (cell === BLOCK_VALUE) {
					return {
						isBlockCell: true
					};
				}

				return {
					clueNumber: _getClueNumber(cell),
					backgroundShape: get(cell, "style.shapebg")
				};
			});
		}),
		clues: {
			across: reduce(ipuz.clues.across, _addClue, {}),
			down: reduce(ipuz.clues.down, _addClue, {})
		}
	});

	return puzzle;
}

function _validatePuzzle(puzzle) {
	var errors = [];

	if (!puzzle.dimensions) {
		errors.push("Puzzle is missing 'dimensions' key");
	}

	if (puzzle.puzzle) {
		errors.push.apply(errors, _toConsumableArray(_checkDimensions(puzzle)));
	} else {
		errors.push("Puzzle is missing 'puzzle' key");
	}

	return errors.length === 0 ? void 0 : errors;
}

function _parsePuzzle(puzzle) {
	return new Promise(function (resolve, reject) {
		if (isString(puzzle)) {
			// path to puzzle
			return readFile(puzzle).then(function (fileContent) {
				return JSON.parse(fileContent.toString());
			}).then(function (content) {
				return resolve(content);
			}).catch(function (ex) {
				reject(new Error("Unable to read IPUZ puzzle from file " + puzzle + ": " + ex.message));
			});
		} else if (isObject(puzzle)) {
			resolve(puzzle);
			return puzzle;
		} else {
			return reject(new Error("parse() expects either a path string or an object"));
		}
	}).then(function (puzzle) {
		var errors = _validatePuzzle(puzzle);

		if (errors !== void 0) {
			throw new Error("Invalid puzzle:\n\t" + errors.join("\n\t"));
		}

		return _convertPuzzle(puzzle);
	});
}

/**
 * Parser class for IPUZ-formatted puzzles
 */

var IPUZParser = function () {
	function IPUZParser() {
		_classCallCheck(this, IPUZParser);
	}

	_createClass(IPUZParser, [{
		key: "parse",

		/**
   * Parses a {@link module:xpuz/puzzle~Puzzle|Puzzle} from the input.
   *
   * @param {string|object} puzzle - the source to parse the puzzle from; if a string,
   *	it is assumed to be a file path, if an object, it defines a Puzzle object.
   *
   * @returns {module:xpuz/puzzle~Puzzle} the parsed {@link module:xpuz/puzzle~Puzzle|Puzzle} object
   */
		value: function parse(puzzle) {
			return _parsePuzzle(puzzle);
		}
	}]);

	return IPUZParser;
}();

exports = module.exports = IPUZParser;
//# sourceMappingURL=ipuz.js.map