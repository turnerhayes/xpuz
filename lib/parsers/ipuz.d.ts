/**
 * IPUZ file parser.
 *
 * @module xpuz/parsers/ipuz
 */
import ImmutablePuzzle from "../immutable/puzzle";
import Puzzle from "../puzzle";
export interface IIPUZPuzzle {
    puzzle: Array<[]>;
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
        Across: Array<[number, string]>;
        Down: Array<[number, string]>;
    };
}
/**
 * Parser class for IPUZ-formatted puzzles
 */
declare class IPUZParser<T extends (Puzzle | ImmutablePuzzle) = Puzzle> {
    /**
     * Parses a {@link Puzzle} from the input.
     */
    parse(puzzle: string | IIPUZPuzzle, options?: {
        converter?: (puzzle: Puzzle) => T;
    }): Promise<T>;
    generate(puzzle: T, options?: {
        preprocessor?: (puzzle: T) => Puzzle;
    }): Promise<IIPUZPuzzle>;
}
export default IPUZParser;
//# sourceMappingURL=ipuz.d.ts.map