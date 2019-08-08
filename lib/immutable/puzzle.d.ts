import { List, Record } from "immutable";
import { IPuzzleClues, IPuzzleInfo, ImmutablePuzzleClues, IPuzzleJSON } from "../puzzle-utils";
import { ImmutableGrid, ImmutableGridCell, Grid, GridCell } from "../Grid";
declare const PuzzleInfo_base: Record.Class;
declare class PuzzleInfo extends PuzzleInfo_base {
    readonly title: string;
    readonly author: string;
    readonly copyright: string;
    readonly intro: string;
    readonly publisher: string;
    readonly difficulty: any;
    readonly formatExtra?: any;
}
declare const ImmutablePuzzle_base: Record.Class;
/**
 * Represents an immutable version of {@link xpuz.Puzzle|Puzzle}.
 *
 * @extends Record
 * @memberof xpuz
 *
 * @mixes xpuz.PuzzleMixin
 */
export default class ImmutablePuzzle extends ImmutablePuzzle_base {
    /**
     * @param {object} args - the constructor arguments
     * @param {Types.ImmutableGrid|Types.Grid} args.grid - the grid for the puzzle
     * @param {{across: object, down: object}|external:Immutable.Map<{across: external:Immutable.Map, down: external:Immutable.Map}>} args.clues - the
     *	puzzle clues
     * @param {Array<string[]>|external:Immutable.List<external:Immutable.List<string>>} [args.userSolution] - the guesses that the user
     *	has entered for this puzzle, as a two-dimensional array of array of strings with the same dimensions as the `grid` where
     *	each cell is either a string with the user's input or `null` if it corresponds to a block cell in the grid
     * @param {xpuz.PuzzleInfo|object} [args.info] - information about the puzzle
     */
    constructor({ grid, clues, userSolution, info, }: {
        grid: Grid | ImmutableGrid;
        clues: IPuzzleClues | ImmutablePuzzleClues;
        userSolution: ((string | null)[][]) | (List<List<string | null>>);
        info: IPuzzleInfo | PuzzleInfo;
    });
    processGrid(): ImmutableGrid;
    updateGrid(): ImmutablePuzzle;
    updateCell(column: number, row: number, cell: GridCell | ImmutableGridCell): ImmutablePuzzle;
    toJSON(): IPuzzleJSON;
    toString(): string;
    readonly grid: ImmutableGrid;
    readonly clues: ImmutablePuzzleClues;
    readonly userSolution: List<List<string | null>>;
    readonly info: PuzzleInfo;
}
export {};
//# sourceMappingURL=puzzle.d.ts.map