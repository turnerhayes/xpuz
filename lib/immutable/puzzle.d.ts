import { List, Record } from "immutable";
import { Grid, GridCell, ImmutableGrid, ImmutableGridCell } from "../Grid";
import { ImmutablePuzzleClues, IPuzzleClues, IPuzzleInfo, IPuzzleJSON } from "../puzzle-utils";
declare const PuzzleInfo_base: Record.Class;
export declare class PuzzleInfo extends PuzzleInfo_base {
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
    readonly grid: ImmutableGrid;
    readonly clues: ImmutablePuzzleClues;
    readonly userSolution: List<List<string | null>>;
    readonly info: PuzzleInfo;
    /**
     * @param args.grid - the grid for the puzzle
     * @param args.clues - the
     * puzzle clues
     * @param  [args.userSolution] - the guesses that the user has entered for
     * this puzzle, as a two-dimensional array of array of strings with the same
     * dimensions as the `grid` where each cell is either a string with the
     * user's input or `null` if it corresponds to a block cell in the grid
     * @param [args.info] - information about the puzzle
     */
    constructor({ grid, clues, userSolution, info, }: {
        grid: Grid | ImmutableGrid;
        clues: IPuzzleClues | ImmutablePuzzleClues;
        userSolution: Array<Array<string | null>> | List<List<string | null>>;
        info: IPuzzleInfo | PuzzleInfo;
    });
    processGrid(): ImmutableGrid;
    updateGrid(): ImmutablePuzzle;
    updateCell(column: number, row: number, cell: GridCell | ImmutableGridCell): ImmutablePuzzle;
    toJSON(): IPuzzleJSON;
    toString(): string;
}
export {};
//# sourceMappingURL=puzzle.d.ts.map