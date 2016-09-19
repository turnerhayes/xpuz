"use strict";

/**
 * PUZ file parser.
 *
 * @module xpuz/parsers/puz
 * @see {@link module:xpuz/puzzle|Puzzle}
 */

var path         = require('path');
var fs           = require('fs');
var Q            = require('q');
var _            = require('lodash');
var iconv        = require('iconv-lite');
var PUZReader    = require('./puz/puz-reader');
var Puzzle       = require('../lib/puzzle');


/**
 * Q promise class
 * @external Q/Promise
 * @see {@link https://github.com/kriskowal/q/wiki/API-Reference|Q}
 */


var BLOCK_CELL_VALUE = '.';

var BLOCK_CELL_VALUE_REGEX = /\./g;

var EXTENSION_HEADER_LENGTH = 8;

var PUZZLE_TYPE = {
	Normal: 0x0001,
	Diagramless: 0x0401
};

var SOLUTION_STATE = {
    // solution is available in plaintext
    Unlocked: 0x0000,
    // solution is locked (scrambled) with a key
    Locked: 0x0004
};

var CELL_STATES = {
	PreviouslyIncorrect: 0x10,
	CurrentlyIncorrect: 0x20,
	AnswerGiven: 0x40,
	Circled: 0x80
};

var ATOZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function _doChecksum(buffer, cksum) {
	var i;

	for (i = 0; i < buffer.length; i++) {
        // right-shift one with wrap-around
		var lowbit = cksum & 0x0001;

		cksum = cksum >> 1;

		if (lowbit) {
			cksum = cksum | 0x8000;
		}

        // then add in the data and clear any carried bit past 16
		cksum = (cksum + buffer.readUInt8(i)) & 0xFFFF;
	}

	return cksum;
}

function _readHeader(reader, options) {
	var data = {};
	var deferred = Q.defer();

	data.globalChecksum = reader._readUInt16();

	reader._seek('ACROSS&DOWN\0'.length, { current: true });

	data.headerChecksum = reader._readUInt16();

	data.magicChecksum = reader._readValues(8);

	data.version = reader._readString();

	data.unknown1 = reader._readValues(2);

	data.scrambledChecksum = reader._readUInt16();

	data.unknown2 = reader._readValues(12);

	data.width = reader._readUInt8();

	data.height = reader._readUInt8();

	data.numberOfClues = reader._readUInt16();

	data.puzzleType = reader._readUInt16();

	data.solutionState = reader._readUInt16();

	if (data.solutionState === SOLUTION_STATE.Locked && !options.solutionKey) {
		throw new Error('Puzzle solution is locked and no solutionKey option was provided');
	}

	return data;
}

function _processExtension(extension) {
	var checksum;

	if (extension.name === 'GRBS') {
		extension.board = _.map(
			extension.data,
			function(b) {
				if (b === 0) {
					return null;
				}

				return b - 1;
			}
		);
	}

	if (extension.name === 'RTBL') {
		extension.rebus_solutions = _.reduce(
			iconv.decode(extension.data, PUZReader.ENCODING).split(';'),
			function(solutions, solutionPair) {
				var pair = solutionPair.split(':');

				pair[0] = parseInt(pair[0], 10);

				solutions[pair[0]] = pair[1];

				return solutions;
			},
			{}
		);
	}

	if (extension.name === 'LTIM') {
		var timings = iconv.decode(extension.data, PUZReader.ENCODING).split(',');

		extension.timing = {
			elapsed: parseInt(timings[0], 10),
			running: timings[1] === '0'
		};
	}

	if (extension.name === 'GEXT') {
		extension.cell_states = _.map(
			extension.data,
			function(b) {
				return {
					PreviouslyIncorrect: !!(b & CELL_STATES.PreviouslyIncorrect),
					CurrentlyIncorrect: !!(b & CELL_STATES.CurrentlyIncorrect),
					AnswerGiven: !!(b & CELL_STATES.AnswerGiven),
					Circled: !!(b & CELL_STATES.Circled)
				};
			}
		);
	}

	if (extension.name === 'RUSR') {
		extension.user_rebus_entries = _.map(
			iconv.decode(extension.data, PUZReader.ENCODING).split('\0'),
			function(entry) {
				if (entry === '') {
					return null;
				}

				return entry;
			}
		);
	}

	return extension;
}

