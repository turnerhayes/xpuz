/* globals describe, it */

import path from "path";
import fs from "fs";
import size from "lodash/size";
import get from "lodash/get";
import { expect } from "chai";
import {
	Parsers,
	Puzzle,
} from "../src";
import PUZParser from "../src/parsers/puz";
import {
	Puzzle as ImmutablePuzzle,
} from "../src/immutable";
import ImmutablePUZParser from "../src/immutable/parsers/puz";
import { Map, Collection } from "immutable";

type Spec = {
	immutable: true;
	constructor: new (...args: any[]) => ImmutablePuzzle;
	size: (obj: any) => number;
	getter: (obj: any, path: any[]) => any;
	parser: ImmutablePUZParser;
} | {
	immutable: false;
	constructor: new (...args: any[]) => Puzzle;
	size: (obj: any) => number;
	getter: (obj: any, path: any[]) => any;
	parser: PUZParser;
}

const parser = new PUZParser();

const immutableParser = new ImmutablePUZParser();

const puzFilesDir = path.resolve(__dirname, "puz_files");

const puzzlePath = path.join(puzFilesDir, "NYT_Feb0216.puz");

const rebusPuzzlePath = path.join(puzFilesDir, "Rebus_NYT_Jan-0710.puz");

const puzzleBuffer = fs.readFileSync(puzzlePath);

describe(".puz file parser", function() {
	[
		{
			immutable: false,
			constructor: Puzzle,
			getter: get,
			size,
			parser,
		} as Spec,
		{
			immutable: true,
			constructor: ImmutablePuzzle,
			getter: (obj: Map<any, any>, path: any[]) => obj.getIn(path),
			size: (obj: any) => (obj as Collection<any, any>).size,
			parser: immutableParser,
		} as Spec,
	].forEach(
		(spec: Spec) => describe(`parse${spec.immutable ? " (immutable)" : ""}`, function() {
			it(`should parse a puzzle file without errors`, async () => {
				const puzzle = await spec.parser.parse(puzzlePath);
				expect(puzzle).to.be.an.instanceof(spec.constructor);
			});

			it(`should parse a version 1.2 puzzle file without errors`, async () => {
				const puzzle = await spec.parser.parse(path.join(puzFilesDir, "version-1.2-puzzle.puz"));
				expect(puzzle).to.be.an.instanceof(spec.constructor);
			});

			it(`should parse a version 1.2 puzzle file with notes without errors`, async () => {
				const puzzle = await spec.parser.parse(path.join(puzFilesDir, "version-1.2-puzzle-with-notes.puz"));
				expect(puzzle).to.be.an.instanceof(spec.constructor);
			});

			// const runnerFunc = spec.immutable ? it : it.only;
			it("should parse a rebus puzzle file without errors", async () => {
				const puzzle = await spec.parser.parse(rebusPuzzlePath);
				expect(puzzle).to.be.an.instanceof(spec.constructor);
				/* eslint-disable no-magic-numbers */
				expect(spec.getter(puzzle.grid, [0, 0, "solution"]), "Rebus solution at [0, 0]").to.equal("J");
				expect(spec.getter(puzzle.grid, [2, 6, "solution"]), "Rebus solution at [6, 2]").to.equal("ANT");
				expect(spec.getter(puzzle.grid, [8, 0, "solution"]), "Rebus solution at [8, 0]").to.equal("ANT");
				/* eslint-enable no-magic-numbers */
			});

			it("should have the expected number of clues", async () => {
				const puzzle = await spec.parser.parse(puzzlePath);
				/* eslint-disable no-magic-numbers */
				expect(spec.size(spec.getter(puzzle.clues, ["across"])), "Across clues count").to.equal(37);
				expect(spec.size(spec.getter(puzzle.clues, ["down"])), "Down clues count").to.equal(41);
				/* eslint-enable no-magic-numbers */
			});

			it("should have correct width and height", async () => {
				const puzzle = await spec.parser.parse(puzzlePath);
				/* eslint-disable no-magic-numbers */
				expect(spec.size(puzzle.grid), "Puzzle height").to.equal(15);
				expect(spec.size(spec.getter(puzzle.grid, [0])), "Puzzle width").to.equal(15);
				/* eslint-enable no-magic-numbers */
			});

			it("should parse a puzzle from a buffer", async () => {
				const puzzle = await spec.parser.parse(puzzleBuffer);
				/* eslint-disable no-magic-numbers */
				expect(spec.size(puzzle.grid), "Puzzle height").to.equal(15);
				expect(spec.size(spec.getter(puzzle.grid, [0])), "Puzzle width").to.equal(15);
				/* eslint-enable no-magic-numbers */
			});
		})
	);
});
