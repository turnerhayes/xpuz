"use strict";

/**
 * Puzzle
 *
 * @module xpuz/puzzle
 * @see {@link module:xpuz/parsers/puz|PUZParser}
 * @see {@link module:xpuz/parsers/ipuz|IPUZParser}
 * @see {@link module:xpuz/parsers/jpz|JPZParser} (not yet implemented)
 */

var _ = require('lodash');

function _findContainingClues(cell, grid) {
	var containingClues = {};

	var x = cell[0];
	var y = cell[1];

	var width = grid[y].length;
	var height = grid.length;

	var clueNumber = grid[y][x].clueNumber;

	var i;

	if (!_.isUndefined(clueNumber)) {
		// This cell is a clue number cell--it defines either
		// its across clue number or its down clue number (or
		// both)

		if (
			// This is either at the left edge of the puzzle or
			// is bounded on the left by a block cell. This clue
			// number defines (at least) the cell's across clue number
			(x === 0 || grid[y][x - 1].isBlockCell) &&
			// There is at least one fillable cell to the right
			(x < width - 1 && !grid[y][x + 1].isBlockCell)
		) {
			containingClues.across = clueNumber;
		}
		else if (
			// There is at least one fillable cell below this
			y < height - 1 && !grid[y + 1][x].isBlockCell
		){
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
			(x === 0 && !_.isUndefined(clueNumber)) &&
			// There is at least one fillable cell to the right
			!grid[y][x + 1].isBlockCell
		) {
			containingClues.across = clueNumber;
		}
		else {
			for (i = x; i >= 0; i--) {
				if (grid[y][i].isBlockCell) {
					break;
				}

				if (
					// There is at least one fillable cell to the right
					i < width - 1 && !grid[y][i + 1].isBlockCell
				) {
					containingClues.across = grid[y][i].clueNumber;
				}
			}
		}
	}

	if (!containingClues.down) {
		// Look at cells in other rows at the same index until we find a
		// cell with a clue number
		if (
			// At the top of the puzzle and there is a clue number
			(y === 0 && !_.isUndefined(clueNumber)) &&
			// There is at least one fillable cell below it
			!grid[y + 1][x].isBlockCell
		) {
			containingClues.down = clueNumber;
		}
		else {
			for (i = y; i >= 0; i--) {
				if (grid[i][x].isBlockCell) {
					break;
				}
				
				if (
					// There is at least one fillable cell below it
					i < height - 1 && !grid[i + 1][x].isBlockCell
				) {
					containingClues.down = grid[i][x].clueNumber;
				}
			}
		}
	}

	return containingClues;
}

function _processGrid(grid) {
	var x, y;

	for (y = 0; y < grid.length; y++) {
		for (x = 0; x < grid[y].length; x++) {
			if (grid[y][x].isBlockCell) {
				continue;
			}

			grid[y][x].containingClues = _findContainingClues([x, y], grid);
		}
	}

	return grid;
}

/**
 * Represents a puzzle object
 *
 * @constructor
 *
 * @param {object} definition - an object describing the puzzle
 * @param {Array} definition.grid - a two-dimensional array of rows of puzzle cells
 * @param {object} definition.clues
 * @param {object} definition.clues.across - a map of clue number to clue text for across clues
 * @param {object} definition.clues.down - a map of clue number to clue text for down clues
 * @param {string} [definition.title] - the title of the puzzle
 * @param {string} [definition.author] - the name of the author of the puzzle
 * @param {string} [definition.copyright] - the copyright (a string such as "© 2013 The New York Times") of the puzzle
 * @param {string} [definition.publisher] - the name of the publisher of the puzzle
 * @param {*} [definition.difficulty] - the difficulty level of the puzzle
 * @param {string} [definition.intro] - introductory text for the puzzle
 */
