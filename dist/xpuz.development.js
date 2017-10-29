(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XPuz = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

/**
 * XPuz index
 *
 * Exports the public API for the XPuz module
 *
 * @memberof xpuz
 */

var Puzzle = require("./lib/puzzle");
var ImmutablePuzzle = require("./lib/immutable-puzzle");

exports = module.exports = {
	/**
  * Puzzle file parser constructors
  *
  * @type object
  * @property {function} IPUZ - .ipuz file parser
  * @property {function} PUZ - .puz file parser
  * @property {function} JPZ - .jpz file parser
  */
	Parsers: {
		IPUZ: require("./parsers/ipuz"),
		PUZ: require("./parsers/puz"),
		JPZ: require("./parsers/jpz")
	},

	/**
  * Puzzle object constructor
  *
  * @type function
  * @see {@link xpuz.Puzzle}
  */
	Puzzle: Puzzle,

	/**
  * ImmutablePuzzle object constructor
  *
  * @type function
  * @see {@link xpuz.ImmutablePuzzle}
  */
	ImmutablePuzzle: ImmutablePuzzle,

	convertPuzzleToImmutablePuzzle: function convertPuzzleToImmutablePuzzle(puzzle) {
		return new ImmutablePuzzle({
			grid: puzzle.grid,
			clues: puzzle.clues,
			userSolution: puzzle.userSolution,
			info: puzzle.info,
			extensions: puzzle.extensions
		});
	},
	convertImmutablePuzzleToPuzzle: function convertImmutablePuzzleToPuzzle(immutablePuzzle) {
		return new Puzzle({
			grid: immutablePuzzle.grid.toJS(),
			clues: immutablePuzzle.clues.toJS(),
			userSolution: immutablePuzzle.userSolution.toJS(),
			info: immutablePuzzle.info.toJS(),
			extensions: immutablePuzzle.extensions.toJS()
		});
	}
};

},{"./lib/immutable-puzzle":2,"./lib/puzzle":4,"./parsers/ipuz":5,"./parsers/jpz":6,"./parsers/puz":7}],2:[function(require,module,exports){
(function (global){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require("immutable"),
    List = _require.List,
    Map = _require.Map,
    Record = _require.Record,
    is = _require.is,
    Collection = _require.Collection,
    fromJS = _require.fromJS;

var PuzzleMixin = require("./puzzle-mixin");

var infoSchema = {
	title: "",
	author: "",
	publisher: "",
	copyright: "",
	difficulty: "",
	intro: ""
};

/// DEBUG
global.__Immutable = require("immutable");

var PuzzleInfo = function (_Record) {
	_inherits(PuzzleInfo, _Record);

	function PuzzleInfo() {
		_classCallCheck(this, PuzzleInfo);

		return _possibleConstructorReturn(this, (PuzzleInfo.__proto__ || Object.getPrototypeOf(PuzzleInfo)).apply(this, arguments));
	}

	return PuzzleInfo;
}(Record(infoSchema, "PuzzleInfo"));

var schema = {
	grid: List(),
	clues: Map({
		across: Map(),
		down: Map()
	}),
	userSolution: List(),
	info: new PuzzleInfo(),
	extensions: Map()
};

/**
 * Represents an immutable version of {@link xpuz.Puzzle|Puzzle}.
 *
 * @extends external:Immutable.Record
 * @memberof xpuz
 *
 * @mixes xpuz.PuzzleMixin
 */

var ImmutablePuzzle = function (_Record2) {
	_inherits(ImmutablePuzzle, _Record2);

	/**
  * @param {object} args - the constructor arguments
  * @param {Types.ImmutableGrid|Types.Grid} args.grid - the grid for the puzzle
  * @param {{across: object, down: object}|external:Immutable.Map<{across: external:Immutable.Map, down: external:Immutable.Map}>} args.clues - the
  *	puzzle clues
  * @param {Array<string[]>|external:Immutable.List<external:Immutable.List<string>>} [args.userSolution] - the guesses that the user
  *	has entered for this puzzle, as a two-dimensional array of array of strings with the same dimensions as the `grid` where
  *	each cell is either a string with the user's input or `null` if it corresponds to a block cell in the grid
  * @param {xpuz.PuzzleInfo|object} [args.info] - information about the puzzle
  * @param {object} [args.extensions] - a store of extra, possibly implementation-dependent information about the puzzle (such as timer information)
  */
	function ImmutablePuzzle(_ref) {
		var grid = _ref.grid,
		    clues = _ref.clues,
		    userSolution = _ref.userSolution,
		    info = _ref.info,
		    extensions = _ref.extensions;

		_classCallCheck(this, ImmutablePuzzle);

		if (!(info instanceof PuzzleInfo)) {
			info = new PuzzleInfo(info);
		}

		grid = ImmutablePuzzle.processGrid(grid ? fromJS(grid) : List());

		var args = {
			info: info,
			grid: grid,
			userSolution: userSolution ? fromJS(userSolution) : grid.map(function (row) {
				return row.map(function (cell) {
					return cell.get("isBlockCell") ? null : "";
				});
			})
		};

		if (clues) {
			args.clues = fromJS(clues);
		}

		if (extensions) {
			args.extensions = fromJS(extensions);
		}

		return _possibleConstructorReturn(this, (ImmutablePuzzle.__proto__ || Object.getPrototypeOf(ImmutablePuzzle)).call(this, args));
	}

	/**
  * The grid for this puzzle
  *
  * @member {Types.ImmutableGrid} grid
  * @instance
  */


	return ImmutablePuzzle;
}(Record(schema, "ImmutablePuzzle"));

PuzzleMixin({
	constructor: ImmutablePuzzle,
	equalityTest: is,
	getter: function getter(obj, path) {
		return obj.getIn(path);
	},
	setter: function setter(obj, path, value) {
		return obj.setIn(path, value instanceof Collection ? value : fromJS(value));
	},
	sizeOf: function sizeOf(obj) {
		return obj.size;
	}
});

var oldProcessGrid = ImmutablePuzzle.processGrid;

ImmutablePuzzle.processGrid = function processGrid(grid) {
	return grid.withMutations(function (gridWithMutations) {
		return oldProcessGrid(gridWithMutations);
	});
};

exports = module.exports = ImmutablePuzzle;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./puzzle-mixin":3,"immutable":undefined}],3:[function(require,module,exports){
"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var hashIt = require("hash-it");
var get = require("lodash/get");
var set = require("lodash/set");
var size = require("lodash/size");

/**
 * Provides common functionality for {@link xpuz.ImmutablePuzzle} and {@link xpuz.Puzzle} classes.
 *
 * @mixin
 * @memberof xpuz
 *
 * @return {void}
 */
function PuzzleMixin(_ref) {
	var _Object$definePropert;

	var constructor = _ref.constructor,
	    equalityTest = _ref.equalityTest,
	    _ref$getter = _ref.getter,
	    getter = _ref$getter === undefined ? get : _ref$getter,
	    _ref$setter = _ref.setter,
	    setter = _ref$setter === undefined ? set : _ref$setter,
	    _ref$sizeOf = _ref.sizeOf,
	    sizeOf = _ref$sizeOf === undefined ? size : _ref$sizeOf;

	var constructorName = constructor.name;

	/**
  * Finds which across and down clues a grid cell is a member of.
  *
  * @private
  *
  * @param {object} args - the function arguments
  * @param {Types.Grid|Types.ImmutableGrid} args.grid - the grid containing the cell
  * @param {number} args.width - the width of the grid (this is here just so that it doesn't have
  *	to calculate it every time this is called)
  * @param {number} args.height - the height of the grid (this is here just so that it doesn't have
  *	to calculate it every time this is called)
  * @param {number} args.rowIndex - the index of the row on which the cell occurs
  * @param {number} args.columnIndex - the index of the column on which the cell occurs
  *
  * @return {{across: ?number, down: ?number}} the clue numbers for the clues that contain this cell
  *	(one or both of `across` and `down` keys may be populated)
  */
	function findContainingClues(_ref2) {
		var grid = _ref2.grid,
		    width = _ref2.width,
		    height = _ref2.height,
		    rowIndex = _ref2.rowIndex,
		    columnIndex = _ref2.columnIndex;

		var containingClues = {};

		var clueNumber = getter(grid, [rowIndex, columnIndex, "clueNumber"]);

		if (clueNumber !== undefined) {
			// This cell is a clue number cell--it defines either
			// its across clue number or its down clue number (or
			// both)

			if (
			// This is either at the left edge of the puzzle or
			// is bounded on the left by a block cell. This clue
			// number defines (at least) the cell's across clue number
			(columnIndex === 0 || getter(grid, [rowIndex, columnIndex - 1, "isBlockCell"])) &&
			// There is at least one fillable cell to the right
			columnIndex < width - 1 && !getter(grid, [rowIndex, columnIndex + 1, "isBlockCell"])) {
				containingClues.across = clueNumber;
			} else if (
			// There is at least one fillable cell below this
			rowIndex < height - 1 && !getter(grid, [rowIndex + 1, columnIndex, "isBlockCell"])) {
				// At least one cell exists to the left of this cell; this
				// is not an across clue number. It must be a down clue number.
				containingClues.down = clueNumber;
			}
		}

		if (!containingClues.across) {
			// Haven't found the across clue number yet.
			// Look to the left until we find a block cell or the edge of
			// the puzzle
			if (
			// At the left edge of the puzzle and there's a clue number
			columnIndex === 0 && clueNumber !== undefined &&
			// There is at least one fillable cell to the right
			!getter(grid, [rowIndex, columnIndex + 1, "isBlockCell"])) {
				containingClues.across = clueNumber;
			} else {
				for (var i = columnIndex; i >= 0; i--) {
					if (getter(grid, [rowIndex, i, "isBlockCell"])) {
						break;
					}

					if (
					// There is at least one fillable cell to the right
					i < width - 1 && !getter(grid, [rowIndex, i + 1, "isBlockCell"])) {
						containingClues.across = getter(grid, [rowIndex, i, "clueNumber"]);
					}
				}
			}
		}

		if (!containingClues.down) {
			// Look at cells in other rows at the same index until we find a
			// cell with a clue number
			if (
			// At the top of the puzzle and there is a clue number
			rowIndex === 0 && clueNumber !== undefined &&
			// There is at least one fillable cell below it
			!getter(grid, [rowIndex + 1, columnIndex, "isBlockCell"])) {
				containingClues.down = clueNumber;
			} else {
				for (var _i = rowIndex; _i >= 0; _i--) {
					if (getter(grid, [_i, columnIndex, "isBlockCell"])) {
						break;
					}

					if (
					// There is at least one fillable cell below it
					_i < height - 1 && !getter(grid, [_i + 1, columnIndex, "isBlockCell"])) {
						containingClues.down = getter(grid, [_i, columnIndex, "clueNumber"]);
					}
				}
			}
		}

		return containingClues;
	}

	/**
  * Determines whether a cell in the grid is at the start of a down or across clue (or
  * both), and thus should be given a clue number.
  *
  * @private
  *
  * @param {object} args - the function arguments
  * @param {Types.Grid|Types.ImmutableGrid} args.grid - the grid containing the cell
  * @param {number} args.width - the width of the grid (this is here just so that it doesn't have
  *	to calculate it every time this is called)
  * @param {number} args.height - the height of the grid (this is here just so that it doesn't have
  *	to calculate it every time this is called)
  * @param {number} args.rowIndex - the index of the row on which the cell occurs
  * @param {number} args.columnIndex - the index of the column on which the cell occurs
  *
  * @return {boolean} whether or not the specified cell should be given a clue number
  */
	function hasClueNumber(_ref3) {
		var grid = _ref3.grid,
		    width = _ref3.width,
		    height = _ref3.height,
		    rowIndex = _ref3.rowIndex,
		    columnIndex = _ref3.columnIndex;

		if (getter(grid, [rowIndex, columnIndex, "isBlockCell"])) {
			return undefined;
		}

		if ((columnIndex === 0 || getter(grid, [rowIndex, columnIndex - 1, "isBlockCell"])) && columnIndex + 1 < width && !getter(grid, [rowIndex, columnIndex + 1, "isBlockCell"])) {
			// This cell is adjacent to the puzzle edge or a block cell on the left,
			// and has at least one input cell to its right--this cell starts an across clue
			return true;
		}

		if ((rowIndex === 0 || getter(grid, [rowIndex - 1, columnIndex, "isBlockCell"])) && rowIndex + 1 < height && !getter(grid, [rowIndex + 1, columnIndex, "isBlockCell"])) {
			// This cell is adjacent to the puzzle edge or a block cell on the top,
			// and has at least one input cell below it--this cell starts a down clue
			return true;
		}

		return false;
	}

	Object.defineProperties(constructor.prototype, (_Object$definePropert = {
		/**
   * Determines whether this object is equivalent to another object
   *
   * @method
   * @instance
   * @memberof xpuz.PuzzleMixin
   *
   * @param {*} other - the object to compare against
   *
   * @return {boolean} whether or not the other object is equal to this
   */
		equals: {
			writable: true,
			configurable: true,
			value: function equals(other) {
				if (!(other instanceof constructor)) {
					return false;
				}

				return equalityTest(this.grid, other.grid) && equalityTest(this.clues, other.clues) && equalityTest(this.userSolution, other.userSolution) && equalityTest(this.info, other.info) && equalityTest(this.extensions, other.extensions);
			}
		},

		/**
   * Returns a hash code integer for this object.
   *
   * @method
   * @instance
   * @memberof xpuz.PuzzleMixin
   *
   * @return {number} the object's hash code
   */
		hashCode: {
			writable: true,
			configurable: true,
			value: function hashCode() {
				return hashIt(this);
			}
		},

		/**
   * Returns a string representation of this object.
   *
   * @method
   * @instance
   * @memberof xpuz.PuzzleMixin
   *
   * @return {string} string representation of this object
   */
		toString: {
			writable: true,
			configurable: true,
			value: function toString() {
				return constructorName;
			}
		}

	}, _defineProperty(_Object$definePropert, Symbol.toStringTag, {
		configurable: true,
		get: function get() {
			return constructorName;
		}
	}), _defineProperty(_Object$definePropert, "updateGrid", {
		writable: true,
		configurable: true,
		value: function updateGrid() {
			var grid = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.grid;

			return setter(this, ["grid"], constructor.processGrid(grid));
		}
	}), _defineProperty(_Object$definePropert, "updateCell", {
		writable: true,
		configurable: true,
		value: function updateCell(columnIndex, rowIndex, cell) {
			var grid = setter(this.grid, [rowIndex, columnIndex], cell);

			return this.updateGrid(grid);
		}
	}), _Object$definePropert));

	Object.defineProperties(constructor, {
		/**
   * Updates the specified grid with the correct cell information (clue numbers, etc.)
   *
   * @function
   * @memberof xpuz.PuzzleMixin
   *
   * @param {Types.Grid|Types.ImmutableGrid} grid - the
   *	grid to update
   *
   * @return {Puzzle|ImmutablePuzzle} the puzzle, with the updated cell information (return type is whatever
   *	type `grid` is)
   */
		processGrid: {
			writable: true,
			enumerable: true,
			value: function processGrid(grid) {
				var height = sizeOf(grid);
				var width = sizeOf(getter(grid, [0]));
				var clueNumber = 0;

				for (var rowIndex = 0; rowIndex < height; rowIndex++) {
					for (var columnIndex = 0; columnIndex < width; columnIndex++) {
						if (getter(grid, [rowIndex, columnIndex, "isBlockCell"])) {
							continue;
						}

						var args = {
							grid: grid,
							width: width,
							height: height,
							rowIndex: rowIndex,
							columnIndex: columnIndex
						};

						var cellClueNumber = hasClueNumber(args) ? ++clueNumber : undefined;

						setter(grid, [rowIndex, columnIndex, "clueNumber"], cellClueNumber);

						setter(grid, [rowIndex, columnIndex, "containingClues"], findContainingClues(args));
					}
				}

				return grid;
			}
		}
	});
}

exports = module.exports = PuzzleMixin;

},{"hash-it":undefined,"lodash/get":undefined,"lodash/set":undefined,"lodash/size":undefined}],4:[function(require,module,exports){
"use strict";

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
  */
	this.info = {
		title: info.title || "",
		author: info.author || "",
		copyright: info.copyright || "",
		publisher: info.publisher || "",
		difficulty: info.difficulty || "",
		intro: info.intro || ""
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

},{"./puzzle-mixin":3,"lodash/isEqual":undefined,"lodash/reduce":undefined}],5:[function(require,module,exports){
"use strict";

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
var Puzzle = require("../lib/puzzle");

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
		title: ipuz.title,
		author: ipuz.author,
		copyright: ipuz.copyright,
		publisher: ipuz.publisher,
		difficulty: ipuz.difficulty,
		intro: ipuz.intro,
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

	return errors.length === 0 ? undefined : errors;
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
			var promise = void 0;

			if (isString(puzzle)) {
				// path to puzzle
				promise = readFile(puzzle).then(function (fileContent) {
					return JSON.parse(fileContent.toString());
				}).catch(function (ex) {
					throw new Error("Unable to read IPUZ puzzle from file " + puzzle + ": " + ex.message);
				});
			} else if (isObject(puzzle)) {
				promise = Promise.resolve(puzzle);
			} else {
				return Promise.reject(new Error("parse() expects either a path string or an object"));
			}

			return promise.then(function (puzzle) {
				var errors = _validatePuzzle(puzzle);

				if (errors !== undefined) {
					throw new Error("Invalid puzzle:\n\t" + errors.join("\n\t"));
				}

				return _convertPuzzle(puzzle);
			});
		}
	}]);

	return IPUZParser;
}();

