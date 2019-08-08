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
     * @return {T} a promise that resolves with
     *	the parsed puzzle object
     */
    async parse(path, options) {
        let puzzle = await _parsePuzzle(path);
        if (options.converter) {
            return options.converter(puzzle);
        }
        return puzzle;
    }
    generate(puzzle, options) {
        throw new Error("Not implemented");
    }
}
exports.default = JPZParser;
//# sourceMappingURL=jpz.js.map