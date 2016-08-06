"use strict";

/**
 * IPUZ Parser
 *
 * @description Parses .ipuz formatted puzzles
 * @module xpuz/parsers/ipuz
 */

const fs     = require('fs');
const _      = require('lodash');
const Q      = require('q');
const Puzzle = require('../lib/puzzle');

const BLOCK_VALUE = '#';

function _checkDimensions(puzzle) {
	let errors = [];

	let maxCellWidth = _.max(
		puzzle.puzzle,
		'length'
	).length;

	let numRows = puzzle.puzzle.length;

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
	function _addClue(obj, clue) {
		obj[clue[0]] = clue[1];

		return obj;
	}

	let puzzle = new Puzzle({
		title: ipuz.title,
		author: ipuz.author,
		copyright: ipuz.copyright,
		publisher: ipuz.publisher,
		difficulty: ipuz.difficulty,
		intro: ipuz.intro,
		grid: _.map(
			ipuz.puzzle,
			function(row) {
				return _.map(
					row,
					function(cell) {
						if (cell === BLOCK_VALUE) {
							return {
								isBlockCell: true
							};
						}

						return {
							clueNumber: _getClueNumber(cell),
							backgroundShape: _.get(cell, 'style.shapebg')
						};
					}
				);
			}
		),
		clues: {
			across: _.reduce(
				ipuz.clues.across,
				_addClue,
				{}
			),
			down: _.reduce(
				ipuz.clues.down,
				_addClue,
				{}
			)
		}
	});

	return puzzle;
}

function _validatePuzzle(puzzle) {
	let errors = [];

	if (!puzzle.dimensions) {
		errors.push("Puzzle is missing 'dimensions' key");
	}

	if (puzzle.puzzle) {
		errors = errors.concat(_checkDimensions(puzzle));
	}
	else {
		errors.push("Puzzle is missing 'puzzle' key");
	}

	if (_.size(errors) === 0) {
		return undefined;
	}

	return errors;
}

/**
 * @description Parser class for IPUZ-formatted puzzles
 */
class IPUZParser {
	/**
	 * @description Parses a {@link module:xpuz/puzzle~Puzzle} from the input
	 * @param puzzle {string|object} the source to parse the puzzle from; if a string,
	 *	it is assumed to be a file path, if an object, it defines a Puzzle object
	 * @returns {module:xpuz/puzzle~Puzzle} the parsed puzzle object
	 */
	parse(puzzle) {
		const parser = this;
		let filePath;

		let deferred = Q.defer();

		if (_.isString(puzzle)) {
			// path to puzzle
			filePath = puzzle;
			try {
				puzzle = JSON.parse(String(fs.readFileSync(filePath)));
			}
			catch (ex) {
				deferred.reject(
					'Unable to read IPUZ puzzle from file ' +
						puzzle + ': ' + ex.message
				);

				return deferred.promise;
			}
		}
		else if (_.isObject(puzzle)) {
			puzzle = puzzle;
		}
		else {
			deferred.reject(
				'parse() expects either a path string or a JSON object'
			);

			return deferred.promise;
		}

		let errors = _validatePuzzle(puzzle);

		if (!_.isUndefined(errors)) {
			deferred.reject(
				'Invalid puzzle:\n\t' + errors.join('\n\t')
			);
		}
		else {
			deferred.resolve(_convertPuzzle(puzzle));
		}

		return deferred.promise;
	}
}

exports = module.exports = IPUZParser;
