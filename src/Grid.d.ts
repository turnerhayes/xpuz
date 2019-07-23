export interface IGridCell {
  /**
   * true if this is a block cell (a black cell that doesn't contain any part
   * of the solution).
   */
  isBlockCell?: boolean;
}

export interface IInputCell extends IGridCell {
  /**
   * The clue number associated with this cell, if any.
   */
  clueNumber: number|null;
  /**
   * The clues that cover this cell.
   */
  containingClues: {
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
  backgroundShape: string|undefined;

  solution?: string;
}

export type Grid = Array<IGridCell[]>;
