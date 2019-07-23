/**
 * PUZ file parser.
 *
 * @module xpuz/parsers/puz
 * @see {@link module:xpuz/puzzle|Puzzle}
 */
/// <reference types="node" />
import Puzzle from "../puzzle";
export declare enum PuzzleType {
    Normal = 1,
    Diagramless = 1025
}
export declare enum SolutionState {
    Unlocked = 0,
    Locked = 4
}
export declare const enum CellStates {
    PreviouslyIncorrect = 16,
    CurrentlyIncorrect = 32,
    AnswerGiven = 64,
    Circled = 128
}
export declare type ExtensionName = "GRBS" | "RTBL" | "LTIM" | "GEXT" | "RUSR";
export declare type PuzzleContent = string | Buffer | ArrayBufferLike;
export interface IPuzzleParseOptions {
    solutionKey?: number;
}
/**
 * Parser class for PUZ-formatted puzzles.
 *
 * @constructor
 */
declare class PUZParser {
    /**
     * Parses a file in .puz format into a {@link Puzzle} object.
     *
     * If the puzzle is not locked and an `options.solutionKey` was specified,
     * the solutionKey will be ignored.
     *
     * @throws if the puzzle is locked and an invalid (or no)
     * `options.solutionKey` was provided
     */
    parse(
    /**
     * the .puz file to parse, either as a file path or a {@link Buffer} or
     * {@link ArrayBuffer} containing the puzzle content
     */
    path: PuzzleContent, options?: IPuzzleParseOptions): Promise<Puzzle>;
    /**
     * Given a {@link module:xpuz/puzzle~Puzzle|Puzzle} object, returns a {@link external:Buffer|Buffer}
     * containing the puzzle in .puz format.
     *
     * @throws if `options.scrambled` is true but `options.solutionKey` is not a 4-digit integer
     *	(between 1000 and 9999, inclusive).
     */
    generate(puzzle: Puzzle, options?: {
        /**
         * If true, the puzzle's solution will be scrambled
         */
        scrambled?: boolean;
        solutionKey?: string;
    }): Buffer;
}
export default PUZParser;
//# sourceMappingURL=puz.d.ts.map