function _readExtension(reader) {
	var extension = {};

	var length;

	extension.extensionName = reader._readString(4);

	length = reader._readUInt16();

	extension.checksum = reader._readUInt16();

	// Include null byte at end
	extension.data = reader._readValues(length + 1);
	// Remove null byte at the end
	extension.data = extension.data.slice(0, -1);

	return _processExtension(extension);
}

function _parseEnd(reader, data) {
	var remainingLength = reader.size() - reader.tell();
	var extension;

	if (remainingLength >= EXTENSION_HEADER_LENGTH) {
		extension = _readExtension(reader);

		data.extensions = data.extensions || {};
		data.extensions[extension.name] = extension;

		delete extension.name;

		_parseEnd(reader, data);
	}
}

function _parseExtensions(reader, puzzleData) {
	var data = {};

	_parseEnd(reader, data);

	var rebus = [];

	if (_.get(data, 'extensions.GRBS')) {
		_.each(
			_.flatten(puzzleData.grid),
			function(cell, index) {
				var c = cell;

				if (_.isNull(data.extensions.GRBS.board[index])) {
					return;
				}

				var rebusSolution = data.extensions.RTBL.rebus_solutions[
					data.extensions.GRBS.board[index]
				];

				c.solution = rebusSolution;
			}
		);
	}

	if (_.get(data, 'extensions.RUSR')) {
		_.each(
			data.extensions.RUSR.user_rebus_entries,
			function(rusr, index) {
				if (!_.isNull(rusr)) {
					var y = Math.floor(index / puzzleData.header.width);
					var x = index % puzzleData.header.width;

					puzzleData.solution[y][x] = rusr;
				}
			}
		);
	}

	puzzleData._extensions = data.extensions;

	puzzleData.timing = _.get(data, 'extensions.LTIM.timing');
}

function _readClues(reader, numberOfClues) {
	var clues = [];

	var promise = Q();

	var i;

	for (i = 0; i < numberOfClues; i++) {
		clues.push(reader._readString());
	}

	return clues;
}

function _generateGridAndClues(answers, clueList) {
	function _isBlockCell(x, y) {
		return answers[y][x] === BLOCK_CELL_VALUE;
	}

	var clues = {
		across: {},
		down: {}
	};

	var acrossCells = [], downCells = [];

	var grid = [];

	var row, cell, down, across;

	var x, y, width = answers[0].length, height = answers.length;

	var clueCount = 0;

	var clueListIndex = 0;

	for (y = 0; y < height; y++) {
		row = [];

		for (x = 0; x < width; x++) {
			cell = {};

			if (_isBlockCell(x, y)) {
				cell.isBlockCell = true;
			}
			else {
				cell.solution = answers[y][x];

				down = false;
				across = false;

				if (
					(
						x === 0 ||
						_isBlockCell(x - 1, y)
					) && (
						x + 1 < width &&
						!_isBlockCell(x + 1, y)
					)
				) {
					across = true;
				}

				if (
					(
						y === 0 ||
						_isBlockCell(x, y - 1)
					) && (
						y + 1 < height &&
						!_isBlockCell(x, y + 1)
					)
				) {
					down = true;
				}

				if (across || down) {
					cell.clueNumber = ++clueCount;
				}

				if (across) {
					clues.across[clueCount] = clueList[clueListIndex++];
				}

				if (down) {
					clues.down[clueCount] = clueList[clueListIndex++];
				}
			}
			

			row.push(cell);
		}

		grid.push(row);
	}

	return {
		grid: grid,
		clues: clues
	};
}

function _pluckSolutions(grid) {
	return _.map(
		grid,
		function(row) {
			return _.map(
				row,
				function(cell) {
					if (cell.isBlockCell) {
						return BLOCK_CELL_VALUE;
					}

					return cell.solution;
				}
			);
		}
	);
}