exports = module.exports = IPUZParser;

},{"../lib/puzzle":4,"bluebird":undefined,"fs":undefined,"lodash/get":undefined,"lodash/isObject":undefined,"lodash/isString":undefined,"lodash/max":undefined,"lodash/reduce":undefined}],6:[function(require,module,exports){
"use strict";

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
var Puzzle = require("../lib/puzzle");

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
			if (isString(puzzle)) {
				// path to puzzle
				return readFile(puzzle).then(function (fileContent) {
					return new Puzzle(fileContent.toString());
				}).catch(function (ex) {
					throw new Error("Unable to read JPZ puzzle from file " + puzzle + ": " + ex.message);
				});
			} else if (isObject(puzzle)) {
				return Promise.resolve(new Puzzle(puzzle));
			} else {
				return Promise.reject(new Error("parse() expects either a path string or an object"));
			}
		}
	}]);

	return JPZParser;
}();

exports = module.exports = JPZParser;

},{"../lib/puzzle":4,"bluebird":undefined,"fs":undefined,"lodash/isObject":undefined,"lodash/isString":undefined}],7:[function(require,module,exports){
(function (Buffer){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * PUZ file parser.
 *
 * @module xpuz/parsers/puz
 * @see {@link module:xpuz/puzzle|Puzzle}
 */

var map = require("lodash/map");
var get = require("lodash/get");
var range = require("lodash/range");
var reverse = require("lodash/reverse");
var zip = require("lodash/zip");
var each = require("lodash/each");
var reduce = require("lodash/reduce");
var flatten = require("lodash/flatten");
var padStart = require("lodash/padStart");
var chunk = require("lodash/chunk");
var findKey = require("lodash/findKey");
var compact = require("lodash/compact");
var size = require("lodash/size");
var iconv = require("iconv-lite");
var PUZReader = require("./puz/puz-reader");
var Puzzle = require("../lib/puzzle");
var ImmutablePuzzle = require("../lib/immutable-puzzle");

var BLOCK_CELL_VALUE = ".";

var BLOCK_CELL_VALUE_REGEX = /\./g;

var EXTENSION_HEADER_LENGTH = 8;

var HEADER_CHECKSUM_BYTE_LENGTH = 8;

var MAGIC_CHECKSUM_BYTE_LENGTH = 8;

var UNKNOWN1_BYTE_LENGTH = 2;

var UNKNOWN2_BYTE_LENGTH = 12;

var CHECKSUM_BUFFER_LENGTH = 2;

var NUMBER_OF_CLUES_BUFFER_LENGTH = 2;

var PUZZLE_TYPE_BUFFER_LENGTH = 2;

var SOLUTION_STATE_BUFFER_LENGTH = 2;

var HEADER_BUFFER_LENGTH = 52;

var EXTENSION_LENGTH_BUFFER_LENGTH = 2;

var EXTENSION_NAME_LENGTH = 4;

var PUZZLE_KEY_LENGTH = 4;

var RTBL_KEY_PADDING_WIDTH = 2;

var PUZZLE_TYPE = {
	Normal: 0x0001,
	Diagramless: 0x0401
};

var SOLUTION_STATE = {
	// solution is available in plaintext
	Unlocked: 0x0000,
	// solution is locked (scrambled) with a key
	Locked: 0x0004
};

var CELL_STATES = {
	PreviouslyIncorrect: 0x10,
	CurrentlyIncorrect: 0x20,
	AnswerGiven: 0x40,
	Circled: 0x80
};

var ATOZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

var MINIMUM_KEY_VALUE = 1000;

var MAXIMUM_KEY_VALUE = 9999;

function _doChecksum(buffer, cksum) {
	for (var i = 0; i < buffer.length; i++) {
		// right-shift one with wrap-around
		var lowbit = cksum & 0x0001;

		cksum = cksum >> 1;

		if (lowbit) {
			// eslint-disable-next-line no-magic-numbers
			cksum = cksum | 0x8000;
		}

		// then add in the data and clear any carried bit past 16
		// eslint-disable-next-line no-magic-numbers
		cksum = cksum + buffer.readUInt8(i) & 0xFFFF;
	}

	return cksum;
}

function _readHeader(reader, options) {
	var data = {};

	data.globalChecksum = reader._readUInt16();

	reader._seek("ACROSS&DOWN\0".length, { current: true });

	data.headerChecksum = reader._readUInt16();

	data.magicChecksum = reader._readValues(MAGIC_CHECKSUM_BYTE_LENGTH);

	data.version = reader._readString();

	data.unknown1 = reader._readValues(UNKNOWN1_BYTE_LENGTH);

	data.scrambledChecksum = reader._readUInt16();

	data.unknown2 = reader._readValues(UNKNOWN2_BYTE_LENGTH);

	data.width = reader._readUInt8();

	data.height = reader._readUInt8();

	data.numberOfClues = reader._readUInt16();

	data.puzzleType = reader._readUInt16();

	data.solutionState = reader._readUInt16();

	if (data.solutionState === SOLUTION_STATE.Locked && !options.solutionKey) {
		throw new Error("Puzzle solution is locked and no solutionKey option was provided");
	}

	return data;
}

function _processExtension(extension) {
	if (extension.name === "GRBS") {
		extension.board = map(extension.data, function (b) {
			if (b === 0) {
				return null;
			}

			return b - 1;
		});
	}

	if (extension.name === "RTBL") {
		extension.rebus_solutions = reduce(iconv.decode(extension.data, PUZReader.ENCODING).split(";"), function (solutions, solutionPair) {
			var pair = solutionPair.split(":");

			pair[0] = parseInt(pair[0], 10);

			solutions[pair[0]] = pair[1];

			return solutions;
		}, {});
	}

	if (extension.name === "LTIM") {
		var timings = iconv.decode(extension.data, PUZReader.ENCODING).split(",");

		extension.timing = {
			elapsed: parseInt(timings[0], 10),
			running: timings[1] === "0"
		};
	}

	if (extension.name === "GEXT") {
		extension.cell_states = map(extension.data, function (b) {
			return {
				PreviouslyIncorrect: !!(b & CELL_STATES.PreviouslyIncorrect),
				CurrentlyIncorrect: !!(b & CELL_STATES.CurrentlyIncorrect),
				AnswerGiven: !!(b & CELL_STATES.AnswerGiven),
				Circled: !!(b & CELL_STATES.Circled)
			};
		});
	}

	if (extension.name === "RUSR") {
		extension.user_rebus_entries = map(iconv.decode(extension.data, PUZReader.ENCODING).split("\0"), function (entry) {
			return entry === "" ? null : entry;
		});
	}

	return extension;
}

function _readExtension(reader) {
	var extension = {};

	extension.name = reader._readString(EXTENSION_NAME_LENGTH);

	var length = reader._readUInt16();

	extension.checksum = reader._readUInt16();

	// Include null byte at end
	extension.data = reader._readValues(length + 1);
	// Remove null byte at the end
	extension.data = extension.data.slice(0, -1);

	return _processExtension(extension);
}

function _parseEnd(reader, data) {
	var remainingLength = reader.size() - reader.tell();

	if (remainingLength >= EXTENSION_HEADER_LENGTH) {
		var extension = _readExtension(reader);

		data.extensions = data.extensions || {};
		data.extensions[extension.name] = extension;

		delete extension.name;

		_parseEnd(reader, data);
	}
}

function _parseExtensions(reader, puzzleData) {
	var data = {};

	_parseEnd(reader, data);

	if (get(data, "extensions.GRBS")) {
		each(flatten(puzzleData.grid), function (cell, index) {
			var c = cell;

			if (data.extensions.GRBS.board[index] === null) {
				return;
			}

			var rebusSolution = data.extensions.RTBL.rebus_solutions[data.extensions.GRBS.board[index]];

			c.solution = rebusSolution;
		});
	}

	if (get(data, "extensions.RUSR")) {
		data.extensions.RUSR.user_rebus_entries.forEach(function (rusr, index) {
			if (rusr !== null) {
				var y = Math.floor(index / puzzleData.header.width);
				var x = index % puzzleData.header.width;

				puzzleData.solution[y][x] = rusr;
			}
		});
	}

	puzzleData._extensions = data.extensions;

	puzzleData.timing = get(data, "extensions.LTIM.timing");
}

function _readClues(reader, numberOfClues) {
	var clues = [];

	for (var i = 0; i < numberOfClues; i++) {
		clues.push(reader._readString());
	}

	return clues;
}

function _generateGridAndClues(answers, clueList) {
	function _isBlockCell(x, y) {
		return answers[y][x] === BLOCK_CELL_VALUE;
	}

	var clues = {
		across: {},
		down: {}
	};

	var grid = [];

	var width = answers[0].length,
	    height = answers.length;

	var clueCount = 0;

	var clueListIndex = 0;

	for (var y = 0; y < height; y++) {
		var row = [];

		for (var x = 0; x < width; x++) {
			var cell = {};

			if (_isBlockCell(x, y)) {
				cell.isBlockCell = true;
			} else {
				cell.solution = answers[y][x];

				var down = false,
				    across = false;

				if ((x === 0 || _isBlockCell(x - 1, y)) && x + 1 < width && !_isBlockCell(x + 1, y)) {
					across = true;
				}

				if ((y === 0 || _isBlockCell(x, y - 1)) && y + 1 < height && !_isBlockCell(x, y + 1)) {
					down = true;
				}

				if (across || down) {
					cell.clueNumber = ++clueCount;
				}

				if (across) {
					clues.across[clueCount] = clueList[clueListIndex++];
				}

				if (down) {
					clues.down[clueCount] = clueList[clueListIndex++];
				}
			}

			row.push(cell);
		}

		grid.push(row);
	}

	return {
		grid: grid,
		clues: clues
	};
}

function _pluckSolutions(grid) {
	return grid.map(function (row) {
		return row.map(function (cell) {
			if (cell.isBlockCell) {
				return BLOCK_CELL_VALUE;
			}

			if (cell.solution === null) {
				return " ";
			}

			return cell.solution;
		});
	});
}

function _flattenSolution(solution) {
	return flatten(solution).map(function (entry) {
		if (entry === null) {
			return BLOCK_CELL_VALUE;
		}

		if (entry === "") {
			return "-";
		}

		return entry[0];
	}).join("");
}

function _unflattenSolution(solution, width) {
	return chunk(solution.split(""), width).map(function (row) {
		return row.map(function (cell) {
			return cell === "-" ? "" : cell;
		});
	});
}

function _textChecksum(puzzleData, checksum) {
	if (puzzleData.title) {
		checksum = _doChecksum(iconv.encode(puzzleData.title + "\0", PUZReader.ENCODING), checksum);
	}

	if (puzzleData.author) {
		checksum = _doChecksum(iconv.encode(puzzleData.author + "\0", PUZReader.ENCODING), checksum);
	}

	if (puzzleData.copyright) {
		checksum = _doChecksum(iconv.encode(puzzleData.copyright + "\0", PUZReader.ENCODING), checksum);
	}

	puzzleData.clueList.forEach(function (clue) {
		if (clue) {
			checksum = _doChecksum(iconv.encode(clue, PUZReader.ENCODING), checksum);
		}
	});

	if (puzzleData.notes) {
		checksum = _doChecksum(iconv.encode(puzzleData.notes + "\0", PUZReader.ENCODING), checksum);
	}

	return checksum;
}

function _headerChecksum(puzzleData, checksum) {
	if (checksum === undefined) {
		checksum = 0;
	}

	var buffer = new Buffer(HEADER_CHECKSUM_BYTE_LENGTH);

	buffer.writeUInt8(puzzleData.header.width, 0);
	buffer.writeUInt8(puzzleData.header.height, 1);
	// These "magic numbers" are the successive byte offsets to write at
	/* eslint-disable no-magic-numbers */
	buffer.writeUInt16LE(puzzleData.header.numberOfClues, 2);
	buffer.writeUInt16LE(puzzleData.header.puzzleType, 4);
	buffer.writeUInt16LE(puzzleData.header.solutionState, 6);
	/* eslint-enable no-magic-numbers */

	return _doChecksum(buffer, checksum);
}

function _globalChecksum(puzzleData, headerChecksum) {
	var checksum = headerChecksum === undefined ? _headerChecksum(puzzleData) : headerChecksum;

	var buffer = iconv.encode(puzzleData.answer, PUZReader.ENCODING);

	checksum = _doChecksum(buffer, checksum);

	buffer = iconv.encode(puzzleData.solution, PUZReader.ENCODING);

	checksum = _doChecksum(buffer, checksum);

	checksum = _textChecksum(puzzleData, checksum);

	return checksum;
}

function _magicChecksum(puzzleData) {
	var headerChecksum = _headerChecksum(puzzleData);
	var answerChecksum = _doChecksum(iconv.encode(puzzleData.answer, PUZReader.ENCODING));
	var solutionChecksum = _doChecksum(iconv.encode(puzzleData.solution, PUZReader.ENCODING));
	var textChecksum = _textChecksum(puzzleData);

	var MAGIC_CHECKSUM_STRING = "ICHEATED";

	var magicChecksum = new Buffer([
	/* eslint-disable no-magic-numbers */
	MAGIC_CHECKSUM_STRING.charCodeAt(0) ^ headerChecksum & 0xFF, MAGIC_CHECKSUM_STRING.charCodeAt(1) ^ answerChecksum & 0xFF, MAGIC_CHECKSUM_STRING.charCodeAt(2) ^ solutionChecksum & 0xFF, MAGIC_CHECKSUM_STRING.charCodeAt(3) ^ textChecksum & 0xFF, MAGIC_CHECKSUM_STRING.charCodeAt(4) ^ (headerChecksum & 0xFF00) >> 8, MAGIC_CHECKSUM_STRING.charCodeAt(5) ^ (answerChecksum & 0xFF00) >> 8, MAGIC_CHECKSUM_STRING.charCodeAt(6) ^ (solutionChecksum & 0xFF00) >> 8, MAGIC_CHECKSUM_STRING.charCodeAt(7) ^ (textChecksum & 0xFF00) >> 8
	/* eslint-enable no-magic-numbers */
	]);

	return magicChecksum;
}

function _transposeGrid(gridString, width, height) {
	var data = gridString.match(new RegExp(".{1," + width + "}", "g"));

	return range(width).map(function (c) {
		return range(height).map(function (r) {
			return data[r][c];
		}).join("");
	}).join("");
}

function _restoreSolution(s, t) {
	/*
 s is the source string, it can contain '.'
 t is the target, it's smaller than s by the number of '.'s in s
 	Each char in s is replaced by the corresponding
 char in t, jumping over '.'s in s.
 	>>> restore('ABC.DEF', 'XYZABC')
 'XYZ.ABC'
 */

	t = t.split("");

	return s.split("").reduce(function (arr, c) {
		if (c === BLOCK_CELL_VALUE) {
			arr.push(c);
		} else {
			arr.push(t.shift());
		}

		return arr;
	}, []).join("");
}

function _shift(str, key) {
	return str.split("").map(function (c, index) {
		var letterIndex = (ATOZ.indexOf(c) + Number(key[index % key.length])) % ATOZ.length;

		if (letterIndex < 0) {
			letterIndex = ATOZ.length + letterIndex;
		}

		return ATOZ[letterIndex];
	}).join("");
}

function _unshift(str, key) {
	return _shift(str, map(key, function (k) {
		return -k;
	}));
}

function _everyOther(str) {
	return str.split("").reduce(function (arr, c, i) {
		// eslint-disable-next-line no-magic-numbers
		if (i % 2 === 0) {
			arr.push(c);
		}

		return arr;
	}, []).join("");
}

function _unshuffle(str) {
	return _everyOther(str.substring(1)) + _everyOther(str);
}

function _unscrambleString(str, key) {
	var len = str.length;

	reverse(padStart(key, PUZZLE_KEY_LENGTH, "0").split("")).forEach(function (k) {
		str = _unshuffle(str);
		str = str.substring(len - k) + str.substring(0, len - k);
		str = _unshift(str, key);
	});

	return str;
}

function _shuffle(str) {
	// eslint-disable-next-line no-magic-numbers
	var mid = Math.floor(str.length / 2);

	return zip(str.substring(mid).split(""), str.substring(0, mid).split("")).reduce(function (arr, chars) {
		if (chars[0] === undefined || chars[1] === undefined) {
			return arr;
		}

		arr.push(chars[0] + chars[1]);

		return arr;
	}, []
	// eslint-disable-next-line no-magic-numbers
	).join("") + (str.length % 2 ? str[str.length - 1] : "");
}

function _scrambleString(str, key) {
	/*
 str is the puzzle's solution in column-major order, omitting black squares:
 i.e. if the puzzle is:
 	C A T
 	# # A
 	# # R
 solution is CATAR
 
 Key is a 4-digit number in the range 1000 <= key <= 9999
     */

	each(padStart(key, PUZZLE_KEY_LENGTH, "0"), function (k) {
		str = _shift(str, key);
		str = str.substring(k) + str.substring(0, k);
		str = _shuffle(str);
	});

	return str;
}

function _scrambledChecksum(answer, width, height) {
	var transposed = _transposeGrid(_flattenSolution(answer), width, height).replace(BLOCK_CELL_VALUE_REGEX, "");

	return _doChecksum(iconv.encode(transposed, PUZReader.ENCODING));
}

function _validateChecksums(puzzleData) {
	var headerChecksum = _headerChecksum(puzzleData);

	var globalChecksum = _globalChecksum(puzzleData, headerChecksum);

	var magicChecksum = _magicChecksum(puzzleData);

	var checksums = {
		header: headerChecksum,
		global: globalChecksum,
		magic: magicChecksum
	};

	var errors = [];

	if (checksums.header !== puzzleData.header.headerChecksum) {
		errors.push("header checksums do not match");
	}

	if (checksums.global !== puzzleData.header.globalChecksum) {
		errors.push("global checksums do not match");
	}

	if (!checksums.magic.equals(puzzleData.header.magicChecksum)) {
		errors.push("magic checksums do not match");
	}

	each(puzzleData._extensions, function (extension, name) {
		if (extension.checksum !== _doChecksum(extension.data)) {
			errors.push("checksum for extension " + name + " does not match");
		}
	});

	return errors;
}

function _scrambleSolution(solutionGrid, key) {
	var height = solutionGrid.length;
	var width = solutionGrid[0].length;

	var solutionString = flatten(_flattenSolution(solutionGrid)).join("");

	var transposed = _transposeGrid(solutionString, width, height);

	var data = _restoreSolution(transposed, _scrambleString(transposed.replace(BLOCK_CELL_VALUE_REGEX, ""), key));

	solutionString = _transposeGrid(data, height, width);

	return chunk(solutionString.split(""), width);
}

function _unscrambleSolution(puzzleData, key) {
	var transposed = _transposeGrid(puzzleData.answer, puzzleData.header.width, puzzleData.header.height);

	var data = _restoreSolution(transposed, _unscrambleString(transposed.replace(BLOCK_CELL_VALUE_REGEX, ""), key));

	var result = _transposeGrid(data, puzzleData.header.height, puzzleData.header.width);

	if (result === puzzleData.answer) {
		throw new Error("Unscrambled solution is the same as the scrambled solution; incorrect key?");
	}

	return result;
}

function _writeHeader(puzzleData, options) {
	var globalChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

	globalChecksumBuffer.writeUInt16LE(_globalChecksum(puzzleData));

	var headerChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

	headerChecksumBuffer.writeUInt16LE(_headerChecksum(puzzleData));

	var magicChecksumBuffer = _magicChecksum(puzzleData);

	var scrambledChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

	if (get(options, "scrambled")) {
		scrambledChecksumBuffer.writeUInt16LE(_scrambledChecksum(puzzleData.unscrambledAnswer, puzzleData.header.width, puzzleData.header.height));
	} else {
		scrambledChecksumBuffer.fill(0x0);
	}

	var numberOfCluesBuffer = new Buffer(NUMBER_OF_CLUES_BUFFER_LENGTH);

	numberOfCluesBuffer.writeUInt16LE(puzzleData.header.numberOfClues);

	var puzzleTypeBuffer = new Buffer(PUZZLE_TYPE_BUFFER_LENGTH);

	puzzleTypeBuffer.writeUInt16LE(puzzleData.header.puzzleType);

	var solutionStateBuffer = new Buffer(SOLUTION_STATE_BUFFER_LENGTH);

	solutionStateBuffer.writeUInt16LE(puzzleData.header.solutionState);

	return Buffer.concat([globalChecksumBuffer, iconv.encode("ACROSS&DOWN\0", PUZReader.ENCODING), headerChecksumBuffer, magicChecksumBuffer, iconv.encode(get(options, "version", "1.3") + "\0", PUZReader.ENCODING),
	// unknown block 1
	new Buffer([0x0, 0x0]), scrambledChecksumBuffer,
	// unknown block 2
	new Buffer(UNKNOWN2_BYTE_LENGTH).fill(0x0), new Buffer([puzzleData.header.width]), new Buffer([puzzleData.header.height]), numberOfCluesBuffer, puzzleTypeBuffer, solutionStateBuffer], HEADER_BUFFER_LENGTH);
}

function _writeExtension(extensionBuffer, extensionName) {
	var lengthBuffer = new Buffer(EXTENSION_LENGTH_BUFFER_LENGTH);
	lengthBuffer.writeUInt16LE(extensionBuffer.length);

	var checksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);
	checksumBuffer.writeUInt16LE(_doChecksum(extensionBuffer));

	return Buffer.concat([iconv.encode(extensionName, PUZReader.ENCODING), lengthBuffer, checksumBuffer, extensionBuffer, new Buffer([0])], EXTENSION_NAME_LENGTH + EXTENSION_LENGTH_BUFFER_LENGTH + CHECKSUM_BUFFER_LENGTH + extensionBuffer.length + 1);
}

function _writeGRBS(answerArray, rebusSolutions) {
	var grbsBuffer = new Buffer(answerArray.map(function (cell, index) {
		var solutionKey = findKey(rebusSolutions, function (solutionInfo) {
			return solutionInfo.cells.includes(index);
		});

		if (solutionKey === undefined) {
			return 0;
		}

		return parseInt(solutionKey, 10) + 1;
	}));

	return _writeExtension(grbsBuffer, "GRBS");
}

function _writeRTBL(rebusSolutions) {
	var rtblBuffer = iconv.encode(Object.keys(rebusSolutions).map(function (key) {
		return padStart(key, RTBL_KEY_PADDING_WIDTH, " ") + ":" + rebusSolutions[key].solution + ";";
	}).join(""), PUZReader.ENCODING);

	return _writeExtension(rtblBuffer, "RTBL");
}

function _writeRUSR(userSolutionArray) {
	var rusrBuffer = iconv.encode(userSolutionArray.map(function (solution) {
		if (solution.length > 1) {
			return solution + "\0";
		}

		return "\0";
	}).join(""), PUZReader.ENCODING);

	return _writeExtension(rusrBuffer, "RUSR");
}

function _writeLTIM(timing) {
	return _writeExtension(iconv.encode(timing.elapsed + "," + (timing.running ? "1" : "0"), PUZReader.ENCODING), "LTIM");
}

function _writeRebus(answerArray, userSolutionArray, extensions) {
	var solutionKey = 0;

	var rebusSolutions = flatten(answerArray).reduce(function (solutions, cellSolution, cellIndex) {
		if (cellSolution && cellSolution.length > 1) {
			var key = findKey(solutions, { solution: cellSolution });

			if (key === undefined) {
				solutions[++solutionKey] = {
					solution: cellSolution,
					cells: [cellIndex]
				};
			} else {
				solutions[key].cells.push(cellIndex);
			}
		}

		return solutions;
	}, {});

	var grbsBuffer = _writeGRBS(answerArray, rebusSolutions);

	var rtblBuffer = _writeRTBL(rebusSolutions);

	var rusrBuffer = _writeRUSR(userSolutionArray);

	var buffers = [grbsBuffer, rtblBuffer, rusrBuffer];

	var totalBufferLength = grbsBuffer.length + rtblBuffer.length + rusrBuffer.length;

	if (extensions.timing) {
		var ltimBuffer = _writeLTIM(extensions.timing);
		buffers.push(ltimBuffer);

		totalBufferLength += ltimBuffer.length;
	}

	return Buffer.concat(buffers, totalBufferLength);
}

function _parsePuzzle(path, options) {
	var data = {};

	var reader = new PUZReader(path);

	data.header = _readHeader(reader, options);

	var numberOfCells = data.header.width * data.header.height;

	data.answer = reader._readString(numberOfCells);

	if (data.header.solutionState === SOLUTION_STATE.Locked) {
		data.unscrambledAnswer = _unscrambleSolution({
			header: data.header,
			answer: data.answer
		}, options.solutionKey);
	} else {
		data.unscrambledAnswer = data.answer;
	}

	data.solution = reader._readString(numberOfCells);

	data.title = reader._readString();

	data.author = reader._readString();

	data.copyright = reader._readString();

	data.clueList = _readClues(reader, data.header.numberOfClues);

	var gridAndClues = _generateGridAndClues(_unflattenSolution(data.unscrambledAnswer, data.header.width), data.clueList);

	data.grid = gridAndClues.grid;
	data.clues = gridAndClues.clues;

	data.notes = reader._readString();

	_parseExtensions(reader, data);

	return data;
}

function validatePuzzle(puzzle) {
	var checksumResults = _validateChecksums(puzzle);

	var errors = [];

	if (checksumResults) {
		errors.push.apply(errors, _toConsumableArray(checksumResults));
	}

	return errors.length === 0 ? undefined : errors;
}

function _getPuzzleData(path, options) {
	return new Promise(function (resolve, reject) {
		try {
			var puzzleData = _parsePuzzle(path, options);

			var errors = validatePuzzle(puzzleData);

			if (errors !== undefined) {
				reject("Invalid puzzle:\n\t" + errors.join("\n\t"));
			} else {
				resolve({
					title: puzzleData.title || undefined,
					author: puzzleData.author || undefined,
					copyright: puzzleData.copyright || undefined,
					intro: puzzleData.notes || undefined,
					grid: puzzleData.grid,
					clues: puzzleData.clues,
					userSolution: _unflattenSolution(puzzleData.solution, puzzleData.header.width),
					extensions: {
						timing: puzzleData.timing
					}
				});
			}
		} catch (err) {
			reject(err);
		}
	});
}

/**
 * Parser class for PUZ-formatted puzzles.
 *
 * @constructor
 */

var PUZParser = function () {
	function PUZParser() {
		_classCallCheck(this, PUZParser);
	}

	_createClass(PUZParser, [{
		key: "parse",

		/**
   * Parses a file in .puz format into a {@link module:xpuz/puzzle~Puzzle|Puzzle} object.
   *
   * @memberOf module:xpuz/parsers/puz~PUZParser
   * @function
   * @instance
   *
   * @param {string|external:Buffer|ArrayBuffer} path - the .puz file to parse, either as a file path
   *	(strong) or a {@link external:Buffer|Buffer} or {@link external:ArrayBuffer|ArrayBuffer} containing the puzzle
   *	content.
   * @param {object} [options] - an object of options to affect the parsing
   * @param {Number} [options.solutionKey] - an integer between 1000 and 9999, inclusive, to use to unlock
   *	the puzzle's solution if the solution is locked. If the solution is not locked, this is ignored.
   *
   * @throws if the puzzle is locked and an invalid (or no) `options.solutionKey` was provided
   *
   * @returns {external:Bluebird} a promise that resolves with the {@link module:xpuz/puzzle~Puzzle|Puzzle} object 
   */
		value: function parse(path, options) {
			options = options || {};

			return _getPuzzleData(path, options).then(function (puzzleData) {
				return new Puzzle(puzzleData);
			});
		}
	}, {
		key: "parseImmutable",
		value: function parseImmutable(path, options) {
			options = options || {};

			return _getPuzzleData(path, options).then(function (puzzleData) {
				return new ImmutablePuzzle(puzzleData);
			});
		}

		/**
   * Given a {@link module:xpuz/puzzle~Puzzle|Puzzle} object, returns a {@link external:Buffer|Buffer}
   * containing the puzzle in .puz format.
   *
   * @memberOf module:xpuz/parsers/puz~PUZParser
   * @function
   * @instance
   *
   * @param {module:xpuz/puzzle~Puzzle|XPuz.ImmutablePuzzle} puzzle - the puzzle to convert to .puz content.
   * @param {object} [options] - an object containing additional options for the conversion
   * @param {boolean} [options.scrambled] - if true, the puzzle's solution will be scrambled
   * @param {Number} [options.solutionKey] - the solution key with which to scramble the solution. 
   *	If `options.scrambled` is true, this is required.
   *
   * @throws if `options.scrambled` is true but `options.solutionKey` is not a 4-digit integer
   *	(between 1000 and 9999, inclusive).
   *
   * @returns {external:Buffer} a Buffer containing the .puz content. 
   */

	}, {
		key: "generate",
		value: function generate(puzzle, options) {
			puzzle = puzzle.toJSON();

			var numberOfClues = size(puzzle.clues.across) + size(puzzle.clues.down);
			var puzzleType = PUZZLE_TYPE.Normal;
			var solutionState = SOLUTION_STATE.Unlocked;

			options = options || {};

			var height = puzzle.grid.length;
			var width = puzzle.grid[0].length;

			var notes = puzzle.info.intro || "";

			var answerArray = _pluckSolutions(puzzle.grid);
			var unscrambledAnswerArray = void 0;

			if (options.scrambled) {
				if (!options.solutionKey || Number(options.solutionKey) < MINIMUM_KEY_VALUE || Number(options.solutionKey) > MAXIMUM_KEY_VALUE) {
					throw new Error("Must specify a solution key that is an integer >= 1000 and <= 9999; was " + options.solutionKey);
				}

				unscrambledAnswerArray = answerArray;
				answerArray = _scrambleSolution(answerArray, options.solutionKey);

				solutionState = SOLUTION_STATE.Locked;
			}

			var flattenedAnswerArray = flatten(answerArray);
			var flattenedUnscrambledAnswerArray = flatten(unscrambledAnswerArray || answerArray);

			var userSolution = puzzle.userSolution.map(function (row) {
				return row.map(function (solution) {
					if (solution === null) {
						return BLOCK_CELL_VALUE;
					}

					if (solution === "") {
						return "-";
					}

					return solution;
				});
			});

			var userSolutionArray = flatten(userSolution);

			var clueList = compact(flatten(puzzle.grid).map(function (cell) {
				return cell.clueNumber;
			})).reduce(function (cluesArray, clueNumber) {
				if (puzzle.clues.across[clueNumber] !== undefined) {
					cluesArray.push(puzzle.clues.across[clueNumber]);
				}

				if (puzzle.clues.down[clueNumber] !== undefined) {
					cluesArray.push(puzzle.clues.down[clueNumber]);
				}

				return cluesArray;
			}, []);

			var puzzleData = {
				header: {
					width: width,
					height: height,
					numberOfClues: numberOfClues,
					puzzleType: puzzleType,
					solutionState: solutionState
				},
				answer: _flattenSolution(flattenedAnswerArray),
				unscrambledAnswer: _flattenSolution(flattenedUnscrambledAnswerArray),
				solution: _flattenSolution(userSolution),
				title: puzzle.info.title,
				author: puzzle.info.author,
				copyright: puzzle.info.copyright,
				clueList: clueList,
				notes: notes
			};

			var headerBuffer = _writeHeader(puzzleData, options);

			var answerStringBuffer = iconv.encode(_flattenSolution(answerArray), PUZReader.ENCODING);

			var userSolutionStringBuffer = iconv.encode(userSolutionArray.map(function (solution) {
				return solution[0];
			}).join(""), PUZReader.ENCODING);

			var titleStringBuffer = iconv.encode((puzzle.info.title || "") + "\0", PUZReader.ENCODING);
			var authorStringBuffer = iconv.encode((puzzle.info.author || "") + "\0", PUZReader.ENCODING);
			var copyrightStringBuffer = iconv.encode((puzzle.info.copyright || "") + "\0", PUZReader.ENCODING);

			var cluesStringBuffer = iconv.encode(clueList.join("\0") + "\0", PUZReader.ENCODING);

			var notesStringBuffer = iconv.encode(notes + "\0", PUZReader.ENCODING);

			var buffers = [headerBuffer, answerStringBuffer, userSolutionStringBuffer, titleStringBuffer, authorStringBuffer, copyrightStringBuffer, cluesStringBuffer, notesStringBuffer];

			var totalBufferLength = headerBuffer.length + answerStringBuffer.length + userSolutionStringBuffer.length + titleStringBuffer.length + authorStringBuffer.length + copyrightStringBuffer.length + cluesStringBuffer.length + notesStringBuffer.length;

			if (flattenedUnscrambledAnswerArray.some(function (solution) {
				return solution.length > 1;
			})) {
				var rebusBuffer = _writeRebus(flattenedUnscrambledAnswerArray, userSolutionArray, puzzle.extensions || {});

				buffers.push(rebusBuffer);

				totalBufferLength += rebusBuffer.length;
			}

			return Buffer.concat(buffers, totalBufferLength);
		}
	}]);

	return PUZParser;
}();

exports = module.exports = PUZParser;

}).call(this,require("buffer").Buffer)

},{"../lib/immutable-puzzle":2,"../lib/puzzle":4,"./puz/puz-reader":8,"buffer":undefined,"iconv-lite":undefined,"lodash/chunk":undefined,"lodash/compact":undefined,"lodash/each":undefined,"lodash/findKey":undefined,"lodash/flatten":undefined,"lodash/get":undefined,"lodash/map":undefined,"lodash/padStart":undefined,"lodash/range":undefined,"lodash/reduce":undefined,"lodash/reverse":undefined,"lodash/size":undefined,"lodash/zip":undefined}],8:[function(require,module,exports){
(function (Buffer){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var isString = require("lodash/isString");
var fs = require("fs");
var BufferReader = require("buffer-reader");
var iconv = require("iconv-lite");

var ENCODING = "ISO-8859-1";

var INT16_BYTE_COUNT = 2;

var INT32_BYTE_COUNT = 4;

var DEFAULT_STRING_BUFFER_LENGTH = 20;

var PUZReader = function PUZReader(puz) {
	var _this = this;

	_classCallCheck(this, PUZReader);

	this._readValues = function (length) {
		return _this._bufferReader.nextBuffer(length);
	};

	this._seek = function (position, relativeTo) {
		relativeTo = relativeTo || { start: true };

		if (relativeTo.start) {
			_this._bufferReader.seek(position);
		} else if (relativeTo.current) {
			_this._bufferReader.move(position);
		}

		return _this;
	};

	this._readUInt8 = function () {
		return _this._readValues(1).readUInt8(0);
	};

	this._readUInt16 = function () {
		return _this._readValues(INT16_BYTE_COUNT).readUInt16LE(0);
	};

	this._readUInt32 = function () {
		return _this._readValues(INT32_BYTE_COUNT).readUInt32LE(0);
	};

	this._readString = function (length) {
		var bufferLength = length || DEFAULT_STRING_BUFFER_LENGTH;

		var size = _this.size();
		var currentPosition = _this.tell();

		if (currentPosition + bufferLength > size) {
			bufferLength = size - currentPosition;
		}

		if (bufferLength === 0) {
			return "";
		}

		var buffer = _this._readValues(bufferLength);
		var str = iconv.decode(buffer, ENCODING);

		if (length) {
			return str;
		}

		var nullIndex = str.indexOf("\0");

		if (nullIndex >= 0) {
			var nullOffset = nullIndex - str.length;

			if (nullOffset < 0) {
				_this._seek(nullOffset + 1, { current: true });

				str = str.substring(0, nullIndex);
			}
		} else {
			str = str + _this._readString();
		}

		return str;
	};

	this.size = function () {
		return _this._bufferSize;
	};

	this.tell = function () {
		return _this._bufferReader.tell();
	};

	var _buffer = void 0;

	if (isString(puz)) {
		// filename
		_buffer = fs.readFileSync(puz);
	} else if (puz instanceof Buffer) {
		// Already a buffer
		_buffer = puz;
	} else if (puz instanceof ArrayBuffer) {
		// ArrayBuffer--probably from client-side JS
		_buffer = new Buffer(new Uint8Array(puz));
	}

	this._bufferReader = new BufferReader(_buffer);

	this._bufferSize = _buffer.length;
};

PUZReader.ENCODING = ENCODING;


module.exports = exports = PUZReader;

}).call(this,require("buffer").Buffer)

},{"buffer":undefined,"buffer-reader":undefined,"fs":undefined,"iconv-lite":undefined,"lodash/isString":undefined}]},{},[1])(1)
});
//# sourceMappingURL=xpuz.development.js.map
