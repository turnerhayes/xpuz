"use strict";

/**
 * JPZ Parser
 *
 * @description Parses .jpz formatted puzzles (NOT CURRENTLY IMPLEMENTED)
 * @module xpuz/parsers/jpz
 */

var fs = require('fs');
var _  = require('lodash');
var Q = require('q');
var Puzzle = require('../lib/puzzle');

/**
 * JPZ parser class
 */
function JPZParser() {
	if (!(this instanceof JPZParser)) {
		return new JPZParser();
	}
}

JPZParser.prototype = Object.create(Object.prototype, {
	/**
	 * @description Parses a {@link module:xpuz/puzzle~Puzzle} from the input
	 * @param puzzle {string|object} the source to parse the puzzle from; if a string,
	 *	it is assumed to be a file path, if an object, it defines a Puzzle object
	 * @returns {module:xpuz/puzzle~Puzzle} the parsed puzzle object
	 */
	parse: {
		configurable: true,
		value: function parse(puzzle) {
			var filePath;

			var deferred = Q.defer();

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
});

exports = module.exports = JPZParser;