function _flattenSolution(solution) {
	return _.map(
		_.flatten(solution),
		function(entry) {
			if (_.isNull(entry)) {
				return entry;
			}

			if (entry === '') {
				return '-';
			}

			return entry[0];
		}
	).join('');
}

function _unflattenSolution(solution, width) {
	return _.map(
		_.chunk(
			solution.split(''),
			width
		),
		function(row) {
			return _.map(
				row,
				function(cell) {
					if (cell === '-') {
						return '';
					}

					return cell;
				}
			);
		}
	);
}

function _textChecksum(puzzleData, checksum) {
	if (puzzleData.title) {
		checksum = _doChecksum(iconv.encode(puzzleData.title + '\0', PUZReader.ENCODING), checksum);
	}

	if (puzzleData.author) {
		checksum = _doChecksum(iconv.encode(puzzleData.author + '\0', PUZReader.ENCODING), checksum);
	}


	if (puzzleData.copyright) {
		checksum = _doChecksum(iconv.encode(puzzleData.copyright + '\0', PUZReader.ENCODING), checksum);
	}

	_.each(
		puzzleData.clueList,
		function(clue) {
			if (clue) {
				checksum = _doChecksum(iconv.encode(clue, PUZReader.ENCODING), checksum);
			}
		}
	);

	if (puzzleData.notes) {
		checksum = _doChecksum(iconv.encode(puzzleData.notes + '\0', PUZReader.ENCODING), checksum);
	}

	return checksum;
}

function _headerChecksum(puzzleData, checksum) {
	if(_.isUndefined(checksum)) {
		checksum = 0;
	}

	var buffer = new Buffer(8);

	buffer.writeUInt8(puzzleData.header.width, 0);
	buffer.writeUInt8(puzzleData.header.height, 1);
	buffer.writeUInt16LE(puzzleData.header.numberOfClues, 2);
	buffer.writeUInt16LE(puzzleData.header.puzzleType, 4);
	buffer.writeUInt16LE(puzzleData.header.solutionState, 6);

	return _doChecksum(buffer, checksum);
}

function _globalChecksum(puzzleData, headerChecksum) {
	var checksum = _.isUndefined(headerChecksum) ? _headerChecksum(puzzleData) : headerChecksum;

	var buffer = iconv.encode(puzzleData.answer, PUZReader.ENCODING);

	checksum = _doChecksum(buffer, checksum);

	buffer = iconv.encode(puzzleData.solution, PUZReader.ENCODING);

	checksum = _doChecksum(buffer, checksum);

	checksum = _textChecksum(puzzleData, checksum);

	return checksum;
}

function _magicChecksum(puzzleData) {
	var headerChecksum = _headerChecksum(puzzleData);
	var answerChecksum = _doChecksum(iconv.encode(puzzleData.answer, PUZReader.ENCODING));
	var solutionChecksum = _doChecksum(iconv.encode(puzzleData.solution, PUZReader.ENCODING));
	var textChecksum = _textChecksum(puzzleData);

	var MAGIC_CHECKSUM_STRING = 'ICHEATED';

	var magicChecksum = new Buffer([
		MAGIC_CHECKSUM_STRING.charCodeAt(0) ^ (headerChecksum & 0xFF),
		MAGIC_CHECKSUM_STRING.charCodeAt(1) ^ (answerChecksum & 0xFF),
		MAGIC_CHECKSUM_STRING.charCodeAt(2) ^ (solutionChecksum & 0xFF),
		MAGIC_CHECKSUM_STRING.charCodeAt(3) ^ (textChecksum & 0xFF),
		MAGIC_CHECKSUM_STRING.charCodeAt(4) ^ ((headerChecksum & 0xFF00) >> 8),
		MAGIC_CHECKSUM_STRING.charCodeAt(5) ^ ((answerChecksum & 0xFF00) >> 8),
		MAGIC_CHECKSUM_STRING.charCodeAt(6) ^ ((solutionChecksum & 0xFF00) >> 8),
		MAGIC_CHECKSUM_STRING.charCodeAt(7) ^ ((textChecksum & 0xFF00) >> 8)
	]);


	return magicChecksum;
}

