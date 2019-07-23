import Puzzle from "../puzzle";

/**
 * JPZ Parser
 *
 * @description Parses .jpz formatted puzzles (NOT CURRENTLY IMPLEMENTED)
 * @module xpuz/parsers/jpz
 */

function _parsePuzzle(puzzle: string|{}): Promise<Puzzle> {
	throw new Error("JPZ puzzle parser not implemented");
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
	parse(puzzle: any) {
		return _parsePuzzle(puzzle);
	}
}

export default JPZParser;
