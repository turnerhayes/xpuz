import ImmutablePuzzle from "./puzzle";
import Puzzle from "../puzzle";

export const toImmutable = (puzzle: Puzzle): ImmutablePuzzle => {
	return new ImmutablePuzzle({
		grid: puzzle.grid,
		clues: puzzle.clues,
		userSolution: puzzle.userSolution,
		info: puzzle.info,
	});
};

export const toMutable = (immutablePuzzle: ImmutablePuzzle): Puzzle => {
	return new Puzzle({
		grid: immutablePuzzle.grid.toJS(),
		clues: immutablePuzzle.clues.toJS(),
		userSolution: immutablePuzzle.userSolution.toJS(),
		info: immutablePuzzle.info.toJS(),
	});
};