function _transposeGrid(gridString, width, height) {
	var data = gridString.match(new RegExp('.{1,' + width + '}', 'g'));

	return _.map(
		_.range(width),
		function(c) {
			return _.map(
				_.range(height),
				function(r) {
					return data[r][c];
				}
			).join('');
		}
	).join('');
}

function _restoreSolution(s, t) {
	/*
	s is the source string, it can contain '.'
	t is the target, it's smaller than s by the number of '.'s in s

	Each char in s is replaced by the corresponding
	char in t, jumping over '.'s in s.

	>>> restore('ABC.DEF', 'XYZABC')
	'XYZ.ABC'
	*/
    
	t = t.split('');

	return _.reduce(
		s,
		function(arr, c) {
			if (c === BLOCK_CELL_VALUE) {
				arr.push(c);
			}
			else {
				arr.push(t.shift());
			}

			return arr;
		},
		[]
	).join('');
}

function _unscrambleString(str, key) {
	var len = str.length;

	_.each(
		_.reverse(_.padStart(key, 4, '0').split('')),
		function(k) {
			str = _unshuffle(str);
			str = str.substring(len - k) + str.substring(0, len - k);
			str = _unshift(str, key);
		}
	);

	return str;
}

function _scrambleString(str, key) {
	/*
	str is the puzzle's solution in column-major order, omitting black squares:
	i.e. if the puzzle is:
		C A T
		# # A
		# # R
	solution is CATAR


	Key is a 4-digit number in the range 1000 <= key <= 9999

    */

    _.each(
    	_.padStart(key, 4, '0'),
    	function(k) {
    		str = _shift(str, key);
    		str = str.substring(k) + str.substring(0, k);
    		str = _shuffle(str);
    	}
	);

    return str;
}

function _shift(str, key) {
	return _.map(
		str,
		function(c, index) {
			var letterIndex = (_.indexOf(ATOZ, c) + Number(key[index % key.length])) % ATOZ.length;

			if (letterIndex < 0) {
				letterIndex = ATOZ.length + letterIndex;
			}

			return ATOZ[letterIndex];
		}
	).join('');
}

function _unshift(str, key) {
	return _shift(
		str,
		_.map(
			key,
			function(k) {
				return -k;
			}
		)
	);
}

function _shuffle(str) {
    var mid = Math.floor(str.length / 2);
    return _.reduce(
    	_.zip(
    		str.substring(mid).split(''),
    		str.substring(0, mid).split('')
    	),
    	function(arr, chars) {
    		if (_.isUndefined(chars[0]) || _.isUndefined(chars[1])) {
    			return arr;
    		}

    		arr.push(chars[0] + chars[1]);

    		return arr;
    	},
    	[]
    ).join('') + (str.length % 2 ? str[str.length - 1] : '');
}

function _unshuffle(str) {
	return _everyOther(str.substring(1)) + _everyOther(str);
}

function _everyOther(str) {
	return _.reduce(
		str,
		function(arr, c, i) {
			if (i % 2 === 0) {
				arr.push(c);
			}

			return arr;
		},
		[]
	).join('');
}

function _scrambledChecksum(answer, width, height) {
	var transposed = _transposeGrid(
		_flattenSolution(answer),
		width,
		height
	).replace(BLOCK_CELL_VALUE_REGEX, '');

	return _doChecksum(iconv.encode(transposed, PUZReader.ENCODING));
}

function _validateChecksums(puzzleData) {
	var deferred = Q.defer();

	var numberOfCells = puzzleData.header.width * puzzleData.header.height;

	var headerChecksum = _headerChecksum(puzzleData);

	var globalChecksum = _globalChecksum(puzzleData, headerChecksum);

	var magicChecksum = _magicChecksum(puzzleData);

	var checksums = {
		header: headerChecksum,
		global: globalChecksum,
		magic: magicChecksum
	};

	var errors = [];

	if (checksums.header !== puzzleData.header.headerChecksum) {
		errors.push('header checksums do not match');
	}

	if (checksums.global !== puzzleData.header.globalChecksum) {
		errors.push('global checksums do not match');
	}

	if (!checksums.magic.equals(puzzleData.header.magicChecksum)) {
		errors.push('magic checksums do not match');
	}

	_.each(
		puzzleData._extensions,
		function(extension, name) {
			if (extension.checksum !== _doChecksum(extension.data)) {
				errors.push('checksum for extension ' + name + ' does not match');
			}
		}
	);

	return errors;
}

