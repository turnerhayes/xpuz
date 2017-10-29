/* globals describe, it */

const expect        = require("chai").expect;
const Puzzle        = require("../src/lib/puzzle");
const PuzzleBuilder = require("../src/lib/puzzle-builder");

describe("PuzzleBuilder", function() {
	it("should return a 3x3 Puzzle with a diagonal block", function() {
		const builder = new PuzzleBuilder();

		const puzzle = builder.
			addRow().
			addBlockCell().
			addCell().
			addCell().
			addRow().
			addCell().
			addBlockCell().
			addCell().
			addRow().
			addCell().
			addCell().
			addBlockCell().
			build();

		expect(puzzle).to.be.an.instanceof(Puzzle);
		expect(puzzle.grid.length).to.equal(3);
		puzzle.grid.forEach(
			(row) => expect(row.length).to.equal(3)
		);
		expect(puzzle.grid[0][0].isBlockCell).to.equal(true);
		expect(puzzle.grid[1][1].isBlockCell).to.equal(true);
		expect(puzzle.grid[2][2].isBlockCell).to.equal(true);
	});

	it("should contain the specified clues", function() {
		const builder = new PuzzleBuilder();

		const puzzle = builder.
			addRow().
			addBlockCell().
			addCell().
			solution("A").
			addCell().
			solution("N").
			addRow().
			addCell().
			addBlockCell().
			addCell().
			addRow().
			addCell().
			addCell().
			addBlockCell().
			addAcrossClue(1, "First across clue").
			addDownClue(1, "First down clue").
			addAcrossClues({
				2: "Second across clue",
				4: "Fourth across clue"
			}).
			addDownClues({
				2: "Second down clue",
				3: "Third down clue"
			}).
			build();

		expect(puzzle).to.be.an.instanceof(Puzzle);
		expect(puzzle.clues.across[1]).to.equal("First across clue");
		expect(puzzle.clues.across[2]).to.equal("Second across clue");
		expect(puzzle.clues.across[4]).to.equal("Fourth across clue");
		expect(puzzle.clues.down[1]).to.equal("First down clue");
		expect(puzzle.clues.down[2]).to.equal("Second down clue");
		expect(puzzle.clues.down[3]).to.equal("Third down clue");
	});
});
