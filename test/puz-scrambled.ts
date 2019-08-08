/* globals describe, it */



import path      from "path";
import flatten   from "lodash/flatten";
import Promise   from "bluebird";
import { readFile as _readFile } from "fs";
import { expect }    from "chai";
import {
	Puzzle,
	Parsers,
}               from "../src";

const readFile: (
	path: string,
	options?: {
		encoding?: string|null,
	}
) => Promise<Buffer> = Promise.promisify(_readFile);

const parser = new Parsers.PUZ();

const puzzleKey = "8329";

const puzzlePath = path.resolve(__dirname, "puz_files", "NYT_Feb0216-locked-8329.puz");

const realFileSolution = "PLANE.SKY.BRAWLCOREA.YOU.LAVIESOFTG.NOG.OPALS...FLOCKOFBIRDSTOILER.SSR.DICEMOLITOR..OILCANCHEX.NARC.NYETS....HORIZON....HTEST.EDAM.MEMOIRAISE..RAMADANPART.SPA.NOCUTSSCHOOLOFFISH...THANK.NIL.ATONEEERIE.DRE.IWERERATTY.SEA.CORAL";

const puzzle = new Puzzle({
	info: {
		title: "Test puzzle",
		author: "Test author",
	},
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

function _pluckSolutions(puzzle: Puzzle) {
	return flatten(
		puzzle.grid.map(
			(row) => row.map(
				(c) => c.isBlockCell ? "." : c.solution
			)
		)
	).join("");
}

describe(".puz file parser", function() {
	it("should reject the returned promise when parsing a locked puzzle without a key", async function() {
		try {
			const fileContent = await readFile(puzzlePath, { encoding: null });
			await parser.parse(fileContent);
		}
		catch (err) {
			expect(err.message).to.match(/Puzzle solution is locked and no solutionKey option was provided/);
			return;
		}

		throw new Error("Parser should have thrown an error");
	});

	it("should parse a locked puzzle when given a key", async function() {
		const fileContent = await readFile(puzzlePath, { encoding: null });
		const puzzle = await parser.parse(fileContent, {
			solutionKey: puzzleKey
		});
		const solutions = _pluckSolutions(puzzle);

		expect(solutions).to.equal(realFileSolution);
	});
});

describe(".puz file generator", function() {
	it("should generate a locked .puz file", async function() {
		const fileBuffer = await parser.generate(
			puzzle,
			{
				solutionKey: puzzleKey
			}
		);

		const parsedPuzzle = await parser.parse(
			fileBuffer,
			{
				solutionKey: puzzleKey
			}
		);
		expect(_pluckSolutions(puzzle)).to.equal(_pluckSolutions(parsedPuzzle));
	});
});
