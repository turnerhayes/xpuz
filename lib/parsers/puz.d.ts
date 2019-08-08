/// <reference types="node" />
import Puzzle from "../puzzle";
import ImmutablePuzzle from "../immutable/puzzle";
export declare type PuzzleContent = string | Buffer | ArrayBufferLike;
export interface ITimingState {
    elapsed: number;
    running: boolean;
}
export interface ICurrentCellStates {
    PreviouslyIncorrect: boolean;
    CurrentlyIncorrect: boolean;
    AnswerGiven: boolean;
    Circled: boolean;
}
export declare const enum CellStates {
    PreviouslyIncorrect = 16,
    CurrentlyIncorrect = 32,
    AnswerGiven = 64,
    Circled = 128
}
/**
 * Parser class for PUZ-formatted puzzles.
 *
 * @constructor
 */
declare class PUZParser<T extends Puzzle | ImmutablePuzzle = Puzzle> {
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
    path: PuzzleContent, options?: {
        solutionKey?: string;
        converter?: (puzzle: Puzzle) => T;
    }): Promise<T>;
    /**
     * Given a {@link module:xpuz/puzzle~Puzzle|Puzzle} object, returns a {@link external:Buffer|Buffer}
     * containing the puzzle in .puz format.
     *
     * @throws if `options.scrambled` is true but `options.solutionKey` is not a 4-digit integer
     *	(between 1000 and 9999, inclusive).
     */
    generate(puzzle: T, options?: {
        /**
         * If true, the puzzle's solution will be scrambled
   *
   * @deprecated ignored; will be scrambled if solutionKey is defined and non-empty
         */
        scrambled?: boolean;
        solutionKey?: string;
    }): Buffer;
    private unscrambleSolution;
    private getPuzzleData;
    private parseExtensions;
    private processExtensions;
    private unflattenSolution;
    private generateGridAndClues;
    private readClues;
    private readHeader;
}
export default PUZParser;
//# sourceMappingURL=puz.d.ts.map