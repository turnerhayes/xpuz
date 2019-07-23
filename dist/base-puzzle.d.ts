import { Grid, IGridCell } from "./Grid";
export declare type ClueMap = {
    [clueNumber: string]: string;
};
export interface IPuzzleInfo {
    title?: string;
    author?: string;
    publisher?: string;
    copyright?: string;
    intro?: string;
    difficulty?: any;
}
export interface IPuzzleClues {
    across: ClueMap;
    down: ClueMap;
}
export interface IPuzzleConstructorArgs {
    grid: Grid;
    clues: {
        across: ClueMap;
        down: ClueMap;
    };
    info: IPuzzleInfo;
    extensions?: {};
    userSolution?: string[][];
}
export default abstract class BasePuzzle {
    /**
       * The definition of the puzzle grid. It is represented as an array of rows, so
       *	`grid[0]` is the first row of the puzzle.
       */
    grid: Grid;
    /**
     * Listing of clues for the puzzle.
     */
    clues: IPuzzleClues;
    info: IPuzzleInfo;
    /**
       * A structure representing the current solution as the user has filled it out.
       *	The structure is similar to {@link Grid}, but
     *	each item is a string containing the user's current answer--an empty string
     *	if the corresponding grid cell is not filled in, a non-empty string if it's
     *	filled in.
     */
    userSolution: Array<(string | null)[]>;
    /**
     * A collection of extra, possibly implementation-dependent data about the puzzle,
     * such as timer information.
     */
    extensions: object;
    constructor({ grid, clues, info, userSolution, extensions, }: IPuzzleConstructorArgs);
    protected get(path: any[]): any;
    protected set(path: any[], value: any): Grid;
    protected sizeOf(value: Iterable<any>): number;
    protected readonly width: number;
    protected readonly height: number;
    equals(other: any): boolean;
    /**
     * Finds which across and down clues a grid cell is a member of.
     *
     * @param {number} args.rowIndex - the index of the row on which the cell occurs
     * @param {number} args.columnIndex - the index of the column on which the cell occurs
     *
     * @return {{across: ?number, down: ?number}} the clue numbers for the clues that contain this cell
     *	(one or both of `across` and `down` keys may be populated)
     */
    findContainingClues({ 
    /**
     * The index of the row on which the cell occurs
     */
    rowIndex, 
    /**
     * The index of the column on which the cell occurs
     */
    columnIndex, }: {
        rowIndex: number;
        columnIndex: number;
    }): {
        across?: number;
        down?: number;
    };
    /**
     * Determines whether a cell in the grid is at the start of a down or across clue (or
     * both), and thus should be given a clue number.
     *
     * @return {boolean} whether or not the specified cell should be given a clue number
     */
    hasClueNumber({ 
    /**
     * The index of the row on which the cell occurs
     */
    rowIndex, 
    /**
     * The index of the column on which the cell occurs
     */
    columnIndex, }: {
        rowIndex: number;
        columnIndex: number;
    }): boolean | undefined;
    /**
     * Returns a hash code integer for this object.
     *
     * @return {number} the object's hash code
     */
    hashCode(): any;
    /**
     * Returns this puzzle as a plain Javascript object, suitable for serializing to JSON.
     *
     * @returns {object} object representation of this puzzle object
     */
    toJSON(): {
        grid: Grid;
        clues: IPuzzleClues;
        userSolution: Array<(string | null)[]>;
        info: IPuzzleInfo;
        extensions: {};
    };
    /**
     * Updates the cells of the grid to have accurate clue numbering and `containingClues` properties.
      */
    updateGrid(grid?: Grid): this;
    /**
     * Sets the value of the specified cell and ensures that all cell information is kept up-to-date.
     *
     * @return {Puzzle|ImmutablePuzzle} the puzzle, with the updated cell information (return type is whatever
     *	type `this` is)
     */
    updateCell(
    /**
     * The column index of the cell to set
     */
    columnIndex: number, 
    /**
     * The row index of the cell to set
     */
    rowIndex: number, 
    /**
     * The cell information to set (this replaces the existing cell
     * information)
     */
    cell: IGridCell): this;
    /**
     * Updates the grid with the correct cell information (clue numbers, etc.)
     */
    processGrid(): IGridCell[][];
}
//# sourceMappingURL=base-puzzle.d.ts.map