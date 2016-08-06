"use strict";

/**
 * JPZ Parser
 *
 * @description Parses .jpz formatted puzzles (NOT CURRENTLY IMPLEMENTED)
 * @module xpuz/parsers/jpz
 */

const fs = require('fs');
const _  = require('lodash');
const Q = require('q');
const Puzzle = require('../lib/puzzle');

/**
 * JPZ parser class
 */
class JPZParser {
	/**
	 * @description Parses a {@link module:xpuz/puzzle~Puzzle} from the input
	 * @param puzzle {string|object} the source to parse the puzzle from; if a string,
	 *	it is assumed to be a file path, if an object, it defines a Puzzle object
	 * @returns {module:xpuz/puzzle~Puzzle} the parsed puzzle object
	 */
	parse(puzzle) {
		let filePath;

		let deferred = Q.defer();

		if (_.isString(puzzle)) {
			// path to puzzle
			filePath = puzzle;
			try {
				deferred.resolve(new Puzzle(String(fs.readFileSync(filePath))));
			}
			catch (ex) {
				deferred.reject(
					new Error('Unable to read JPZ puzzle from file ' +
						puzzle + ': ' + ex.message)
				);
			}
		}
		else if (_.isObject(puzzle)) {
			deferred.resolve(new Puzzle());
		}
		else {
			deferred.reject(new Error('parse() expects either a path string or a JSON object'));
		}

		return deferred.promise;
	}
}

exports = module.exports = JPZParser;