function _scrambleSolution(solutionGrid, key) {
	var height = solutionGrid.length;
	var width = solutionGrid[0].length;

	var solutionString = _.flatten(
		_flattenSolution(solutionGrid)
	).join('');

	var transposed = _transposeGrid(solutionString, width, height);

	var data = _restoreSolution(
		transposed,
		_scrambleString(transposed.replace(BLOCK_CELL_VALUE_REGEX, ''), key)
	);

	solutionString = _transposeGrid(data, height, width);

	return _.chunk(solutionString.split(''), width);
}

function _unscrambleSolution(puzzleData, key) {
	var transposed = _transposeGrid(
		puzzleData.answer,
		puzzleData.header.width,
		puzzleData.header.height
	);

	var data = _restoreSolution(
		transposed,
		_unscrambleString(
			transposed.replace(BLOCK_CELL_VALUE_REGEX, ''),
			key
		)
	);

	var result = _transposeGrid(
		data,
		puzzleData.header.height,
		puzzleData.header.width
	);

	if (result === puzzleData.answer) {
		throw new Error('Unscrambled solution is the same as the scrambled solution; incorrect key?');
	}

	return result;
}

function _writeHeader(puzzleData, options) {
	var globalChecksumBuffer = new Buffer(2);

	globalChecksumBuffer.writeUInt16LE(_globalChecksum(puzzleData));

	var headerChecksumBuffer = new Buffer(2);

	headerChecksumBuffer.writeUInt16LE(_headerChecksum(puzzleData));

	var magicChecksumBuffer = _magicChecksum(puzzleData);

	var scrambledChecksumBuffer = new Buffer(2);

	if (_.get(options, 'scrambled')) {
		scrambledChecksumBuffer.writeUInt16LE(
			_scrambledChecksum(
				puzzleData.unscrambledAnswer,
				puzzleData.header.width,
				puzzleData.header.height
			)
		);
	}
	else {
		scrambledChecksumBuffer.fill(0x0);
	}

	var numberOfCluesBuffer = new Buffer(2);

	numberOfCluesBuffer.writeUInt16LE(puzzleData.header.numberOfClues);

	var puzzleTypeBuffer = new Buffer(2);

	puzzleTypeBuffer.writeUInt16LE(puzzleData.header.puzzleType);

	var solutionStateBuffer = new Buffer(2);

	solutionStateBuffer.writeUInt16LE(puzzleData.header.solutionState);

	return Buffer.concat(
		[
			globalChecksumBuffer,
			iconv.encode('ACROSS&DOWN\0', PUZReader.ENCODING),
			headerChecksumBuffer,
			magicChecksumBuffer,
			iconv.encode(_.get(options, 'version', '1.3') + '\0', PUZReader.ENCODING),
			new Buffer([0x0, 0x0]),
			scrambledChecksumBuffer,
			new Buffer(12).fill(0x0),
			new Buffer([puzzleData.header.width]),
			new Buffer([puzzleData.header.height]),
			numberOfCluesBuffer,
			puzzleTypeBuffer,
			solutionStateBuffer
		],
		52
	);
}

function _writeExtension(extensionBuffer, extensionName) {
	var lengthBuffer = new Buffer(2);
	lengthBuffer.writeUInt16LE(extensionBuffer.length);

	var checksumBuffer = new Buffer(2);
	checksumBuffer.writeUInt16LE(_doChecksum(extensionBuffer));

	return Buffer.concat(
		[
			iconv.encode(extensionName, PUZReader.ENCODING),
			lengthBuffer,
			checksumBuffer,
			extensionBuffer,
			new Buffer([0])
		],
		4 + 2 + 2 + extensionBuffer.length + 1
	);
}

