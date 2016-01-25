"use strict";

var path = require('path');
var IPUZParser = require('../index');

var puzzlePath = path.resolve(__dirname, 'ipuz_files', 'high-tech-mergers.ipuz');

var parser = new IPUZParser();

var puzzle = parser.parse(puzzlePath);

var util = require('util');
// console.log('puzzle:\n' + puzzle.getGridString());
console.log('puzzle grid:\n', util.inspect(puzzle.grid, { depth: null }));
// console.log('clues:\n', puzzle.clues);
