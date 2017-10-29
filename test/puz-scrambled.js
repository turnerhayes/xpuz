/* globals describe, it */



const path      = require("path");
const flatten   = require("lodash/flatten");
const fs        = require("fs");
const Promise   = require("bluebird");
const readFile  = Promise.promisify(require("fs").readFile);
const expect    = require("chai").expect;
const PUZParser = require("../src/parsers/puz");
const Puzzle    = require("../src/lib/puzzle");

const parser = new PUZParser();

const puzzleKey = "8329";

const puzzlePath = path.resolve(__dirname, "puz_files", "NYT_Feb0216-locked-8329.puz");

const realFileSolution = "PLANE.SKY.BRAWLCOREA.YOU.LAVIESOFTG.NOG.OPALS...FLOCKOFBIRDSTOILER.SSR.DICEMOLITOR..OILCANCHEX.NARC.NYETS....HORIZON....HTEST.EDAM.MEMOIRAISE..RAMADANPART.SPA.NOCUTSSCHOOLOFFISH...THANK.NIL.ATONEEERIE.DRE.IWERERATTY.SEA.CORAL";

const puzzle = new Puzzle({
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
				clueNumber: 5
			},
			{
				solution: "O"
			},
			{
				solution: "O"
			},
			{
				solution: "T"
			},
			{
				solution: "S"
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
});

function _pluckSolutions(puzzle) {
	return flatten(
		puzzle.grid.map(
			(row) => row.map(
				(c) => c.isBlockCell ? "." : c.solution
			)
		)
	).join("");
}

describe(".puz file parser", function() {
	it("should reject the returned promise when parsing a locked puzzle without a key", function(done) {
		readFile(puzzlePath, { encoding: null }).then(
			(fileContent) => parser.parse(fileContent).then(
				() => done(new Error("Parser should have thrown an error"))
			)
		).catch(
			(err) => {
				expect(err.message).to.match(/Puzzle solution is locked and no solutionKey option was provided/);
				done();
			}
		);
	});

	it("should parse a locked puzzle when given a key", function(done) {
		readFile(puzzlePath, { encoding: null }).then(
			(fileContent) => parser.parse(fileContent, {
				solutionKey: puzzleKey
			})
		).then(
			(puzzle) => {
				const solutions = _pluckSolutions(puzzle);

				expect(solutions).to.equal(realFileSolution);
				done();
			}
		).catch(done);
	});
});

describe(".puz file generator", function() {
	it("should throw an error if generating a scrambled puzzle without a solutionKey specified", function() {
		expect(() => {
			parser.generate(
				puzzle,
				{
					scrambled: true
				}
			);
		}).to.throw(/Must specify a solution key/);
	});

	it("should generate a locked .puz file", function(done) {
		const fileBuffer = parser.generate(
			puzzle,
			{
				scrambled: true,
				solutionKey: puzzleKey
			}
		);

		parser.parse(
			fileBuffer,
			{
				solutionKey: puzzleKey
			}
		).then(
			(parsedPuzzle) => {
				expect(_pluckSolutions(puzzle)).to.equal(_pluckSolutions(parsedPuzzle));

				done();
			}
		).catch(done);
	});
});