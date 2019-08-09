import hashIt from "hash-it";
import get from "lodash/get";
import isEqual from "lodash/isEqual";
import reduce from "lodash/reduce";
import set from "lodash/set";
import size from "lodash/size";

import { Grid } from "./Grid";
import {
  findContainingClues,
  IClueMap,
  IPuzzleClues,
  IPuzzleConstructorArgs,
  IPuzzleInfo,
  IPuzzleJSON,
  processGrid,
} from "./puzzle-utils";

/**
 * Represents a puzzle object
 */
export default class Puzzle {
  /**
   * The definition of the puzzle grid. It is represented as an array of rows, so
   * `grid[0]` is the first row of the puzzle.
   */
  public grid: Grid;

  /**
   * Listing of clues for the puzzle.
   */
  public clues: IPuzzleClues;

  public info: IPuzzleInfo;

  /**
   * A structure representing the current solution as the user has filled it out.
   * The structure is similar to {@link Grid}, but each item is a string
   * containing the user's current answer--an empty string if the corresponding
   * grid cell is not filled in, a non-empty string if it's filled in.
   */
  public userSolution: Array<Array<string|null>>;

  constructor(
    {
      grid,
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
    }: IPuzzleConstructorArgs
  ) {
    this.grid = grid || [];

    this.grid = processGrid<Grid>({
      grid: this.grid,
      get: this.getInGrid,
      set: this.setInGrid,
      sizeOf: size,
    });

    this.clues = clues || {
      across: {},
      down: {},
    };

    info = info || {};

    this.info = {
      title: info.title || "",
      author: info.author || "",
      copyright: info.copyright || "",
      publisher: info.publisher || "",
      difficulty: info.difficulty || "",
      intro: info.intro || "",
      formatExtra: info.formatExtra,
    };

    this.userSolution = userSolution || grid.map(
      (row) => row.map(
        (cell) => cell.isBlockCell ? null : ""
      )
    );
  }

  public findContainingClues(
    {
      rowIndex,
      columnIndex,
    }: {
      rowIndex: number,
      columnIndex: number,
    }
  ) {
    return findContainingClues({
      grid: this.grid,
      rowIndex,
      columnIndex,
      get: this.getInGrid,
      sizeOf: size,
    });
  }

  public processGrid() {
    return processGrid({
      grid: this.grid,
      get: this.getInGrid,
      set: this.setInGrid,
      sizeOf: size,
    });
  }

  public updateGrid() {
    this.grid = processGrid({
      grid: this.grid,
      get: this.getInGrid,
      set: this.setInGrid,
      sizeOf: size,
    });
  }

  public hashCode() {
    return hashIt(this);
  }

  public toJSON(): IPuzzleJSON {
    return {
      grid: this.grid,
      clues: this.clues,
      userSolution: this.userSolution,
      info: this.info,
    };
  }

  public toString() {
    return "Puzzle";
  }

  /**
   * Returns a deep copy of this puzzle.
   */
  public clone(): Puzzle {
    return new Puzzle(
      {
        grid: this.grid.map(
          (row) => row.map(
            (cell) => Object.assign({}, cell) // Clone (shallow) cell object
          )
        ),
        clues: {
          across: reduce(
            this.clues.across,
            (cloned: IClueMap, clue: string, clueNumber: string) => {
              cloned[clueNumber] = clue;

              return cloned;
            },
            {}
          ),
          down: reduce(
            this.clues.down,
            (cloned: IClueMap, clue: string, clueNumber: string) => {
              cloned[clueNumber] = clue;

              return cloned;
            },
            {}
          ),
        },
        userSolution: this.userSolution.map(
          (row) => row.map(
            (cell) => cell
          )
        ),
        info: Object.assign({}, this.info),
      }
    );
  }

  public equals(other: any) {
    if (!(other instanceof Puzzle)) {
      return false;
    }

    return isEqual(this.toJSON(), other.toJSON());
  }

  private getInGrid = (path: Array<string|number>): any => {
    return get(this.grid, path);
  }

  private setInGrid = (path: Array<string|number>, value: any): Grid => {
    return set(this.grid, path, value);
  }
}
