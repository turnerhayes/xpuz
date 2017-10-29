/* globals describe, it */

const path      = require("path");
const fs        = require("fs");
const size      = require("lodash/size");
const get       = require("lodash/get");
const expect    = require("chai").expect;
const {
	Parsers,
	Puzzle,
	ImmutablePuzzle
}               = require("../src");

const parser = new Parsers.PUZ();

const puzzlePath = path.resolve(__dirname, "puz_files", "NYT_Feb0216.puz");

const rebusPuzzlePath = path.resolve(__dirname, "puz_files", "Rebus_NYT_Jan-0710.puz");

const puzzleBuffer = fs.readFileSync(puzzlePath);

describe(".puz file parser", function() {
	[
		{
			method: "parse",
			constructor: Puzzle,
			getter: get,
			size,
		},
		{
			method: "parseImmutable",
			constructor: ImmutablePuzzle,
			getter: (obj, path) => obj.getIn(path),
			size: (obj) => obj.size,
		},
	].forEach(
		(spec) => describe(spec.method, function() {
			it("should parse a puzzle file without errors", (done) => {
				parser[spec.method](puzzlePath).then(
					(puzzle) => {
						expect(puzzle).to.be.an.instanceof(constructor);
						done();
					}
				).catch(done);
			});

			it("should parse a rebus puzzle file without errors", (done) => {
				parser[spec.method](rebusPuzzlePath).then(
					(puzzle) => {
						expect(puzzle).to.be.an.instanceof(constructor);
						/* eslint-disable no-magic-numbers */
						expect(spec.getter(puzzle.grid, [0, 0, "solution"]), "Rebus solution at [0, 0]").to.equal("J");
						expect(spec.getter(puzzle.grid, [2, 6, "solution"]), "Rebus solution at [6, 2]").to.equal("ANT");
						expect(spec.getter(puzzle.grid, [8, 0, "solution"]), "Rebus solution at [8, 0]").to.equal("ANT");
						/* eslint-enable no-magic-numbers */
						done();
					}
				).catch(done);
			});

			it("should have the expected number of clues", (done) => {
				parser[spec.method](puzzlePath).then(
					(puzzle) => {
						/* eslint-disable no-magic-numbers */
						expect(spec.size(spec.getter(puzzle.clues, ["across"]), "Across clues count")).to.equal(37);
						expect(spec.size(spec.getter(puzzle.clues, ["down"]), "Down clues count")).to.equal(41);
						/* eslint-enable no-magic-numbers */

						done();
					}
				).catch(done);
			});

			it("should have correct width and height", (done) => {
				parser[spec.method](puzzlePath).then(
					(puzzle) => {
						/* eslint-disable no-magic-numbers */
						expect(spec.size(puzzle.grid), "Puzzle height").to.equal(15);
						expect(spec.size(spec.getter(puzzle.grid, [0])), "Puzzle width").to.equal(15);
						/* eslint-enable no-magic-numbers */

						done();
					}
				).catch(done);
			});

			it("should parse a puzzle from a buffer", (done) => {
				parser[spec.method](puzzleBuffer).then(
					(puzzle) => {
						/* eslint-disable no-magic-numbers */
						expect(spec.size(puzzle.grid), "Puzzle height").to.equal(15);
						expect(spec.size(spec.getter(puzzle.grid, [0])), "Puzzle width").to.equal(15);
						/* eslint-enable no-magic-numbers */

						done();
					}
				).catch(done);
			});
		})
	);
});
