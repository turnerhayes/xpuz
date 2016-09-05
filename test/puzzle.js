/* globals describe, it */

"use strict";

var _         = require('lodash');
var expect    = require('expect.js');
var Puzzle    = require('../lib/puzzle');


var PUZZLE_DEFINITION = {
	grid: _.map(
		_.range(0, 3),
		function(rowIndex) {
			return [
				{
					isBlockCell: rowIndex === 0
				},
				{
					isBlockCell: rowIndex === 1
				},
				{
					isBlockCell: rowIndex === 2
				}
			];
		}
	)
};

function _createPuzzle() {
	return new Puzzle(PUZZLE_DEFINITION);
}

describe("Puzzle object", function() {
	it("should have the correct toString() return value", function() {
		var puzzle = _createPuzzle();

		expect(puzzle.toString()).to.be('[object Puzzle]');
	});

	it("should have the correct toJSON() return value", function() {
		var puzzle = _createPuzzle();

		var json = puzzle.toJSON();

		expect(json.grid).to.eql(PUZZLE_DEFINITION.grid);
		expect(json.clues).to.have.property('across');
		expect(json.clues).to.have.property('down');
		expect(json.userSolution).to.be.ok();
		expect(json.userSolution.length).to.be(3);
		expect(json.userSolution[0].length).to.be(3);
		expect(json.userSolution[1].length).to.be(3);
		expect(json.userSolution[2].length).to.be(3);
	});

	it("should output the correct getGridString() value", function() {
		var puzzle = _createPuzzle();

		expect(puzzle.getGridString()).to.be([
			'[  #  ] [     ] [     ]',
			'[     ] [  #  ] [     ]',
			'[     ] [     ] [  #  ]',
		].join('\n'));
	});
});
