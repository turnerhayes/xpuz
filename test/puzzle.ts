/* globals describe, it */

import { expect } from "chai";
import { Puzzle } from "../src";
import { IInputCell } from "../src/Grid";

const PUZZLE_DEFINITION = {
	grid: [
		[{ isBlockCell: true }, { }, { },],
		[{ }, { isBlockCell: true }, { },],
		[{ }, { }, { isBlockCell: true },],
	],
};

function _createPuzzle() {
	return new Puzzle(JSON.parse(JSON.stringify(PUZZLE_DEFINITION)));
}

describe("Puzzle object", function() {
	it("should have the correct toString() return value", function() {
		const puzzle = _createPuzzle();

		expect(puzzle.toString()).to.equal("Puzzle");
	});

	it("should have the correct toJSON() return value", function() {
		const puzzle = _createPuzzle();

		const json = puzzle.toJSON();

		expect(json.grid).to.deep.equal(puzzle.grid);
		expect(json.clues).to.have.property("across");
		expect(json.clues).to.have.property("down");
		/* eslint-disable no-magic-numbers */
		expect(json.userSolution.length).to.equal(3);
		expect(json.userSolution[0].length).to.equal(3);
		expect(json.userSolution[1].length).to.equal(3);
		expect(json.userSolution[2].length).to.equal(3);
		/* eslint-enable no-magic-numbers */
	});

	it("should clone to a new Puzzle instance", function() {
		const puzzle = _createPuzzle();

		const cloned = puzzle.clone();

		expect(cloned, "Cloned puzzle").to.be.an.instanceof(Puzzle);
		expect(cloned.grid, "Grid in cloned").to.deep.equal(puzzle.grid);
		// The values within the grid should match, but the objects should not be identical (===)
		expect(cloned.grid, "Grid in cloned").to.not.equal(puzzle.grid);
		expect(cloned.grid[0], "Grid row in cloned").to.not.equal(puzzle.grid[0]);
		expect(cloned.clues, "Clues in cloned").to.deep.equal(puzzle.clues);
		expect(cloned.clues.across, "Across clues in cloned").to.not.equal(puzzle.clues.across);
		expect(cloned.clues.down, "Down clues in cloned").to.not.equal(puzzle.clues.down);
		expect(cloned.info, "Info in cloned").to.deep.equal(puzzle.info);
		expect(cloned.info, "Info in cloned").to.not.equal(puzzle.info);
	});

	it("should correctly determine equality", function() {
		const puzzle = _createPuzzle();

		const otherPuzzle = _createPuzzle();

		expect(puzzle).to.be.an.instanceof(Puzzle);
		expect(puzzle.equals(otherPuzzle), "Compare against equivalent puzzle").to.be.true;
		expect(puzzle.equals({ not: "a puzzle"}), "Compare against plain object").to.be.false;
		expect(puzzle.equals(null), "Compare against null").to.be.false;

		(otherPuzzle.grid[0][1] as IInputCell).solution = "T";

		expect(puzzle.equals(otherPuzzle), "Compare against different puzzle").to.be.false;
	});

	it("should return a consistent hashCode", function() {
		const puzzle = _createPuzzle();

		const otherPuzzle = _createPuzzle();

		expect(puzzle).to.be.an.instanceof(Puzzle);
		expect(puzzle.hashCode(), "Returns the same hash code on subsequent calls").to.equal(puzzle.hashCode());
		expect(puzzle.hashCode(), "Equivalent Puzzles have the same hash code").to.equal(otherPuzzle.hashCode());
	});

	it("should place clue numbers in the appropriate cells", function() {
		const puzzle = _createPuzzle();

		/* eslint-disable no-magic-numbers */
		expect(
			(puzzle.grid[0][1] as IInputCell).clueNumber).to.equal(1);
		expect(
			(puzzle.grid[0][2] as IInputCell).clueNumber).to.equal(2);
		expect(
			(puzzle.grid[1][0] as IInputCell).clueNumber).to.equal(3);
		expect(
			(puzzle.grid[2][0] as IInputCell).clueNumber).to.equal(4);
		/* eslint-enable no-magic-numbers */
	});

	describe("updateGrid", function() {
		it("should update the grid", function() {
			const puzzle = _createPuzzle();

			// eslint-disable-next-line no-magic-numbers
			expect((puzzle.grid[1][0] as IInputCell).clueNumber, "Clue number at [0, 1] after change").to.equal(3);
			expect((puzzle.grid[1][0] as IInputCell).containingClues, "Containing clues at [0, 1] before change").to.deep.equal({
				down: 3,
			});
			// eslint-disable-next-line no-magic-numbers
			expect((puzzle.grid[2][0] as IInputCell).clueNumber, "Clue number at [0, 2] before change").to.equal(4);
			expect((puzzle.grid[2][0] as IInputCell).containingClues, "Containing clues at [0, 2] before change").to.deep.equal({
				across: 4,
				down: 3
			});

			puzzle.grid[1][0] = { isBlockCell: true };

			puzzle.updateGrid();

			expect((puzzle.grid[1][0] as IInputCell).clueNumber, "Clue number at [0, 1] after change").to.be.undefined;
			expect((puzzle.grid[1][0] as IInputCell).containingClues, "Containing clues at [0, 1] after change").to.be.undefined;
			// eslint-disable-next-line no-magic-numbers
			expect((puzzle.grid[2][0] as IInputCell).clueNumber, "Clue number at [0, 2] after change").to.equal(3);
			expect((puzzle.grid[2][0] as IInputCell).containingClues, "Containing clues at [0, 2] after change").to.deep.equal({
				across: 3,
			});
		});
	});
});
