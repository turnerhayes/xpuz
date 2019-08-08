export declare enum PuzzleType {
    Normal = 1,
    Diagramless = 1025
}
export declare enum SolutionState {
    Unlocked = 0,
    Locked = 4
}
export interface IHeaderData {
    version: string;
    width: number;
    height: number;
    numberOfClues: number;
    puzzleType: PuzzleType;
    solutionState: SolutionState;
}
export declare type ExtensionName = "GRBS" | "RTBL" | "LTIM" | "GEXT" | "RUSR";
//# sourceMappingURL=common.d.ts.map