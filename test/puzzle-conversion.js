/* globals describe, it */

const expect          = require("chai").expect;
const {
	Puzzle,
	ImmutablePuzzle,
	convertPuzzleToImmutablePuzzle,
	convertImmutablePuzzleToPuzzle
}                     = require("../src/index");

/* eslint-disable no-magic-numbers */
const PUZZLE_DEFINITION = {
	grid: [
		[{ isBlockCell: true }, { }, { },],
		[{ }, { isBlockCell: true }, { },],
		[{ }, { }, { isBlockCell: true },],
	],
};
/* eslint-enable no-magic-numbers */

function createPuzzle() {
	return new Puzzle(JSON.parse(JSON.stringify(PUZZLE_DEFINITION)));
}

function createImmutablePuzzle() {
	return new ImmutablePuzzle(JSON.parse(JSON.stringify(PUZZLE_DEFINITION)));
}

describe("Puzzle/ImmutablePuzzle conversion", function() {
	describe("convertPuzzleToImmutablePuzzle", function() {
		it("should output an equivalent ImmutablePuzzle", function() {
			const puzzle = createPuzzle();

			const immutablePuzzle = convertPuzzleToImmutablePuzzle(puzzle);

			expect(immutablePuzzle).to.be.an.instanceof(ImmutablePuzzle);
			["grid", "clues", "userSolution", "extensions"].forEach(
				(propName) => expect(immutablePuzzle[propName].toJS(), `${propName} property`).to.deep.equal(puzzle[propName])
			);
		});
	});

	describe("convertImmutablePuzzleToPuzzle", function() {
		it("should output an equivalent Puzzle", function() {
			const immutablePuzzle = createImmutablePuzzle();

			const puzzle = convertImmutablePuzzleToPuzzle(immutablePuzzle);

			expect(puzzle).to.be.an.instanceof(Puzzle);
			["grid", "clues", "userSolution", "extensions"].forEach(
				(propName) => expect(puzzle[propName], `${propName} property`).to.deep.equal(immutablePuzzle[propName].toJS())
			);
		});
	});
});
