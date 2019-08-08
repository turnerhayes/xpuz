import { List, Record, } from "immutable";

export type BlockGridCell = { isBlockCell: true };

export type ImmutableBlockGridCell = Record.Class & {isBlockCell: true};

export interface IInputCell {
  isBlockCell?: false;

  /**
   * The clue number associated with this cell, if any.
   */
  clueNumber?: number;
  /**
   * The clues that cover this cell.
   */
  containingClues?: {
    /**
     * The across clue, if any, that covers this cell.
     */
    across?: number,
    /**
     * The down clue, if any, that covers this cell.
     */
    down?: number,
  };
  /**
   * A string describing a shape, if any, that should be
   * displayed in the background of the cell (e.g. a circle).
   */
  backgroundShape?: string;

  solution?: string;
}

export type GridCell = BlockGridCell|IInputCell;


export type ImmutableInputGridCell = Record.Class & {
  isBlockCell: false,
  clueNumber?: number,
  containingClues: Record.Class & {
    across?: number,
    down?: number,
  },
  backgroundShape?: string,
  solution?: string,
};

export type ImmutableGridCell = ImmutableBlockGridCell|ImmutableInputGridCell;

export type Grid = Array<GridCell[]>;

export type ImmutableGrid = List<List<ImmutableGridCell>>;