function Puzzle(definition) {
	if (!(this instanceof Puzzle)) {
		return new Puzzle(definition);
	}

	var puzzle = this;

	var _grid = _processGrid(definition.grid || []);
	
	var _clues = definition.clues || {"across": {}, "down": {}};

	var _userSolution = definition.userSolution || _.map(
		_grid,
		function(row) {
			return _.map(
				row,
				function(cell) {
					if (cell.isBlockCell) {
						return null;
					}

					return '';
				}
			);
		}
	);

	var _puzzleInfo = {
		title: definition.title || '',
		author: definition.author || '',
		copyright: definition.copyright || '',
		publisher: definition.publisher || '',
		difficulty: definition.difficulty,
		intro: definition.intro || ''
	};

	Object.defineProperties(
		puzzle,
		{
			/**
			 * An object of various puzzle information, such as author, title, copyright, etc.
			 *
			 * @memberOf module:xpuz/puzzle~Puzzle
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
			info: {
				enumerable: true,
				configurable: true,
				value: _puzzleInfo
			},

			/**
			 * Listing of clues for the puzzle
			 *
			 * @memberOf module:xpuz/puzzle~Puzzle
			 * @type object
			 * @instance
			 * @property {object} across - an object mapping clue numbers to clue texts for across clues
			 * @property {object} down - an object mapping clue numbers to clue texts for down clues
			 */
			clues: {
				enumerable: true,
				configurable: true,
				value: _clues
			},

			/**
			 * Represents a single cell of the grid.
			 *
			 * @typedef {object} GridCell
			 *
			 * @property {boolean} [isBlockCell] - true if this is a block cell (a black cell that
			 *	doesn't contain any part of the solution).
			 * @property {Number} [cellNumber] - the clue number associated with this cell, if
			 *	any. If `isBlockCell` is true, this property is meaningless and should be absent.
			 * @property {object} [containingClues] - the clues that cover this cell. This should be
			 *	absent if `isBlockCell` is true.
			 * @property {Number} [containingClues.across] - the across clue, if any, that covers this cell.
			 * @property {Number} [containingClues.down] - the down clue, if any, that covers this cell.
			 * @property {string} [backgroundShape] - a string describing a shape, if any, that should be
			 *	displayed in the background of the cell (e.g. a circle). This should be absent if
			 *	`isBlockCell` is true.
			 */
			
			/**
			 * The definition of the puzzle grid. It is represented as an array of rows, so
			 *	`grid[0]` is the first row of the puzzle.
			 *
			 * @memberOf module:xpuz/puzzle~Puzzle
			 * @type Array<Array<module:xpuz/puzzle~GridCell>>
			 * @instance
			 */
			grid: {
				enumerable: true,
				configurable: true,
				value: _grid
			},

			/**
			 * A structure representing the current solution as the user has filled it out.
			 *	The structure is similar to {@link module:xpuz/puzzle~Puzzle#grid|grid}, but
			 *	each item is a string containing the user's current answer--an empty string
			 *	if the corresponding grid cell is not filled in, a non-empty string if it's
			 *	filled in.
			 *
			 * @memberOf module:xpuz/puzzle~Puzzle
			 * @type Array<Array<string>>
			 * @instance
			 */
			userSolution: {
				enumerable: true,
				configurable: true,
				value: _userSolution
			},

			/**
			 * An object of extra extensions used by the puzzle. The contents of this depend
			 *	on the particular puzzle format this was parsed from; for example, .puz files
			 *	store timer data. This is not likely to be useful to end users due to its
			 *	format-specific nature, but is useful for deserializing and reserializing a puzzle
			 *	into a format, so that we don't lose information.
			 *
			 * @memberOf module:xpuz/puzzle~Puzzle
			 * @type *
			 * @instance
			 * @private
			 */
			_extensions: {
				enumerable: true,
				configurable: true,
				value: definition.extensions || {}
			}
		}
	);
}

Puzzle.prototype = Object.create(Object.prototype, {
	/**
	 * Returns a string representation of this object.
	 *
	 * @memberOf module:xpuz/puzzle~Puzzle
	 * @function
	 * @instance
	 *
	 * @returns {string} string representation
	 */
	toString: {
		configurable: true,
		value: function toString() {
			return '[object Puzzle]';
		}
	},

	/**
	 * Returns this puzzle as a plain Javascript object, suitable for serializing to JSON.
	 *
	 * @memberOf module:xpuz/puzzle~Puzzle
	 * @function
	 * @instance
	 *
	 * @returns {object} object representation of this puzzle object
	 */
	toJSON: {
		configurable: true,
		value: function() {
			var puzzle = this;

			return {
				grid: puzzle.grid,
				clues: puzzle.clues,
				userSolution: puzzle.userSolution,
				info: puzzle.info,
			};
		}
	},

	/**
	 * Returns a string representation of the puzzle grid, with block cells represented
	 * as "#" and clue numbers on cells that have clue numbers.
	 *
	 * @memberOf module:xpuz/puzzle~Puzzle
	 * @function
	 * @instance
	 *
	 * @returns {string} string representation of grid
	 */
	getGridString: {
		configurable: true,
		value: function() {
			var puzzle = this;

			return _.map(
				puzzle.grid,
				function(row) {
					return _.map(
						row,
						function(cell) {
							var value;

							if (cell.isBlockCell) {
								value = '#';
							}

							else if (cell.clueNumber) {
								value = "" + cell.clueNumber;
							}
							else {
								value = '';
							}

							if (cell.backgroundShape) {
								value += '(O)';
							}

							return '[' + _.pad(value, 5) + ']';
						}
					).join(' ');
				}
			).join('\n');
		}
	}
});

exports = module.exports = Puzzle;
