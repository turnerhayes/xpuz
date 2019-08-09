import each from "lodash/each";
import { Grid, GridCell, IInputCell } from "./Grid";
import Puzzle from "./puzzle";
import { IClueMap, IPuzzleClues } from "./puzzle-utils";

export default class PuzzleBuilder {
  private grid: Grid = [];

  private clues: IPuzzleClues = {
    across: {},
    down: {},
  };

  private clueArrays = {
    across: [],
    down: [],
  };

  private openRow?: GridCell[];

  private cell?: GridCell|{};

  public addRow(): this {
    this.closeRow();

    this.openRow = [];

    return this;
  }

  public addCell() {
    if (!this.openRow) {
      throw new Error("`addCell` called without an open row");
    }

    return this._addCell();
  }

  public solution(solutionLetter: string) {
    if (!this.cell) {
      throw new Error("`solution` called without a cell");
    }

    (this.cell as IInputCell).solution = solutionLetter;

    return this;
  }

  public addBlockCell() {
    if (!this.openRow) {
      throw new Error("`addBlockCell` called without an open row");
    }

    return this._addCell({
      isBlockCell: true
    });
  }

  public addAcrossClues(clues: IClueMap) {
    each(
      clues,
      (clueText, clueNumber) => {
        this.clues.across[clueNumber] = clueText;
      }
    );

    return this;
  }

  public addAcrossClue(clueNumber: number|string, clueText: string) {
    const clues: IClueMap = {};

    clues[clueNumber] = clueText;

    return this.addAcrossClues(clues);
  }

  public addDownClues(clues: IClueMap) {
    each(
      clues,
      (clueText, clueNumber) => {
        this.clues.down[clueNumber] = clueText;
      }
    );

    return this;
  }

  public addDownClue(clueNumber: number|string, clueText: string) {
    const clues: IClueMap = {};

    clues[clueNumber] = clueText;

    return this.addDownClues(clues);
  }

  public build() {
    this.closeRow();

    let maxRowLength = 0;

    each(
      this.grid,
      (row) => {
        if (row.length > maxRowLength) {
          maxRowLength = row.length;
        }
      }
    );

    each(
      this.grid,
      (row) => {
        if (row.length < maxRowLength) {
          this.openRow = row;

          this.addBlocks(maxRowLength - row.length + 1);
        }
      }
    );

    return new Puzzle({
      grid: this.grid,
      clues: this.clues
    });
  }

  public toString() {
    return "[object PuzzleBuilder]";
  }

  private _addCell(
    options: {
      isBlockCell?: boolean,
      solution?: string,
    } = {}
  ): this {
    this.closeCell();

    this.cell = options.isBlockCell ?
      { isBlockCell: true } :
      {};

    if (options.solution) {
      (this.cell as IInputCell).solution = options.solution;
    }

    return this;
  }

  private addBlocks(count: number): this {
    for (let i = 0; i < count; i++) {
      this.addBlockCell();
    }

    return this;
  }

  private closeRow(): this {
    if (!this.openRow) {
      return this;
    }

    this.closeCell();

    this.grid.push(this.openRow);

    this.openRow = undefined;

    return this;
  }

  private closeCell(): this {
    if (!this.openRow || !this.cell) {
      return this;
    }

    this.openRow.push(this.cell);

    this.cell = undefined;

    return this;
  }
}
