import { Grid } from "./Grid";
import { IPuzzleClues, IPuzzleInfo, IPuzzleConstructorArgs, IPuzzleJSON } from "./puzzle-utils";
/**
 * Represents a puzzle object
 */
export default class Puzzle {
    /**
     * The definition of the puzzle grid. It is represented as an array of rows, so
     * `grid[0]` is the first row of the puzzle.
     */
    grid: Grid;
    /**
     * Listing of clues for the puzzle.
     */
    clues: IPuzzleClues;
    info: IPuzzleInfo;
    /**
     * A structure representing the current solution as the user has filled it out.
     * The structure is similar to {@link Grid}, but each item is a string
     * containing the user's current answer--an empty string if the corresponding
     * grid cell is not filled in, a non-empty string if it's filled in.
     */
    userSolution: Array<Array<string | null>>;
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
    info, }: IPuzzleConstructorArgs);
    findContainingClues({ rowIndex, columnIndex, }: {
        rowIndex: number;
        columnIndex: number;
    }): {
        across?: number | undefined;
        down?: number | undefined;
    };
    processGrid(): import("./Grid").GridCell[][];
    updateGrid(): void;
    hashCode(): number;
    toJSON(): IPuzzleJSON;
    toString(): string;
    /**
     * Returns a deep copy of this puzzle.
     */
    clone(): Puzzle;
    equals(other: any): boolean;
    private getInGrid;
    private setInGrid;
}
//# sourceMappingURL=puzzle.d.ts.map