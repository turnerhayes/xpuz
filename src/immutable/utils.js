const ImmutablePuzzle = require("./puzzle");
const Puzzle = require("../puzzle");

module.exports =  {
	toImmutable(puzzle) {
		return new ImmutablePuzzle({
			grid: puzzle.grid,
			clues: puzzle.clues,
			userSolution: puzzle.userSolution,
			info: puzzle.info,
			extensions: puzzle.extensions,
		});
	},

	toMutable(immutablePuzzle) {
		return new Puzzle({
			grid: immutablePuzzle.grid.toJS(),
			clues: immutablePuzzle.clues.toJS(),
			userSolution: immutablePuzzle.userSolution.toJS(),
			info: immutablePuzzle.info.toJS(),
			extensions: immutablePuzzle.extensions.toJS(),
		});
	},
};