import { Map, OrderedMap } from "immutable";
import { Grid } from "./Grid";
export declare type GetterFunction = (path: Array<string | number>) => any;
export declare type SetterFunction<T = any> = (path: Array<string | number>, value: any) => T;
export declare type SizeOfFunction = (item: any) => number;
export declare type DirectionKey = "across" | "down";
export interface IClueMap {
    [clueNumber: string]: string;
}
export interface IPuzzleInfo {
    title?: string;
    author?: string;
    publisher?: string;
    copyright?: string;
    intro?: string;
    difficulty?: any;
    formatExtra?: any;
}
export interface IPuzzleClues {
    across: IClueMap;
    down: IClueMap;
}
export interface IPuzzleJSON {
    grid: Grid;
    clues: IPuzzleClues;
    userSolution: Array<Array<string | null>>;
    info: IPuzzleInfo;
}
export declare type ImmutablePuzzleClues = Map<DirectionKey, OrderedMap<number, string>>;
export interface IPuzzleConstructorArgs {
    grid: Grid;
    clues: IPuzzleClues;
    info?: IPuzzleInfo;
    userSolution?: Array<Array<string | null>>;
    solution?: Array<Array<string | null>>;
}
/**
 * Finds which across and down clues a grid cell is a member of.
 *
 * @return {{across: ?number, down: ?number}} the clue numbers for the clues
 * that contain this cell (one or both of `across` and `down` keys may be
 * populated)
 */
export declare const findContainingClues: ({ grid, rowIndex, columnIndex, get, sizeOf, width, height, }: {
    grid: import("./Grid").GridCell[][] | import("immutable").List<import("immutable").List<import("./Grid").ImmutableGridCell>>;
    rowIndex: number;
    columnIndex: number;
    get: GetterFunction;
    sizeOf?: SizeOfFunction | undefined;
    width?: number | undefined;
    height?: number | undefined;
}) => {
    across?: number | undefined;
    down?: number | undefined;
};
/**
 * Determines whether a cell in the grid is at the start of a down or across clue (or
 * both), and thus should be given a clue number.
 *
 * @return {boolean} whether or not the specified cell should be given a clue number
 */
export declare const hasClueNumber: ({ grid, rowIndex, columnIndex, get, sizeOf, width, height, }: {
    grid: import("./Grid").GridCell[][] | import("immutable").List<import("immutable").List<import("./Grid").ImmutableGridCell>>;
    rowIndex: number;
    columnIndex: number;
    get: GetterFunction;
    sizeOf?: SizeOfFunction | undefined;
    width?: number | undefined;
    height?: number | undefined;
}) => boolean;
/**
 * Updates the grid with the correct cell information (clue numbers, etc.)
 */
export declare const processGrid: <T extends import("./Grid").GridCell[][] | import("immutable").List<import("immutable").List<import("./Grid").ImmutableGridCell>>>({ grid, get, set, sizeOf, width, height, processValue, }: {
    grid: T;
    get: GetterFunction;
    set: SetterFunction<T>;
    sizeOf: SizeOfFunction;
    width?: number | undefined;
    height?: number | undefined;
    processValue?: ((value: any) => any) | undefined;
}) => T;
//# sourceMappingURL=puzzle-utils.d.ts.map