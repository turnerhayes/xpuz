import BasePuzzle, { IPuzzleConstructorArgs } from "./base-puzzle";
/**
 * Represents a puzzle object
 */
export default class Puzzle extends BasePuzzle {
    constructor({ grid, 
    /**
     * A list of clues for across and down, with each collection having the
     * key as the clue number and the value as the clue text (e.g.
     * `{across: { 3: "some clue" }}`)
     */
    clues, 
    /**
     * The currently filled in guesses of the user stored with this puzzle
     * instance. Two dimensional array with the same dimensions as `grid`,
     * where each cell is either a string or `null` (for block cells)
     */
    userSolution, 
    /**
     * Information about the puzzle
     */
    info, 
    /**
     * Extra, possibly implementation-specific information about the puzzle,
     * such as timer information
     */
    extensions, }: IPuzzleConstructorArgs);
    /**
     * Returns a deep copy of this puzzle.
     */
    clone(): Puzzle;
}
//# sourceMappingURL=puzzle.d.ts.map