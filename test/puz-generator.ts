/* globals describe, it */

import Promise   from "bluebird";
import { writeFile as _writeFile } from "fs";
import { track as _tempTrack } from "temp";
import { expect } from "chai";

import {
	Puzzle,
	Parsers,
} from "../src";
import { IPuzzleConstructorArgs } from "../src/puzzle-utils";

const writeFile: (
	path: string,
	data: any,
	options?: {
		encoding?: string|null,
	}
) => Promise<any> = Promise.promisify(_writeFile);
const tempOpen  = Promise.promisify(_tempTrack().open);

const parser = new Parsers.PUZ();

function getPuzzleArgs(rebus = false): IPuzzleConstructorArgs {
	return {
		info: {
			title: "Test puzzle",
			author: "Test author",
			formatExtra: {
				version: "1.3",
				extensions: {
					cellStates: undefined,
					timing: undefined,
				},
			},
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

function _validateGeneratedPuzzle(puzzle: Puzzle, parsedPuzzle: Puzzle) {
	expect(parsedPuzzle.grid, "Grid contents").to.deep.equal(puzzle.grid);
	expect(parsedPuzzle.info, "Puzzle info").to.deep.equal(puzzle.info);
	expect(parsedPuzzle.clues, "Puzzle clues").to.deep.equal(puzzle.clues);
}

describe(".puz file generator", function() {
	it("should generate a valid .puz file", async function() {
		const puzzle = new Puzzle(getPuzzleArgs());

		const file = parser.generate(puzzle);
		
		const info = await tempOpen({suffix: ".puz"});
		await writeFile(info.path, file, { encoding: null });
		const parsedPuzzle = await parser.parse(info.path);
		_validateGeneratedPuzzle(puzzle, parsedPuzzle);
	});

	it("should generate a valid rebus .puz file", async function() {
		const rebusPuzzle = new Puzzle(getPuzzleArgs(true));

		const file = parser.generate(rebusPuzzle);
		
		const info = await tempOpen({suffix: ".puz"});
		await writeFile(info.path, file, { encoding: null });
		const parsedPuzzle = await parser.parse(info.path);
		_validateGeneratedPuzzle(rebusPuzzle, parsedPuzzle);
	});
});
