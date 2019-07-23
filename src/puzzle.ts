import reduce from "lodash/reduce";
import isEqual from "lodash/isEqual";
import { Grid } from "./Grid";
import BasePuzzle, { ClueMap, IPuzzleConstructorArgs } from "./base-puzzle";

/**
 * Represents a puzzle object
 */
export default class Puzzle extends BasePuzzle {
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
			/**
			 * Extra, possibly implementation-specific information about the puzzle,
			 * such as timer information
			 */
			extensions,
		}: IPuzzleConstructorArgs
	) {
		super({
			grid,
			clues,
			userSolution,
			info,
			extensions,
		});
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
					(row: string[]) => row.map(
						(cell) => cell // Values in userSolution are just strings
					)
				),
				info: Object.assign({}, this.info),
				extensions: JSON.parse(JSON.stringify(this.extensions)), // Deep clone
			}
		);
	}
}
