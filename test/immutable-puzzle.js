/* globals describe, it */

const {
	Map,
	is
}                     = require("immutable");
const expect          = require("chai").expect;
const {
	Puzzle
}                     = require("../src");
const ImmutablePuzzle = require("../src/immutable").Puzzle;
const Utils           = require("../src/immutable").Utils;

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

describe("ImmutablePuzzle object", function() {
	it("should convert a Puzzle to an ImmutablePuzzle", function() {
		const puzzle = _createPuzzle();

		const immutablePuzzle = Utils.toImmutable(puzzle);

		expect(immutablePuzzle, "Immutable puzzle").to.be.an.instanceof(ImmutablePuzzle);
		expect(immutablePuzzle.grid.size, "Immutable grid height").to.equal(puzzle.grid.length);
		expect(immutablePuzzle.grid.get(0).size, "Immutable grid height").to.equal(puzzle.grid[0].length);
	});

	it("should return the correct toString value", function() {
		const immutablePuzzle = Utils.toImmutable(_createPuzzle());

		expect(immutablePuzzle.toString()).to.equal("ImmutablePuzzle");
	});

	it("should return the same toJSON value as the mutable Puzzle", function() {
		const puzzle = _createPuzzle();

		const immutablePuzzle = Utils.toImmutable(puzzle);

		expect(immutablePuzzle.toJSON()).to.deep.equal(puzzle.toJSON());
	});

	it("should correctly determine equality", function() {
		const puzzle = Utils.toImmutable(_createPuzzle());

		const mutablePuzzle = _createPuzzle();
		let otherPuzzle = Utils.toImmutable(mutablePuzzle);

		expect(puzzle).to.be.an.instanceof(ImmutablePuzzle);
		expect(puzzle.equals(otherPuzzle), "Compare against equivalent puzzle").to.be.true;
		expect(puzzle.equals({ not: "a puzzle"}), "Compare against plain object").to.be.false;
		expect(puzzle.equals(mutablePuzzle), "Compare against mutable puzzle").to.be.false;
		expect(puzzle.equals(null), "Compare against null").to.be.false;

		otherPuzzle = otherPuzzle.setIn(["grid", 0, 1, "solution"], "T");

		expect(puzzle.equals(otherPuzzle), "Compare against different puzzle").to.be.false;
	});

	it("should return a consistent hashCode", function() {
		const puzzle = Utils.toImmutable(_createPuzzle());

		const otherPuzzle = Utils.toImmutable(_createPuzzle());

		expect(puzzle).to.be.an.instanceof(ImmutablePuzzle);
		expect(puzzle.hashCode(), "Returns the same hash code on subsequent calls").to.equal(puzzle.hashCode());
		expect(puzzle.hashCode(), "Equivalent Puzzles have the same hash code").to.equal(otherPuzzle.hashCode());
	});

	it("should place clue numbers and containing clues in the appropriate cells", function() {
		const puzzle = Utils.toImmutable(_createPuzzle());

		/* eslint-disable no-magic-numbers */
		[
			{
				columnIndex: 0,
				rowIndex: 0,
				clueNumber: undefined,
				containingClues: undefined
			},
			{
				columnIndex: 1,
				rowIndex: 0,
				clueNumber: 1,
				containingClues: { across: 1 },
			},
			{
				columnIndex: 2,
				rowIndex: 0,
				clueNumber: 2,
				containingClues: { across: 1, down: 2 },
			},
			{
				columnIndex: 0,
				rowIndex: 1,
				clueNumber: 3,
				containingClues: { down: 3 },
			},
			{
				columnIndex: 1,
				rowIndex: 1,
				clueNumber: undefined,
				containingClues: undefined,
			},
			{
				columnIndex: 2,
				rowIndex: 1,
				clueNumber: undefined,
				containingClues: { down: 2 },
			},
			{
				columnIndex: 0,
				rowIndex: 2,
				clueNumber: 4,
				containingClues: { down: 3, across: 4 },
			},
			{
				columnIndex: 1,
				rowIndex: 2,
				clueNumber: undefined,
				containingClues: { across: 4 },
			},
			{
				columnIndex: 2,
				rowIndex: 2,
				clueNumber: undefined,
				containingClues: undefined,
			},
		].forEach(
			(cell) => {
				expect(
					puzzle.grid.getIn([cell.rowIndex, cell.columnIndex, "clueNumber"]),
					`Clue number at [${cell.columnIndex}, ${cell.rowIndex}]`
				).to.equal(cell.clueNumber);

				expect(
					is(
						puzzle.grid.getIn([cell.rowIndex, cell.columnIndex, "containingClues"]),
						cell.containingClues && Map(cell.containingClues)
					),
					`Containing clues equality at [${cell.columnIndex}, ${cell.rowIndex}]`
				).to.be.true;
			}
		);
		/* eslint-enable no-magic-numbers */
	});

	it("should update clue numbers and containing clues when the grid is changed", function() {
		let puzzle = Utils.toImmutable(_createPuzzle());

		/* eslint-disable no-magic-numbers */
		const originalLayout = [
			{
				columnIndex: 0,
				rowIndex: 0,
				clueNumber: undefined,
				containingClues: undefined
			},
			{
				columnIndex: 1,
				rowIndex: 0,
				clueNumber: 1,
				containingClues: { across: 1 },
			},
			{
				columnIndex: 2,
				rowIndex: 0,
				clueNumber: 2,
				containingClues: { across: 1, down: 2 },
			},
			{
				columnIndex: 0,
				rowIndex: 1,
				clueNumber: 3,
				containingClues: { down: 3 },
			},
			{
				columnIndex: 1,
				rowIndex: 1,
				clueNumber: undefined,
				containingClues: undefined,
			},
			{
				columnIndex: 2,
				rowIndex: 1,
				clueNumber: undefined,
				containingClues: { down: 2 },
			},
			{
				columnIndex: 0,
				rowIndex: 2,
				clueNumber: 4,
				containingClues: { down: 3, across: 4 },
			},
			{
				columnIndex: 1,
				rowIndex: 2,
				clueNumber: undefined,
				containingClues: { across: 4 },
			},
			{
				columnIndex: 2,
				rowIndex: 2,
				clueNumber: undefined,
				containingClues: undefined,
			},
		];

		originalLayout.forEach(
			(cell) => {
				expect(
					puzzle.grid.getIn([cell.rowIndex, cell.columnIndex, "clueNumber"]),
					`Clue number at [${cell.columnIndex}, ${cell.rowIndex}] before change`
				).to.equal(cell.clueNumber);

				expect(
					is(
						puzzle.grid.getIn([cell.rowIndex, cell.columnIndex, "containingClues"]),
						cell.containingClues && Map(cell.containingClues)
					),
					`Containing clues equality at [${cell.columnIndex}, ${cell.rowIndex}] before change`
				).to.be.true;
			}
		);

		puzzle = puzzle.setIn(["grid", 1, 0], Map({ isBlockCell: true }));

		expect(puzzle.getIn(["grid", 2, 0, "clueNumber"]), "Clue number before updateGrid()").to.equal(4);

		puzzle = puzzle.updateGrid();

		[
			{
				columnIndex: 0,
				rowIndex: 0,
				clueNumber: undefined,
				containingClues: undefined
			},
			{
				columnIndex: 1,
				rowIndex: 0,
				clueNumber: 1,
				containingClues: { across: 1 },
			},
			{
				columnIndex: 2,
				rowIndex: 0,
				clueNumber: 2,
				containingClues: { across: 1, down: 2 },
			},
			{
				columnIndex: 0,
				rowIndex: 1,
				clueNumber: undefined,
				containingClues: undefined,
			},
			{
				columnIndex: 1,
				rowIndex: 1,
				clueNumber: undefined,
				containingClues: undefined,
			},
			{
				columnIndex: 2,
				rowIndex: 1,
				clueNumber: undefined,
				containingClues: { down: 2 },
			},
			{
				columnIndex: 0,
				rowIndex: 2,
				clueNumber: 3,
				containingClues: { across: 3 },
			},
			{
				columnIndex: 1,
				rowIndex: 2,
				clueNumber: undefined,
				containingClues: { across: 3 },
			},
			{
				columnIndex: 2,
				rowIndex: 2,
				clueNumber: undefined,
				containingClues: undefined,
			},
		].forEach(
			(cell) => {
				expect(
					puzzle.grid.getIn([cell.rowIndex, cell.columnIndex, "clueNumber"]),
					`Clue number at [${cell.columnIndex}, ${cell.rowIndex}] after change`
				).to.equal(cell.clueNumber);

				expect(
					is(
						puzzle.grid.getIn([cell.rowIndex, cell.columnIndex, "containingClues"]),
						cell.containingClues && Map(cell.containingClues)
					),
					`Containing clues equality at [${cell.columnIndex}, ${cell.rowIndex}] after change`
				).to.be.true;
			}
		);

		puzzle = puzzle.updateCell(0, 1, { });

		originalLayout.forEach(
			(cell) => {
				expect(
					puzzle.grid.getIn([cell.rowIndex, cell.columnIndex, "clueNumber"]),
					`Clue number at [${cell.columnIndex}, ${cell.rowIndex}] after updateCell()`
				).to.equal(cell.clueNumber);

				expect(
					is(
						puzzle.grid.getIn([cell.rowIndex, cell.columnIndex, "containingClues"]),
						cell.containingClues && Map(cell.containingClues)
					),
					`Containing clues equality at [${cell.columnIndex}, ${cell.rowIndex}] after updateCell()`
				).to.be.true;
			}
		);

		/* eslint-enable no-magic-numbers */
	});
});
