import reduce from "lodash/reduce";
import isEqual from "lodash/isEqual";
import get from "lodash/get";
import set from "lodash/set";
import { Grid } from "./Grid";
import { ClueMap, IPuzzleClues, IPuzzleInfo, IPuzzleConstructorArgs, findContainingClues, processGrid, IPuzzleJSON } from "./puzzle-utils";
import size = require("lodash/size");
import hashIt from "hash-it";

/**
 * Represents a puzzle object
 */
export default class Puzzle {
	/**
	 * The definition of the puzzle grid. It is represented as an array of rows, so
	 *	`grid[0]` is the first row of the puzzle.
	 */
	public grid: Grid;

	/**
	 * Listing of clues for the puzzle.
	 */
	public clues: IPuzzleClues;

  public info: IPuzzleInfo;
  
  /**
	 * A structure representing the current solution as the user has filled it out.
	 *	The structure is similar to {@link Grid}, but
   *	each item is a string containing the user's current answer--an empty string
   *	if the corresponding grid cell is not filled in, a non-empty string if it's
   *	filled in.
   */
	public userSolution: Array<(string|null)[]>;

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

	findContainingClues(
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
		})
	}

	processGrid() {
		return processGrid({
			grid: this.grid,
			get: this.getInGrid,
			set: this.setInGrid,
			sizeOf: size,
		});
	}

	updateGrid() {
		this.grid = processGrid({
			grid: this.grid,
			get: this.getInGrid,
			set: this.setInGrid,
			sizeOf: size,
		});
	}

	hashCode() {
		return hashIt(this);
	}

	toJSON(): IPuzzleJSON {
		return {
			grid: this.grid,
			clues: this.clues,
			userSolution: this.userSolution,
			info: this.info,
		};
	}

	toString() {
		return "Puzzle";
	}

	/**
	 * Returns a deep copy of this puzzle.
	 */
	clone(): Puzzle {
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
						(cloned: ClueMap, clue: string, clueNumber: string) => {
							cloned[clueNumber] = clue;
		
							return cloned;
						},
						{}
					),
					down: reduce(
						this.clues.down,
						(cloned: ClueMap, clue: string, clueNumber: string) => {
							cloned[clueNumber] = clue;
		
							return cloned;
						},
						{}
					),
				},
				userSolution: this.userSolution.map(
					(row: (string|null)[]) => row.map(
						(cell) => cell // Values in userSolution are just strings
					)
				),
				info: Object.assign({}, this.info),
			}
		);
	}

	equals(other: any) {
		if (!(other instanceof Puzzle)) {
			return false;
		}

		return isEqual(this.toJSON(), other.toJSON());
	}

	private getInGrid = (path: (string|number)[]): any => {
		return get(this.grid, path);
	}

	private setInGrid = (path: (string|number)[], value: any): Grid => {
		return set(this.grid, path, value);
	}
}
