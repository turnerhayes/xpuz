"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * JPZ Parser
 *
 * @description Parses .jpz formatted puzzles (NOT CURRENTLY IMPLEMENTED)
 * @module xpuz/parsers/jpz
 */
function _parsePuzzle(puzzle) {
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
    parse(puzzle) {
        return _parsePuzzle(puzzle);
    }
}
exports.default = JPZParser;
//# sourceMappingURL=jpz.js.map