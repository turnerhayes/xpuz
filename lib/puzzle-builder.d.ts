import Puzzle from "./puzzle";
import { IClueMap } from "./puzzle-utils";
export default class PuzzleBuilder {
    private grid;
    private clues;
    private clueArrays;
    private openRow?;
    private cell?;
    addRow(): this;
    addCell(): this;
    solution(solutionLetter: string): this;
    addBlockCell(): this;
    addAcrossClues(clues: IClueMap): this;
    addAcrossClue(clueNumber: number | string, clueText: string): this;
    addDownClues(clues: IClueMap): this;
    addDownClue(clueNumber: number | string, clueText: string): this;
    build(): Puzzle;
    toString(): string;
    private _addCell;
    private addBlocks;
    private closeRow;
    private closeCell;
}
//# sourceMappingURL=puzzle-builder.d.ts.map