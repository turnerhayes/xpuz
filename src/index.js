/**
 * XPuz index
 *
 * Exports the public API for the XPuz module
 *
 * @memberof xpuz
 */

const Puzzle = require("./lib/puzzle");
const ImmutablePuzzle = require("./lib/puzzle/immutable");

exports = module.exports = {
	/**
	 * Puzzle file parser constructors
	 *
	 * @type object
	 * @property {function} IPUZ - .ipuz file parser
	 * @property {function} PUZ - .puz file parser
	 * @property {function} JPZ - .jpz file parser
	 */
	Parsers: {
		IPUZ: require("./parsers/ipuz"),
		PUZ: require("./parsers/puz"),
		JPZ: require("./parsers/jpz"),
	},

	/**
	 * Puzzle object constructor
	 *
	 * @type function
	 * @see {@link xpuz.Puzzle}
	 */
	Puzzle,

	/**
	 * ImmutablePuzzle object constructor
	 *
	 * @type function
	 * @see {@link xpuz.ImmutablePuzzle}
	 */
	ImmutablePuzzle,

	convertPuzzleToImmutablePuzzle(puzzle) {
		return new ImmutablePuzzle({
			grid: puzzle.grid,
			clues: puzzle.clues,
			userSolution: puzzle.userSolution,
			info: puzzle.info,
			extensions: puzzle.extensions,
		});
	},

	convertImmutablePuzzleToPuzzle(immutablePuzzle) {
		return new Puzzle({
			grid: immutablePuzzle.grid.toJS(),
			clues: immutablePuzzle.clues.toJS(),
			userSolution: immutablePuzzle.userSolution.toJS(),
			info: immutablePuzzle.info.toJS(),
			extensions: immutablePuzzle.extensions.toJS(),
		});
	},
};