function _writeGRBS(answerArray, rebusSolutions) {
	var grbsBuffer = new Buffer(
		_.map(
			answerArray,
			function(cell, index) {
				var solutionKey = _.findKey(
					rebusSolutions,
					function(solutionInfo, key) {
						return _.includes(solutionInfo.cells, index);
					}
				);

				if (_.isUndefined(solutionKey)) {
					return 0;
				}

				return parseInt(solutionKey, 10) + 1;
			}
		)
	);

	return _writeExtension(grbsBuffer, 'GRBS');
}

function _writeRTBL(rebusSolutions) {
	var rtblBuffer = iconv.encode(
		_.map(
			rebusSolutions,
			function(solutionInfo, key) {
				return _.padStart(key, 2, ' ') + ':' + solutionInfo.solution + ';';
			}
		).join(''),
		PUZReader.ENCODING
	);

	return _writeExtension(rtblBuffer, 'RTBL');
}

function _writeRUSR(userSolutionArray) {
	var rusrBuffer = iconv.encode(
		_.map(
			userSolutionArray,
			function(solution) {
				if (solution.length > 1) {
					return solution + '\0';
				}

				return '\0';
			}
		).join(''),
		PUZReader.ENCODING
	);

	return _writeExtension(rusrBuffer, 'RUSR');
}

function _writeLTIM(timing) {
	return _writeExtension(
		iconv.encode(
			timing.elapsed + ',' + (timing.running ? '1' : '0'),
			PUZReader.ENCODING
		),
		'LTIM'
	);
}

function _writeRebus(answerArray, userSolutionArray, extensions) {
	var solutionKey = 0;

	var rebusSolutions = _.reduce(
		_.flatten(answerArray),
		function(solutions, cellSolution, cellIndex) {
			var key;

			if (cellSolution && cellSolution.length > 1) {
				key = _.findKey(solutions, {solution: cellSolution});

				if (_.isUndefined(key)) {
					solutions[++solutionKey] = {
						solution: cellSolution,
						cells: [cellIndex]
					};
				}
				else {
					solutions[key].cells.push(cellIndex);
				}
			}

			return solutions;
		},
		{}
	);

	var grbsBuffer = _writeGRBS(answerArray, rebusSolutions);

	var rtblBuffer = _writeRTBL(rebusSolutions);

	var rusrBuffer = _writeRUSR(userSolutionArray);

	var ltimBuffer = new Buffer(0);
	if (extensions.timing) {
		ltimBuffer = _writeLTIM(extensions.timing);
	}

	return Buffer.concat(
		[
			grbsBuffer,
			rtblBuffer,
			rusrBuffer,
			ltimBuffer
		],
		grbsBuffer.length + rtblBuffer.length + rusrBuffer.length + ltimBuffer.length
	);
}

function _parsePuzzle(path, options) {
	var data = {};

	var reader = new PUZReader(path);

	data.header = _readHeader(reader, options);

	var numberOfCells = data.header.width * data.header.height;

	data.answer = reader._readString(numberOfCells);

	if (data.header.solutionState === SOLUTION_STATE.Locked) {						
		data.unscrambledAnswer = _unscrambleSolution(
			{
				header: data.header,
				answer: data.answer
			},
			options.solutionKey
		);
	}
	else {
		data.unscrambledAnswer = data.answer;
	}

	data.solution = reader._readString(numberOfCells);

	data.title = reader._readString();

	data.author = reader._readString();

	data.copyright = reader._readString();

	data.clueList = _readClues(reader, data.header.numberOfClues);

	var gridAndClues = _generateGridAndClues(
		_unflattenSolution(data.unscrambledAnswer, data.header.width),
		data.clueList
	);

	data.grid = gridAndClues.grid;
	data.clues = gridAndClues.clues;

	data.notes = reader._readString();

	 _parseExtensions(reader, data);

	 return data;
}

