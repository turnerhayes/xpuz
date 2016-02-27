/* globals describe, it */

"use strict";

var path      = require('path');
var _         = require('lodash');
var fs        = require('fs');
var temp      = require('temp').track();
var expect    = require('expect.js');
var PUZParser = require('../parsers/puz');
var Puzzle    = require('../lib/puzzle');

var parser = new PUZParser();

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

var rebusPuzzle = _.cloneDeep(puzzle);

rebusPuzzle.grid[1][1].solution = 'OST';
rebusPuzzle.grid[1][2].solution = 'OST';
rebusPuzzle.grid[1][4].solution = 'SAM';

function _validateGeneratedPuzzle(puzzle, parsedPuzzle) {
	expect(_.size(parsedPuzzle.grid)).to.be(_.size(puzzle.grid));
	expect(_.size(parsedPuzzle.grid[0])).to.be(_.size(puzzle.grid[0]));
	// expect(parsedPuzzle.grid).to.be(puzzle.grid);
	expect(parsedPuzzle.info.title).to.be(puzzle.info.title);
	expect(parsedPuzzle.info.author).to.be(puzzle.info.author);
	expect(parsedPuzzle.info.copyright).to.be(puzzle.info.copyright);
	expect(parsedPuzzle.info.intro).to.be(puzzle.info.intro);
	expect(_.size(parsedPuzzle.clues.across)).to.be(_.size(puzzle.clues.across));
	expect(_.size(parsedPuzzle.clues.down)).to.be(_.size(puzzle.clues.down));
}

describe('.puz file generator', function() {
	it('should generate a valid .puz file', function(done) {
		var file = parser.generate(puzzle);
		
		temp.open({suffix: '.puz'}, function(err, info) {
			if (err) {
				throw new Error('Error creating temp file: ' + err);
			}

			fs.writeFile(info.path, file, { encoding: null }, function(err) {
				if (err) {
					throw new Error('Error writing to temp file: ' + err);
				}

				parser.parse(info.path).done(
					function(parsedPuzzle) {
						_validateGeneratedPuzzle(puzzle, parsedPuzzle);
						done();
					},
					function(err) {
						if (_.isString(err)) {
							throw new Error(err);
						}

						throw err;
					}
				);
			});
		});
	});

	it('should generate a valid rebus .puz file', function(done) {
		var file = parser.generate(rebusPuzzle);
		
		temp.open({suffix: '.puz'}, function(err, info) {
			if (err) {
				throw new Error('Error creating temp file: ' + err);
			}

			fs.writeFile(info.path, file, { encoding: null }, function(err) {
				if (err) {
					throw new Error('Error writing to temp file: ' + err);
				}

				parser.parse(info.path).done(
					function(parsedPuzzle) {
						_validateGeneratedPuzzle(puzzle, parsedPuzzle);
						// expect(parsedPuzzle.)
						done();
					},
					function(err) {
						throw new Error(err);
					}
				);
			});
		});
	});
});
