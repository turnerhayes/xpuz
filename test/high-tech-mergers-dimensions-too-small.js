/* globals describe, it */

const path       = require("path");
const expect     = require("chai").expect;
const IPUZParser = require("../src/parsers/ipuz");
const Puzzle     = require("../src/puzzle");

const parser = new IPUZParser();

describe("IPUZParser", function() {
	it("should resolve the promise when given a valid puzzle file", function(done) {
		parser.parse(
			path.resolve(
				__dirname,
				"ipuz_files",
				"high-tech-mergers.ipuz"
			)
		).then(
			(puzzle) => {
				expect(puzzle).to.be.an.instanceof(Puzzle);
				done();
			}
		).catch(done);
	});

	it("should reject the promise when given an invalid puzzle file", function(done) {
		parser.parse(
			path.resolve(
				__dirname,
				"ipuz_files",
				"high-tech-mergers-smaller-dimensions.ipuz"
			)
		).then(
			() => done(new Error("Promise should have been rejected"))
		).catch(
			(err) => {
				expect(err).to.not.be.undefined;
				done();
			}
		);
	});
});
