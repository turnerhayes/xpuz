/**
 * JPZ Parser
 *
 * @description Parses .jpz formatted puzzles (NOT CURRENTLY IMPLEMENTED)
 * @module xpuz/parsers/jpz
 */

const isString        = require("lodash/isString");
const isObject        = require("lodash/isObject");
const Promise         = require("bluebird");
const fs              = require("fs");
// fs is stubbed out for browser builds
const readFile        = fs.readFile ? Promise.promisify(fs.readFile) : () => {};
const Puzzle          = require("../lib/puzzle");
const ImmutablePuzzle = require("../lib/puzzle/immutable");


function _parsePuzzle(puzzle, immutable) {
	return new Promise(
		(resolve, reject) => {
			if (isString(puzzle)) {
				// path to puzzle
				return readFile(puzzle).then(
					(fileContent) => resolve(new (immutable ? ImmutablePuzzle : Puzzle)(fileContent.toString()))
				).catch(
					(ex) => {
						reject(new Error("Unable to read JPZ puzzle from file " +
							puzzle + ": " + ex.message));
					}
				);
			}
			else if (isObject(puzzle)) {
				return resolve(new (immutable ? ImmutablePuzzle : Puzzle)(puzzle));
			}
			else {
				return reject(new Error("parse() expects either a path string or an object"));
			}
		}
	);
}

/**
 * JPZ parser class
 */
class JPZParser {
	/**
	 * Parses a {@link module:xpuz/puzzle~Puzzle} from the input
	 *
	 * @param {string|object} puzzle - the source to parse the puzzle from; if a string,
	 *	it is assumed to be a file path, if an object, it defines a Puzzle object
	 *
	 * @return {external:Promise<module:xpuz/puzzle~Puzzle>} a promise that resolves with
	 *	the parsed puzzle object
	 */
	parse(puzzle) {
		return _parsePuzzle(puzzle);
	}

	parseImmutable(puzzle) {
		return _parsePuzzle(puzzle, immutable);
	}
}

exports = module.exports = JPZParser;
