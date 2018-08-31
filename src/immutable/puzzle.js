const {
	List,
	Map,
	OrderedMap,
	Record,
	is,
	Collection,
	fromJS
}                 = require("immutable");
const PuzzleMixin = require("../puzzle-mixin");

const infoSchema = {
	title: "",
	author: "",
	publisher: "",
	copyright: "",
	difficulty: "",
	intro: "",
};

class PuzzleInfo extends Record(infoSchema, "PuzzleInfo") {}

const schema = {
	grid: List(),
	clues: Map({
		across: OrderedMap(),
		down: OrderedMap(),
	}),
	userSolution: List(),
	info: new PuzzleInfo(),
	extensions: Map(),
};

/**
 * Represents an immutable version of {@link xpuz.Puzzle|Puzzle}.
 *
 * @extends external:Immutable.Record
 * @memberof xpuz
 *
 * @mixes xpuz.PuzzleMixin
 */
class ImmutablePuzzle extends Record(schema, "ImmutablePuzzle") {
	/**
	 * @param {object} args - the constructor arguments
	 * @param {Types.ImmutableGrid|Types.Grid} args.grid - the grid for the puzzle
	 * @param {{across: object, down: object}|external:Immutable.Map<{across: external:Immutable.Map, down: external:Immutable.Map}>} args.clues - the
	 *	puzzle clues
	 * @param {Array<string[]>|external:Immutable.List<external:Immutable.List<string>>} [args.userSolution] - the guesses that the user
	 *	has entered for this puzzle, as a two-dimensional array of array of strings with the same dimensions as the `grid` where
	 *	each cell is either a string with the user's input or `null` if it corresponds to a block cell in the grid
	 * @param {xpuz.PuzzleInfo|object} [args.info] - information about the puzzle
	 * @param {object} [args.extensions] - a store of extra, possibly implementation-dependent information about the puzzle (such as timer information)
	 */
	constructor({
		grid,
		clues,
		userSolution,
		info,
		extensions
	}) {
		if (!(info instanceof PuzzleInfo)) {
			info = new PuzzleInfo(info);
		}

		grid = grid ? ImmutablePuzzle.processGrid(fromJS(grid)) : List();

		const args = {
			info,
			grid,
			userSolution: userSolution ?
				fromJS(userSolution) :
				grid.map(
					(row) => row.map(
						(cell) => cell.get("isBlockCell") ? null : ""
					)
				),
		};

		if (clues) {
			console.log({clues});
			args.clues = OrderedMap.isOrderedMap(clues) ?
				clues :
				OrderedMap(
					Object.keys(clues).sort().map(
						(clueNumber) => [clueNumber, clues[clueNumber]]
					)
				);
		}

		if (extensions) {
			args.extensions = fromJS(extensions);
		}

		super(args);
	}

	/**
	 * The grid for this puzzle
	 *
	 * @member {Types.ImmutableGrid} grid
	 * @instance
	 */
}

PuzzleMixin({
	constructor: ImmutablePuzzle,
	equalityTest: is,
	getter: (obj, path) => obj.getIn(path),
	setter: (obj, path, value) => obj.setIn(path, value instanceof Collection ? value : fromJS(value)),
	sizeOf: (obj) => obj.size,
});

const oldProcessGrid = ImmutablePuzzle.processGrid;

ImmutablePuzzle.processGrid = function processGrid(grid) {
	return grid.withMutations(
		(gridWithMutations) => oldProcessGrid(gridWithMutations)
	);
};

exports = module.exports = ImmutablePuzzle;
