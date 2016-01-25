"use strict";

var _ = require('lodash');
var BlockCell = require('./cells/block');
var CrosswordCell = require('./cells/crossword');

function Puzzle(definition) {
	if (!(this instanceof Puzzle)) {
		return new Puzzle(definition);
	}

	var puzzle = this;

	puzzle.grid = definition.grid || [];

	puzzle.clues = definition.clues || {"Across": [], "Down": []};
}

Puzzle.prototype = Object.create(null, {
	toString: {
		configurable: true,
		value: function() {
			return '[object Puzzle]';
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

							if (cell instanceof BlockCell) {
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
