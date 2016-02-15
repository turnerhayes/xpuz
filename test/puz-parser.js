/* globals describe, it */

"use strict";

var path      = require('path');
var expect    = require('expect.js');
var PUZParser = require('../parsers/puz');

var parser = new PUZParser();

var puzzlePath = path.resolve(__dirname, 'puz_files', 'NYT_Feb0216.puz');

describe('PUZParser', function() {
	it('should successfully parse a puzzle file', function() {
		parser.parse(puzzlePath).done(
			function(puzzle) {
				expect(puzzle).to.be.ok();
			},
			function(err) {
				expect().to.fail(err);
			}
		);
	});
});
