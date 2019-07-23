function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var reduce = require("lodash/reduce");
var isEqual = require("lodash/isEqual");
var PuzzleMixin = require("./puzzle-mixin");

/**
 * Info object
 *
 * @typedef PuzzleInfo
 *
 * @memberof xpuz.Puzzle
 *
 * @prop {?string} title - the title of the puzzle
 * @prop {?string} author - the author of the puzzle
 * @prop {?string} publisher - the publisher of the puzzle
 * @prop {?string} copyright - the copyright of the puzzle
 * @prop {?string} intro - the introductory text of the puzzle
 * @prop {?*} difficulty - the difficulty level of the puzzle
 * @prop {?object} formatExtra - any extra data for a specific file format
 * (e.g. .puz files have a version string)
 */

/**
 * Represents a puzzle object
 *
 * @memberof xpuz
 * @mixes xpuz.PuzzleMixin
 */

var Puzzle =
/**
 * @param {object} args - the constructor args
 * @param {Types.Grid} args.grid - a two-dimensional array representing the puzzle grid
 * @param {{across: object<number, string>, down: object<number, string>}} args.clues - a list of clues
 *	for across and down, with each collection having the key as the clue number and the value as the clue
 *	text (e.g. `{across: { 3: "some clue" }}`)
 * @param {Array<Array<?string>>} [args.userSolution] - the currently filled in guesses of the user stored with this
 *	puzzle instance. Two dimensional array with the same dimensions as `grid`, where each cell is either a string
 *	or `null` (for block cells)
 * @param {xpuz.Puzzle.PuzzleInfo} [args.info] - information about the puzzle
 * @param {object} [args.extensions] - extra, possibly implementation-specific information about the puzzle, such as timer
 *	information
 */
function Puzzle(_ref) {
	var _this = this;

	var grid = _ref.grid,
	    clues = _ref.clues,
	    userSolution = _ref.userSolution,
	    info = _ref.info,
	    extensions = _ref.extensions;

	_classCallCheck(this, Puzzle);

	this.toJSON = function () {
		return {
			grid: _this.grid,
			clues: _this.clues,
			userSolution: _this.userSolution,
			info: _this.info,
			extensions: _this.extensions
		};
	};

	this.clone = function () {
		return new Puzzle({
			grid: _this.grid.map(function (row) {
				return row.map(function (cell) {
					return Object.assign({}, cell);
				} // Clone (shallow) cell object
				);
			}),
			clues: {
				across: reduce(_this.clues.across, function (cloned, clue, clueNumber) {
					cloned[clueNumber] = clue;

					return cloned;
				}, {}),
				down: reduce(_this.clues.down, function (cloned, clue, clueNumber) {
					cloned[clueNumber] = clue;

					return cloned;
				}, {})
			},
			userSolution: _this.userSolution.map(function (row) {
				return row.map(function (cell) {
					return cell;
				} // Values in userSolution are just strings
				);
			}),
			info: Object.assign({}, _this.info),
			extensions: JSON.parse(JSON.stringify(_this.extensions)) // Deep clone
		});
	};

	/**
  * The definition of the puzzle grid. It is represented as an array of rows, so
  *	`grid[0]` is the first row of the puzzle.
  *
  * @type Array<Array<Types.GridCell>>
  * @instance
  */
	this.grid = Puzzle.processGrid(grid || []); // processGrid() is defined in PuzzleMixin

	/**
  * Listing of clues for the puzzle
  *
  * @type object
  * @instance
  *
  * @property {object} across - an object mapping clue numbers to clue texts for across clues
  * @property {object} down - an object mapping clue numbers to clue texts for down clues
  */
	this.clues = clues || {
		across: {},
		down: {}
	};

	info = info || {};

	/**
  * An object of various puzzle information, such as author, title, copyright, etc.
  *
  * @type object
  * @instance
  *
  * @property {string} [title] - the title of the puzzle
  * @property {string} [author] - the author of the puzzle
  * @property {string} [publisher] - the publisher of the puzzle
  * @property {string} [copyright] - the copyright text of the puzzle
  * @property {*} [difficulty] - the difficulty level of the puzzle
  * @property {string} [intro] - the introductory text of the puzzle
  * @property {?object} [formatExtra] - any additional format-specific data
  */
	this.info = {
		title: info.title || "",
		author: info.author || "",
		copyright: info.copyright || "",
		publisher: info.publisher || "",
		difficulty: info.difficulty || "",
		intro: info.intro || "",
		formatExtra: info.formatExtra || void 0
	};

	/**
  * A structure representing the current solution as the user has filled it out.
  *	The structure is similar to {@link xpuz.Puzzle#grid|grid}, but
  *	each item is a string containing the user's current answer--an empty string
  *	if the corresponding grid cell is not filled in, a non-empty string if it's
  *	filled in.
  *
  * @type Array<string[]>
  * @instance
  */
	this.userSolution = userSolution || grid.map(function (row) {
		return row.map(function (cell) {
			return cell.isBlockCell ? null : "";
		});
	});

	/**
  * A collection of extra, possibly implementation-dependent data about the puzzle,
  * such as timer information.
  *
  * @type object
  * @instance
  */
	this.extensions = extensions || {};
}

/**
 * Returns this puzzle as a plain Javascript object, suitable for serializing to JSON.
 *
 * @method
 *
 * @returns {object} object representation of this puzzle object
 */


/**
 * Returns a deep copy of this puzzle.
 *
 * @method
 *
 * @returns {xpuz.Puzzle} cloned Puzzle
 */
;

PuzzleMixin({
	constructor: Puzzle,
	equalityTest: isEqual
});

exports = module.exports = Puzzle;
//# sourceMappingURL=puzzle.js.map