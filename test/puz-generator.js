/* globals describe, it */

const Promise   = require("bluebird");
const writeFile = Promise.promisify(require("fs").writeFile);
const tempOpen  = Promise.promisify(require("temp").track().open);
const expect    = require("chai").expect;
const {
	Puzzle,
	Parsers,
}               = require("../src");

const parser = new Parsers.PUZ();

function getPuzzleArgs(rebus) {
	return {
		title: "Test puzzle",
		author: "Test author",
		grid: [
			[
				{
					solution: "A",
					clueNumber: 1
				},
				{
					solution: "N",
					clueNumber: 2
				},
				{
					isBlockCell: true
				},
				{
					solution: "B",
					clueNumber: 3
				},
				{
					solution: "E",
					clueNumber: 4
				}
			],
			[
				{
					solution: "L",
					clueNumber: 5,
				},
				{
					solution: rebus ? "OST" : "O",
				},
				{
					solution: rebus ? "OST" : "O",
				},
				{
					solution: "T",
				},
				{
					solution: rebus ? "SAM" : "S",
				}
			]
		],
		clues: {
			across: {
				1: "AN",
				3: "BE",
				5: "LOOTS"
			},
			down: {
				1: "AL",
				2: "NO",
				3: "BT",
				4: "ES"
			}
		}
	};
}

function _validateGeneratedPuzzle(puzzle, parsedPuzzle) {
	expect(parsedPuzzle.grid, "Grid contents").to.deep.equal(puzzle.grid);
	expect(parsedPuzzle.info, "Puzzle info").to.deep.equal(puzzle.info);
	expect(parsedPuzzle.clues, "Puzzle clues").to.deep.equal(puzzle.clues);
}

describe(".puz file generator", function() {
	it("should generate a valid .puz file", function(done) {
		const puzzle = new Puzzle(getPuzzleArgs());

		const file = parser.generate(puzzle);
		
		tempOpen({suffix: ".puz"}).then(
			(info) => writeFile(info.path, file, { encoding: null }).then(
				() => parser.parse(info.path).then(
					(parsedPuzzle) => {
						_validateGeneratedPuzzle(puzzle, parsedPuzzle);
						done();
					}
				)
			)
		).catch(done);
	});

	it("should generate a valid rebus .puz file", function(done) {
		const rebusPuzzle = new Puzzle(getPuzzleArgs(true));

		const file = parser.generate(rebusPuzzle);
		
		tempOpen({suffix: ".puz"}).then(
			(info) => writeFile(info.path, file, { encoding: null }).then(
				() => parser.parse(info.path).then(
					(parsedPuzzle) => {
						_validateGeneratedPuzzle(rebusPuzzle, parsedPuzzle);
						done();
					}
				)
			)
		).catch(done);
	});
});
