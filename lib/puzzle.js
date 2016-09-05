"use strict";

/**
 * Puzzle
 *
 * @module xpuz.puzzle
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
 * @param definition {object} an object describing the puzzle
 * @param definition.grid {Array} a two-dimensional array of rows of puzzle cells
 * @param definition.clues {object}
 * @param definition.clues.across {object} a map of clue number to clue text for across clues
 * @param definition.clues.down {object} a map of clue number to clue text for down clues
 */
function Puzzle(definition) {
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
			info: {
				enumerable: true,
				value: _puzzleInfo
			},

			clues: {
				enumerable: true,
				value: _clues
			},
			
			grid: {
				enumerable: true,
				value: _grid
			},

			userSolution: {
				enumerable: true,
				value: _userSolution
			},

			extensions: {
				enumerable: true,
				value: definition.extensions || {}
			}
		}
	);
}

Puzzle.prototype = Object.create(Object.prototype, {
	/**
	 * Returns a string representation of this object.
	 *
	 * @memberOf module:xpuz.puzzle~Puzzle
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
	 * @memberOf module:xpuz.puzzle~Puzzle
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
