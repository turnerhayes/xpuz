/* globals describe, it */

"use strict";

var path      = require('path');
var fs        = require('fs');
var _         = require('lodash');
var expect    = require('expect.js');
var PUZParser = require('../parsers/puz');

var parser = new PUZParser();

var puzzlePath = path.resolve(__dirname, 'puz_files', 'NYT_Feb0216.puz');

var puzzleBuffer = fs.readFileSync(puzzlePath);

describe('.puz file parser', function() {
	it('should parse a puzzle file without errors', function(done) {
		parser.parse(puzzlePath).done(
			function(puzzle) {
				expect(puzzle).to.be.ok();
				done();
			},
			function(err) {
				expect().to.fail(err);
				done();
			}
		);
	});

	it('should have the expected number of clues', function(done) {
		parser.parse(puzzlePath).done(
			function(puzzle) {
				expect(_.size(puzzle.clues.across)).to.be(37);
				expect(_.size(puzzle.clues.down)).to.be(41);

				done();
			}
		);
	});

	it('should have correct width and height', function(done) {
		parser.parse(puzzlePath).done(
			function(puzzle) {
				expect(_.size(puzzle.grid)).to.be(15);
				expect(_.size(puzzle.grid[0])).to.be(15);

				done();
			}
		);
	});

	it('should parse a puzzle from a buffer', function(done) {
		parser.parse(puzzleBuffer).done(
			function(puzzle) {
				expect(_.size(puzzle.grid)).to.be(15);
				expect(_.size(puzzle.grid[0])).to.be(15);

				done();
			}
		);
	});
});
