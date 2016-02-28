/* globals describe, it */

"use strict";

var path      = require('path');
var _         = require('lodash');
var fs        = require('fs');
var expect    = require('expect.js');
var PUZParser = require('../parsers/puz');
var Puzzle    = require('../lib/puzzle');

var parser = new PUZParser();

var puzzleKey = '8329';

var puzzlePath = path.resolve(__dirname, 'puz_files', 'NYT_Feb0216-locked-8329.puz');

var realFileSolution = 'PLANE.SKY.BRAWLCOREA.YOU.LAVIESOFTG.NOG.OPALS...FLOCKOFBIRDSTOILER.SSR.DICEMOLITOR..OILCANCHEX.NARC.NYETS....HORIZON....HTEST.EDAM.MEMOIRAISE..RAMADANPART.SPA.NOCUTSSCHOOLOFFISH...THANK.NIL.ATONEEERIE.DRE.IWERERATTY.SEA.CORAL';

var puzzle = new Puzzle({
	title: 'Test puzzle',
	author: 'Test author',
	grid: [
		[
			{
				solution: 'A',
				clueNumber: 1
			},
			{
				solution: 'N',
				clueNumber: 2
			},
			{
				isBlockCell: true
			},
			{
				solution: 'B',
				clueNumber: 3
			},
			{
				solution: 'E',
				clueNumber: 4
			}
		],
		[
			{
				solution: 'L',
				clueNumber: 5
			},
			{
				solution: 'O'
			},
			{
				solution: 'O'
			},
			{
				solution: 'T'
			},
			{
				solution: 'S'
			}
		]
	],
	clues: {
		across: {
			1: 'AN',
			3: 'BE',
			5: 'LOOTS'
		},
		down: {
			1: 'AL',
			2: 'NO',
			3: 'BT',
			4: 'ES'
		}
	}
});

function _pluckSolutions(puzzle) {
	return _.flatten(
		_.map(
			puzzle.grid,
			function(row) {
				return _.map(
					row,
					function(c) {
						if (c.isBlockCell) {
							return '.';
						}

						return c.solution;
					}
				);
			}
		)
	).join('');
}

describe('.puz file parser', function() {
	it('should throw an error when parsing a locked puzzle without a key', function(done) {
		parser.parse(fs.readFileSync(puzzlePath)).done(
			function(puzzle) {
				done('No error thrown');
			},
			function(err) {
				expect(true).to.be.ok();
				done();
			}
		);
	});

	it('should parse a locked puzzle when given a key', function(done) {
		parser.parse(
			fs.readFileSync(puzzlePath),
			{
				solutionKey: puzzleKey
			}
		).done(
			function(puzzle) {
				var solutions = _pluckSolutions(puzzle);

				expect(solutions).to.be(realFileSolution);
				done();
			},
			done
		);
	});
});

describe('.puz file generator', function() {
	it('should throw an error if generating a scrambled puzzle without a solutionKey specified', function() {
		expect(function() {
			parser.generate(
				puzzle,
				{
					scrambled: true
				}
			);
		}).to.throwError(/Must specify a solution key/);
	});

	it('should generate a locked .puz file', function(done) {
		var fileBuffer = parser.generate(
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
		).done(
			function(parsedPuzzle) {
				expect(_pluckSolutions(puzzle)).to.be(_pluckSolutions(parsedPuzzle));

				done();
			},
			done
		);
	});
});