function validatePuzzle(puzzle) {
	var checksumResults = _validateChecksums(puzzle);

	var errors = [];

	if (checksumResults) {
		errors = errors.concat(checksumResults);
	}

	return _.isEmpty(errors) ? undefined : errors;
}

/**
 * Parser class for PUZ-formatted puzzles.
 *
 * @constructor
 */
function PUZParser() {
	if (!(this instanceof PUZParser)) {
		return new PUZParser();
	}
}


/**
 * Buffer object
 * @external Buffer
 * @see {@link https://nodejs.org/api/buffer.html|Buffer Node API}
 */

PUZParser.prototype = Object.create(Object.prototype, {
	/**
	 * Parses a file in .puz format into a {@link module:xpuz/puzzle~Puzzle|Puzzle} object.
	 *
	 * @memberOf module:xpuz/parsers/puz~PUZParser
	 * @function
	 * @instance
	 *
	 * @param {string|external:Buffer|ArrayBuffer} path - the .puz file to parse, either as a file path
	 *	(strong) or a {@link external:Buffer|Buffer} or {@link external:ArrayBuffer|ArrayBuffer} containing the puzzle
	 *	content.
	 * @param {object} [options] - an object of options to affect the parsing
	 * @param {Number} [options.solutionKey] - an integer between 1000 and 9999, inclusive, to use to unlock
	 *	the puzzle's solution if the solution is locked. If the solution is not locked, this is ignored.
	 *
	 * @throws if the puzzle is locked and an invalid (or no) `options.solutionKey` was provided
	 *
	 * @returns {external:Q/Promise} a promise that resolves with the {@link module:xpuz/puzzle~Puzzle|Puzzle} object 
	 */
	parse: {
		value: function parse(path, options) {
			var parser = this;
			var puzzleData, errors, puzzleDefinition;
			var deferred = Q.defer();

			options = options || {};

			try {
				puzzleData = _parsePuzzle(path, options);

				errors = validatePuzzle(puzzleData);

				if (!_.isUndefined(errors)) {
					deferred.reject('Invalid puzzle:\n\t' + errors.join('\n\t'));
				}
				else {
					puzzleDefinition = {
						title: puzzleData.title,
						author: puzzleData.author,
						copyright: puzzleData.copyright,
						intro: puzzleData.notes || undefined,
						grid: puzzleData.grid,
						clues: puzzleData.clues,
						userSolution: _unflattenSolution(puzzleData.solution, puzzleData.header.width),
						extensions: {
							timing: puzzleData.timing
						}
					};

					deferred.resolve(new Puzzle(puzzleDefinition));
				}
			}
			catch(err) {
				deferred.reject(err);
			}

			return deferred.promise;
		}
	},

	/**
	 * Given a {@link module:xpuz/puzzle~Puzzle|Puzzle} object, returns a {@link external:Buffer|Buffer}
	 * containing the puzzle in .puz format.
	 *
	 * @memberOf module:xpuz/parsers/puz~PUZParser
	 * @function
	 * @instance
	 *
	 * @param {module:xpuz/puzzle~Puzzle} puzzle - the puzzle to convert to .puz content.
	 * @param {object} [options] - an object containing additional options for the conversion
	 * @param {boolean} [options.scrambled] - if true, the puzzle's solution will be scrambled
	 * @param {Number} [options.solutionKey] - the solution key with which to scramble the solution. 
	 *	If `options.scrambled` is true, this is required.
	 *
	 * @throws if `options.scrambled` is true but `options.solutionKey` is not a 4-digit integer
	 *	(between 1000 and 9999, inclusive).
	 *
	 * @returns {external:Buffer} a Buffer containing the .puz content. 
	 */
	generate: {
		value: function generate(puzzle, options) {
			var numberOfClues = _.size(puzzle.clues.across) + _.size(puzzle.clues.down);
			var puzzleType = PUZZLE_TYPE.Normal;
			var solutionState = SOLUTION_STATE.Unlocked;

			options = options || {};

			var height = _.size(puzzle.grid);
			var width = _.size(puzzle.grid[0]);

			var notes = puzzle.info.intro || '';

			var answerArray = _pluckSolutions(puzzle.grid);
			var unscrambledAnswerArray;

			if (options.scrambled) {
				if (
					!options.solutionKey ||
					Number(options.solutionKey) < 1000 ||
					Number(options.solutionKey) > 9999
				) {
					throw new Error('Must specify a solution key that is an integer >= 1000 and <= 9999');
				}

				unscrambledAnswerArray = answerArray;
				answerArray = _scrambleSolution(answerArray, options.solutionKey);

				solutionState = SOLUTION_STATE.Locked;
			}

			var flattenedAnswerArray = _.flatten(answerArray);
			var flattenedUnscrambledAnswerArray = _.flatten(unscrambledAnswerArray);

			var userSolution = _.map(
				puzzle.userSolution,
				function(row) {
					return _.map(
						row,
						function(solution) {
							if (_.isNull(solution)) {
								return BLOCK_CELL_VALUE;
							}

							if (solution === '') {
								return '-';
							}

							return solution;
						}
					);
				}
			);

			var userSolutionArray = _.flatten(userSolution);

			var cluesList = _.reduce(
				_.compact(_.map(_.flatten(puzzle.grid), 'clueNumber')),
				function(cluesArray, clueNumber) {
					if (!_.isUndefined(puzzle.clues.across[clueNumber])) {
						cluesArray.push(puzzle.clues.across[clueNumber]);
					}

					if (!_.isUndefined(puzzle.clues.down[clueNumber])) {
						cluesArray.push(puzzle.clues.down[clueNumber]);
					}

					return cluesArray;
				},
				[]
			);

			var puzzleData = {
				header: {
					width: width,
					height: height,
					numberOfClues: numberOfClues,
					puzzleType: puzzleType,
					solutionState: solutionState
				},
				answer: _flattenSolution(flattenedAnswerArray),
				unscrambledAnswer: _flattenSolution(flattenedUnscrambledAnswerArray),
				solution: _flattenSolution(userSolution),
				title: puzzle.info.title,
				author: puzzle.info.author,
				copyright: puzzle.info.copyright,
				clueList: cluesList,
				notes: notes
			};

			var headerBuffer = _writeHeader(puzzleData, options);

			var answerStringBuffer = iconv.encode(
				_flattenSolution(answerArray),
				PUZReader.ENCODING
			);

			var userSolutionStringBuffer = iconv.encode(
				_.map(
					userSolutionArray,
					function(solution) {
						return solution[0];
					}
				).join(''),
				PUZReader.ENCODING
			);

			var titleStringBuffer = iconv.encode((puzzle.info.title || '') + '\0', PUZReader.ENCODING);
			var authorStringBuffer = iconv.encode((puzzle.info.author || '') + '\0', PUZReader.ENCODING);
			var copyrightStringBuffer = iconv.encode((puzzle.info.copyright || '') + '\0', PUZReader.ENCODING);

			var cluesStringBuffer = iconv.encode(cluesList.join('\0') + '\0', PUZReader.ENCODING);

			var notesStringBuffer = iconv.encode(notes + '\0', PUZReader.ENCODING);

			var buffer = Buffer.concat(
				[
					headerBuffer,
					answerStringBuffer,
					userSolutionStringBuffer,
					titleStringBuffer,
					authorStringBuffer,
					copyrightStringBuffer,
					cluesStringBuffer,
					notesStringBuffer
				],
				headerBuffer.length + answerStringBuffer.length +
				userSolutionStringBuffer.length + titleStringBuffer.length +
				authorStringBuffer.length + copyrightStringBuffer.length +
				cluesStringBuffer.length + notesStringBuffer.length
			);

			if (
				_.some(flattenedUnscrambledAnswerArray, function(solution) {
					return solution.length > 1;
				})
			) {
				var rebusBuffer = _writeRebus(
					flattenedUnscrambledAnswerArray,
					userSolutionArray,
					puzzle.extensions || {}
				);

				buffer = Buffer.concat(
					[
						buffer,
						rebusBuffer
					],
					buffer.length + rebusBuffer.length
				);
			}

			return buffer;
		}
	}
});

exports = module.exports = PUZParser;
