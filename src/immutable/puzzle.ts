import {
	List,
	Map,
	OrderedMap,
	Record,
	is,
	Iterable,
	fromJS,
}                 from "immutable";

import {
	findContainingClues,
	processGrid,
	IPuzzleClues,
	IPuzzleInfo,
	DirectionKey,
	ImmutablePuzzleClues,
	IPuzzleJSON,
} from "../puzzle-utils";
import {
	ImmutableGrid,
	ImmutableGridCell,
	ImmutableInputGridCell,
	Grid,
	GridCell,
} from "../Grid";

const infoSchema = {
	title: "",
	author: "",
	publisher: "",
	copyright: "",
	difficulty: "",
	intro: "",
	formatExtra: undefined,
};

const DIRECTIONS: DirectionKey[] = ["across", "down"];

class PuzzleInfo extends Record(infoSchema, "PuzzleInfo") {
	readonly title!: string;
	readonly author!: string;
	readonly copyright!: string;
	readonly intro!: string;
	readonly publisher!: string;
	readonly difficulty!: any;
	readonly formatExtra?: any;

}

const schema = {
	grid: List<List<ImmutableGridCell|ImmutableInputGridCell>>(),
	clues: Map({
		across: OrderedMap(),
		down: OrderedMap(),
	}),
	userSolution: List(),
	info: new PuzzleInfo(),
};

const immutableProcessGrid = (grid: ImmutableGrid): ImmutableGrid => {
	return grid.withMutations(
		(gridWithMutations: ImmutableGrid) => processGrid<ImmutableGrid>({
			grid: gridWithMutations,
			get: gridWithMutations.getIn.bind(gridWithMutations),
			set: gridWithMutations.setIn.bind(gridWithMutations),
			sizeOf: (items: Iterable.Indexed<any>) => items.size,
			width: grid.size,
			height: grid.get(0, List()).size,
			processValue: fromJS,
		})
	);
};

/**
 * Represents an immutable version of {@link xpuz.Puzzle|Puzzle}.
 *
 * @extends Record
 * @memberof xpuz
 *
 * @mixes xpuz.PuzzleMixin
 */
export default class ImmutablePuzzle extends Record(schema, "ImmutablePuzzle") {
	/**
	 * @param {object} args - the constructor arguments
	 * @param {Types.ImmutableGrid|Types.Grid} args.grid - the grid for the puzzle
	 * @param {{across: object, down: object}|external:Immutable.Map<{across: external:Immutable.Map, down: external:Immutable.Map}>} args.clues - the
	 *	puzzle clues
	 * @param {Array<string[]>|external:Immutable.List<external:Immutable.List<string>>} [args.userSolution] - the guesses that the user
	 *	has entered for this puzzle, as a two-dimensional array of array of strings with the same dimensions as the `grid` where
	 *	each cell is either a string with the user's input or `null` if it corresponds to a block cell in the grid
	 * @param {xpuz.PuzzleInfo|object} [args.info] - information about the puzzle
	 */
	constructor(
		{
			grid,
			clues,
			userSolution,
			info,
		}: {
			grid: Grid|ImmutableGrid,
			clues: IPuzzleClues|ImmutablePuzzleClues,
			userSolution: ((string|null)[][])|(List<List<string|null>>),
			info: IPuzzleInfo|PuzzleInfo,
		}
	) {
		if (!(info instanceof PuzzleInfo)) {
			info = new PuzzleInfo(info);
		}

		grid = grid ? immutableProcessGrid(fromJS(grid)) : List();

		const args: {
			info: PuzzleInfo,
			grid: ImmutableGrid,
			userSolution: List<List<string|null>>,
			clues?: ImmutablePuzzleClues,
		} = {
			info: info as PuzzleInfo,
			grid,
			userSolution: userSolution ?
				fromJS(userSolution) :
				grid.map(
					(row?: List<ImmutableGridCell|ImmutableInputGridCell>) => row!.map(
						(cell?: ImmutableGridCell) => cell!.isBlockCell ? null : ""
					)
				),
		};

		if (clues) {
			args.clues = Map.isMap(clues) ?
				clues as ImmutablePuzzleClues :
				Map(
					DIRECTIONS.map(
						(direction: DirectionKey) => [
							direction,
							OrderedMap(
								Object.keys(
									(clues as IPuzzleClues)[direction]
								).sort((a, b) => Number(a) - Number(b)).map(
									(clueNumber) => [Number(clueNumber), (clues as IPuzzleClues)[direction][
										clueNumber as unknown as number
									]]
								)
							)
						]
					),
				);
		}

		super(args);
	}

	processGrid(): ImmutableGrid {
		return immutableProcessGrid(this.grid);
	}

	updateGrid(): ImmutablePuzzle {
		return this.set("grid", this.processGrid()) as ImmutablePuzzle;
	}

	updateCell(
		column: number,
		row: number,
		cell: GridCell|ImmutableGridCell
	): ImmutablePuzzle {
		return (
			this.setIn(["grid", row, column], fromJS(cell)) as ImmutablePuzzle
		).updateGrid() as ImmutablePuzzle;
	}

	toJSON(): IPuzzleJSON {
		return this.toJS();
	}

	toString() {
		return "ImmutablePuzzle";
	}

	readonly grid!: ImmutableGrid;

	readonly clues!: ImmutablePuzzleClues;

	readonly userSolution!: List<List<string|null>>;

	readonly info!: PuzzleInfo;
}
