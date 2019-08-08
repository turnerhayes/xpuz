/* globals describe, it */

import { expect } from "chai";
import { Puzzle } from "../src";
import { Puzzle as ImmutablePuzzle } from "../src/immutable";
import { Utils as ImmutablePuzzleUtils } from "../src/immutable";

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
	describe("toImmutable", function() {
		it("should output an equivalent ImmutablePuzzle", function() {
			const puzzle = createPuzzle();

			const immutablePuzzle = ImmutablePuzzleUtils.toImmutable(puzzle);

			expect(immutablePuzzle).to.be.an.instanceof(ImmutablePuzzle);
			["grid", "clues", "userSolution"].forEach(
				(propName) => expect(
					immutablePuzzle.get(propName).toJS(),
					`${propName} property`
				).to.deep.equal((puzzle as any)[propName])
			);
		});
	});

	describe("toMutable", function() {
		it("should output an equivalent Puzzle", function() {
			const immutablePuzzle = createImmutablePuzzle();

			const puzzle = ImmutablePuzzleUtils.toMutable(immutablePuzzle);

			expect(puzzle).to.be.an.instanceof(Puzzle);
			["grid", "clues", "userSolution"].forEach(
				(propName) => expect(
					(puzzle as any)[propName],
					`${propName} property`
				).to.deep.equal(immutablePuzzle.get(propName).toJS())
			);
		});
	});
});
