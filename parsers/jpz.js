"use strict";

var fs = require('fs');
var _  = require('lodash');
var Puzzle = require('../lib/puzzle');

function JPZParser() {
	if (!(this instanceof JPZParser)) {
		return new JPZParser();
	}
}

JPZParser.prototype = Object.create(Object.prototype, {
	parse: {
		value: function(puzzle) {
			var filePath;

			if (_.isString(puzzle)) {
				// path to puzzle
				filePath = puzzle;
				try {
					puzzle = String(fs.readFileSync(filePath));
				}
				catch (ex) {
					throw new Error('Unable to read JPZ puzzle from file ' +
						puzzle + ': ' + ex.message);
				}
			}
			else if (_.isObject(puzzle)) {
				puzzle = puzzle;
			}
			else {
				throw new Error('parse() expects either a path string or a JSON object');
			}
		}
	}
});

exports = module.exports = JPZParser;
