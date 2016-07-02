/* globals describe, it */

"use strict";

var path = require('path');
var expect = require('expect.js');
var IPUZParser = require('../parsers/ipuz');

var parser = new IPUZParser();

describe('IPUZParser', function() {
	it('should not throw an exception with a valid puzzle file', function() {
		parser.parse(
			path.resolve(
				__dirname,
				'ipuz_files',
				'high-tech-mergers.ipuz'
			)
		).done(
			function(puzzle) {
				expect(true).to.be.ok();
			},
			function(err) {
				expect().to.fail(err);
			}
		);
	});

	it('should throw an exception with an invalid puzzle file', function() {
		parser.parse(
			path.resolve(
				__dirname,
				'ipuz_files',
				'high-tech-mergers-smaller-dimensions.ipuz'
			)
		).done(
			function(puzzle) {
				expect().to.fail();
			},
			function(err) {
				expect(true).to.be.ok();
			}
		);
	});
});
