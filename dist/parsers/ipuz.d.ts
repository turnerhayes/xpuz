/**
 * IPUZ file parser.
 *
 * @module xpuz/parsers/ipuz
 */
import Puzzle from "../puzzle";
export interface IIPUZPuzzle {
    puzzle: [][];
    dimensions: {
        width: number;
        height: number;
    };
    title: string;
    author: string;
    copyright: string;
    publisher: string;
    difficulty: any;
    intro: string;
    clues: {
        Across: [number, string][];
        Down: [number, string][];
    };
}
/**
 * Parser class for IPUZ-formatted puzzles
 */
declare class IPUZParser {
    /**
     * Parses a {@link module:xpuz/puzzle~Puzzle|Puzzle} from the input.
     */
    parse(puzzle: string | IIPUZPuzzle): Promise<Puzzle>;
}
export default IPUZParser;
//# sourceMappingURL=ipuz.d.ts.map