var ImmutablePuzzle = require("./puzzle");
var Puzzle = require("../puzzle");

module.exports = {
	toImmutable: function toImmutable(puzzle) {
		return new ImmutablePuzzle({
			grid: puzzle.grid,
			clues: puzzle.clues,
			userSolution: puzzle.userSolution,
			info: puzzle.info,
			extensions: puzzle.extensions
		});
	},
	toMutable: function toMutable(immutablePuzzle) {
		return new Puzzle({
			grid: immutablePuzzle.grid.toJS(),
			clues: immutablePuzzle.clues.toJS(),
			userSolution: immutablePuzzle.userSolution.toJS(),
			info: immutablePuzzle.info.toJS(),
			extensions: immutablePuzzle.extensions.toJS()
		});
	}
};
//# sourceMappingURL=utils.js.map