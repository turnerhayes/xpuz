/**
 * JPZ Parser
 *
 * @description Parses .jpz formatted puzzles (NOT CURRENTLY IMPLEMENTED)
 * @module xpuz/parsers/jpz
 */

const isString = require("lodash/isString");
const isObject = require("lodash/isObject");
const Promise  = require("bluebird");
const fs       = require("fs");
// fs is stubbed out for browser builds
const readFile = fs.readFile ? Promise.promisify(fs.readFile) : () => {};
const Puzzle   = require("../lib/puzzle");

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
		if (isString(puzzle)) {
			// path to puzzle
			return readFile(puzzle).then(
				(fileContent) => new Puzzle(fileContent.toString())
			).catch(
				(ex) => {
					throw new Error("Unable to read JPZ puzzle from file " +
						puzzle + ": " + ex.message);
				}
			);
		}
		else if (isObject(puzzle)) {
			return Promise.resolve(new Puzzle(puzzle));
		}
		else {
			return Promise.reject(new Error("parse() expects either a path string or an object"));
		}
	}
}

exports = module.exports = JPZParser;
