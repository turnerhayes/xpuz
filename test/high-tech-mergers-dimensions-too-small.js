/* globals describe, it */

"use strict";

var path = require('path');
var expect = require('expect.js');
var IPUZParser = require('../index');

var parser = new IPUZParser();

describe('IPUZParser', function() {
	it('should not throw an exception with a valid puzzle file', function() {
		expect(
			function() {
				parser.parse(
					path.resolve(
						__dirname,
						'ipuz_files',
						'high-tech-mergers.ipuz'
					)
				);
			}
		).to.not.throwException();
	});

	it('should throw an exception with an invalid puzzle file', function() {
		expect(
			function() {
				parser.parse(
					path.resolve(
						__dirname,
						'ipuz_files',
						'high-tech-mergers-smaller-dimensions.ipuz'
					)
				);
			}
		).to.throwException();
	});
});
