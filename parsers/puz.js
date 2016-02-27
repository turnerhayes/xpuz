"use strict";

var path         = require('path');
var fs           = require('fs');
var Q            = require('q');
var _            = require('lodash');
var iconv        = require('iconv-lite');
var PUZReader    = require('./puz/puz-reader');
var Puzzle       = require('../lib/puzzle');


var BLOCK_CELL_VALUE = '.';

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

function _readHeader(reader) {
	var data = {};
	var deferred = Q.defer();

	return reader._readUInt16().then(
		function(globalChecksum) {
			data.globalChecksum = globalChecksum;

			return reader._seek('ACROSS&DOWN\0'.length, { current: true }).then(
				function() {
					return reader._readUInt16();
				}
			);
		}
	).then(
		function(headerChecksum) {
			data.headerChecksum = headerChecksum;

			return reader._readValues(8);
		}
	).then(
		function(magicChecksum) {
			data.magicChecksum = magicChecksum;

			return reader._readString();
		}
	).then(
		function(version) {
			data.version = version;

			return reader._readValues(2);
		}
	).then(
		function(unknown1) {
			data.unknown1 = unknown1;

			return reader._readUInt16();
		}
	).then(
		function(scrambledChecksum) {
			data.scrambledChecksum = scrambledChecksum;

			return reader._readValues(12);
		}
	).then(
		function(unknown2) {
			data.unknown2 = unknown2;

			return reader._readUInt8();
		}
	).then(
		function(width) {
			data.width = width;

			return reader._readUInt8();
		}
	).then(
		function(height) {
			data.height = height;

			return reader._readUInt16();
		}
	).then(
		function(numberOfClues) {
			data.numberOfClues = numberOfClues;

			return reader._readUInt16();
		}
	).then(
		function(puzzleType) {
			data.puzzleType = puzzleType;

			return reader._readUInt16();
		}
	).then(
		function(solutionState) {
			data.solutionState = solutionState;

			return data;
		}
	);
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

	return reader._readString(4).then(
		function(extensionName) {
			extension.name = extensionName;

			return reader._readUInt16();
		}
	).then(
		function(length) {
			extension.length = length;

			return reader._readUInt16();
		}
	).then(
		function(checksum) {
			extension.checksum = checksum;

			// Include null byte at end
			return reader._readValues(extension.length + 1);
		}
	).then(
		function(data) {
			// Remove null byte at the end
			extension.data = data.slice(0, -1);

			delete extension.length;

			return _processExtension(extension);
		}
	);
}

function _parseEnd(reader, data) {
	var remainingLength = reader.size() - reader.tell();

	if (remainingLength >= EXTENSION_HEADER_LENGTH) {
		return _readExtension(reader).then(
			function(extension) {
				data.extensions = data.extensions || {};
				data.extensions[extension.name] = extension;

				delete extension.name;

				return _parseEnd(reader, data);
			}
		);
	}

	return Q();
}

function _parseExtensions(reader, puzzleData) {
	var data = {};

	return _parseEnd(reader, data).then(
		function() {
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
	);
}

function _readClues(reader, numberOfClues) {
	var clues = [];

	var promise = Q();

	var i;

	for (i = 0; i < numberOfClues; i++) {
		promise = promise.then(
			function() {
				return reader._readString();
			}
		).then(
			function(clue) {
				clues.push(clue);
			}
		);
	}

	return promise.then(
		function() {
			return clues;
		}
	);
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
			if (!entry) {
				return entry;
			}

			return entry[0];
		}
	).join('');
}

