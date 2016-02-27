"use strict";

var _ = require('lodash');

function _findContainingClues(cell, grid) {
	var containingClues = {};

	var x = cell[0];
	var y = cell[1];

	var clueNumber = grid[y][x].clueNumber;

	var i;

	if (!_.isUndefined(clueNumber)) {
		// This cell is a clue number cell--it defines either
		// its across clue number or its down clue number (or
		// both)

		if (x === 0 || grid[y][x - 1].isBlockCell) {
			// This is either at the left edge of the puzzle or
			// is bounded on the left by a block cell. This clue
			// number defines (at least) the cell's across clue number
			containingClues.across = clueNumber;
		}
		else {
			// At least one cell exists to the left of this cell; this
			// is not an across clue number. It must be a down clue number.
			containingClues.down = clueNumber;
		}
	}

	if (!containingClues.across) {
		// Haven't found the across clue number yet.
		// Look to the left until we find a block cell or the edge of
		// the puzzle
		if (x === 0 && !_.isUndefined(clueNumber)) {
			containingClues.across = clueNumber;
		}
		else {
			for (i = x; i >= 0; i--) {
				if (grid[y][i].isBlockCell) {
					break;
				}

				containingClues.across = grid[y][i].clueNumber;
			}
		}
	}

	if (!containingClues.down) {
		// Look at cells in other rows at the same index until we find a
		// cell with a clue number
		if (y === 0 && !_.isUndefined(clueNumber)) {
			// Top of the puzzle
			containingClues.down = clueNumber;
		}
		else {
			for (i = y; i >= 0; i--) {
				if (grid[i][x].isBlockCell) {
					break;
				}
				
				containingClues.down = grid[i][x].clueNumber;
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

function Puzzle(definition) {
	if (!(this instanceof Puzzle)) {
		return new Puzzle(definition);
	}

	this.initialize(definition);
}

Puzzle.prototype = Object.create(null, {
	toString: {
		configurable: true,
		value: function() {
			return '[object Puzzle]';
		}
	},

	initialize: {
		configurable: true,
		value: function(definition) {
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
	},

	getGridString: {
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
