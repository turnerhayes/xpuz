"use strict";

var fs = require('fs');
var _  = require('lodash');
var Puzzle = require('./puzzle');
var BlockCell = require('./cells/block');
var CrosswordCell = require('./cells/crossword');

var BLOCK_VALUE = '#';

function _checkDimensions(puzzle) {
	var errors = [];

	var maxCellWidth = _.max(
		puzzle.puzzle,
		'length'
	).length;

	var numRows = puzzle.puzzle.length;

	if (maxCellWidth > puzzle.dimensions.width) {
		errors.push('Too many puzzle cells (' + maxCellWidth +
			') for puzzle width (' + puzzle.dimensions.width + ')');
	}

	if (numRows > puzzle.dimensions.height) {
		errors.push('Too many puzzle cells (' + numRows +
			') for puzzle height (' + puzzle.dimensions.height + ')');
	}

	return errors;
}

function _getClueNumber(cell) {
	return _.isObject(cell) ?
		cell.cell :
		cell;
}

function _convertPuzzle(ipuz) {
	var puzzle = new Puzzle({
		grid: _.map(
			ipuz.puzzle,
			function(row, rowIndex) {
				return _.map(
					row,
					function(cell, index) {
						if (cell === BLOCK_VALUE) {
							return {
								isBlockCell: true
							};
						}

						var i;

						var clueNumber = _getClueNumber(cell);

						var containingClues = {};

						if (!_.isUndefined(clueNumber)) {
							// This cell is a clue number cell--it defines either
							// its across clue number or its down clue number (or
							// both)

							if (index === 0 || row[index - 1] === BLOCK_VALUE) {
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
							if (index === 0 && !_.isUndefined(clueNumber)) {
								containingClues.across = clueNumber;
							}
							else {
								for (i = index; i >= 0; i--) {
									if (row[i] == BLOCK_VALUE) {
										break;
									}

									containingClues.across = _getClueNumber(row[i]);
								}
							}
						}

						if (!containingClues.down) {
							// Look at cells in other rows at the same index until we find a
							// cell with a clue number
							if (rowIndex === 0 && !_.isUndefined(clueNumber)) {
								// Top of the puzzle
								containingClues.down = clueNumber;
							}
							else {
								for (i = rowIndex; i >= 0; i--) {
									if (ipuz.puzzle[i][index] === BLOCK_VALUE) {
										break;
									}
									
									containingClues.down = _getClueNumber(ipuz.puzzle[i][index]);
								}
							}
						}

						return {
							clueNumber: clueNumber,
							backgroundShape: _.get(cell, 'style.shapebg'),
							containingClues: containingClues
						};
					}
				);
			}
		),
		clues: {
			across: _.map(
				ipuz.clues.Across,
				function(clue) {
					return {
						clueNumber: clue[0],
						clueText: clue[1]
					};
				}
			),
			down: _.map(
				ipuz.clues.Down,
				function(clue) {
					return {
						clueNumber: clue[0],
						clueText: clue[1]
					};
				}
			)
		}
	});

	return puzzle;
}

function IPUZParser(puzzle) {
	if (!(this instanceof IPUZParser)) {
		return new IPUZParser(puzzle);
	}
}


IPUZParser.prototype = Object.create(Object.prototype, {
	parse: {
		value: function(puzzle) {
			var parser = this;
			var filePath;

			if (_.isString(puzzle)) {
				// path to puzzle
				filePath = puzzle;
				try {
					puzzle = JSON.parse(String(fs.readFileSync(filePath)));
				}
				catch (ex) {
					throw new Error('Unable to read IPUZ puzzle from file ' +
						puzzle + ': ' + ex.message);
				}
			}
			else if (_.isObject(puzzle)) {
				puzzle = puzzle;
			}
			else {
				throw new Error('parse() expects either a path string or a JSON object');
			}

			var errors = parser.validatePuzzle(puzzle);

			if (!_.isUndefined(errors)) {
				throw new Error('Invalid puzzle:\n\t' + errors.join('\n\t'));
			}

			return _convertPuzzle(puzzle);
		}
	},

	validatePuzzle: {
		value: function(puzzle) {
			var errors = [];

			if (!puzzle.dimensions) {
				errors.push("Puzzle is missing 'dimensions' key");
			}

			if (puzzle.puzzle) {
				errors = errors.concat(_checkDimensions(puzzle));
			}
			else {
				errors.push("Puzzle is missing 'puzzle' key");
			}

			console.log('errors: ', errors);
			
			if (_.size(errors) === 0) {
				return undefined;
			}

			return errors;
		}
	}
});

exports = module.exports = IPUZParser;