function _unflattenSolution(solution, width) {
	return _.chunk(
		solution.split(''),
		width
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
	var data = grid.match(new RegExp('.{1,' + width + '}', 'g'));

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

function _scrambledChecksum(puzzleData) {

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

function _writeHeader(puzzleData, options) {
	var globalChecksumBuffer = new Buffer(2);

	globalChecksumBuffer.writeUInt16LE(_globalChecksum(puzzleData));

	var headerChecksumBuffer = new Buffer(2);

	headerChecksumBuffer.writeUInt16LE(_headerChecksum(puzzleData));

	var magicChecksumBuffer = _magicChecksum(puzzleData);

	var scrambledChecksumBuffer = new Buffer(2);

	if (_.get(options, 'scramble')) {
		scrambledChecksumBuffer.writeUInt16LE(_scrambledChecksum(puzzleData));
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

function _parsePuzzle(path) {
	var data = {};

	var reader = new PUZReader(path);

	return _readHeader(reader).then(
		function(header) {
			data.header = header;

			var numberOfCells = data.header.width * data.header.height;

			return reader._readValues(numberOfCells).then(
				function(buffer) {
					data.answer = iconv.decode(buffer, PUZReader.ENCODING);

					return reader._readValues(numberOfCells);
				}
			).then(
				function(buffer) {
					data.solution = iconv.decode(buffer, PUZReader.ENCODING);

					return reader._readString();
				}
			);
		}
	).then(
		function(title) {
			data.title = title;

			return reader._readString();
		}
	).then(
		function(author) {
			data.author = author;

			return reader._readString();
		}
	).then(
		function(copyright) {
			data.copyright = copyright;

			return _readClues(reader, data.header.numberOfClues);
		}
	).then(
		function(clues) {
			data.clueList = clues;
			var gridAndClues = _generateGridAndClues(
				_unflattenSolution(data.answer, data.header.width),
				clues
			);

			data.grid = gridAndClues.grid;
			data.clues = gridAndClues.clues;

			return reader._readString();
		}
	).then(
		function(notes) {
			data.notes = notes;

			return _parseExtensions(reader, data);
		}
	).then(
		function() {
			reader.close();

			return reader.promise;
		}
	).then(
		function() {
			return data;
		}
	);
}

function PUZParser() {
	if (!(this instanceof PUZParser)) {
		return new PUZParser();
	}
}


PUZParser.prototype = Object.create(Object.prototype, {
	parse: {
		value: function(path) {
			var parser = this;
			var deferred = Q.defer();

			return _parsePuzzle(path).then(
				function(puzzleData) {
					var errors = parser.validatePuzzle(puzzleData);

					if (!_.isUndefined(errors)) {
						throw new Error('Invalid puzzle:\n\t' + errors.join('\n\t'));
					}

					return puzzleData;
				}
			).then(
				function(data) {
					var puzzleDefinition = {
						title: data.title,
						author: data.author,
						copyright: data.copyright,
						intro: data.notes || undefined,
						grid: data.grid,
						clues: data.clues,
						userSolution: _unflattenSolution(data.solution, data.header.width),
						extensions: {
							timing: data.timing
						}
					};

					return new Puzzle(puzzleDefinition);
				}
			);
			
		}
	},

	generate: {
		value: function(puzzle, options) {
			var numberOfClues = _.size(puzzle.clues.across) + _.size(puzzle.clues.down);
			var puzzleType = PUZZLE_TYPE.Normal;
			var solutionState = SOLUTION_STATE.Unlocked;

			var height = _.size(puzzle.grid);
			var width = _.size(puzzle.grid[0]);

			var notes = puzzle.info.intro || '';

			var answerArray = _pluckSolutions(puzzle.grid);

			var flattenedAnswerArray = _.flatten(answerArray);

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
				_.some(flattenedAnswerArray, function(solution) {
					return solution.length > 1;
				})
			) {
				var rebusBuffer = _writeRebus(
					flattenedAnswerArray,
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
	},

	validatePuzzle: {
		value: function(puzzle) {
			var checksumResults = _validateChecksums(puzzle);

			var errors = [];

			if (checksumResults) {
				errors = errors.concat(checksumResults);
			}

			return _.isEmpty(errors) ? undefined : errors;
		}
	}
});

exports = module.exports = PUZParser;
