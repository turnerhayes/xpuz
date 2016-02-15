"use strict";

var path         = require('path');
var fs           = require('fs');
var Q            = require('q');
var _            = require('lodash');
var iconv        = require('iconv-lite');
var BinaryReader = require('binary-reader');
var Puzzle       = require('../lib/puzzle');
var Rebus        = require('../lib/rebus');


var BLOCK_CELL_VALUE = '.';

var ENCODING = 'ISO-8859-1';

var EXTENSION_HEADER_LENGTH = 8;

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

	return _readUInt16(reader).then(
		function(globalChecksum) {
			data.globalChecksum = globalChecksum;

			return _seek(reader, 'ACROSS&DOWN\0'.length, { current: true }).then(
				function() {
					return _readUInt16(reader);
				}
			);
		}
	).then(
		function(headerChecksum) {
			data.headerChecksum = headerChecksum;

			return _readValues(reader, 8);
		}
	).then(
		function(magicChecksum) {
			data.magicChecksum = magicChecksum;

			return _readString(reader);
		}
	).then(
		function(version) {
			data.version = version;

			return _readValues(reader, 2);
		}
	).then(
		function(unknown1) {
			data.unknown1 = unknown1;

			return _readUInt16(reader);
		}
	).then(
		function(scrambledChecksum) {
			data.scrambledChecksum = scrambledChecksum;

			return _readValues(reader, 12);
		}
	).then(
		function(unknown2) {
			data.unknown2 = unknown2;

			return _readUInt8(reader);
		}
	).then(
		function(width) {
			data.width = width;

			return _readUInt8(reader);
		}
	).then(
		function(height) {
			data.height = height;

			return _readUInt16(reader);
		}
	).then(
		function(numberOfClues) {
			data.numberOfClues = numberOfClues;

			return _readUInt16(reader);
		}
	).then(
		function(puzzleType) {
			data.puzzleType = puzzleType;

			return _readUInt16(reader);
		}
	).then(
		function(solutionState) {
			data.solutionState = solutionState;

			return data;
		}
	);
}

function _processExtension(extension) {
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
			iconv.decode(extension.data, ENCODING).split(';'),
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
		var timings = iconv.decode(extension.data, ENCODING).split(',');

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
			iconv.decode(extension.data, ENCODING).split('\0'),
			function(entry) {
				if (entry === '') {
					return null;
				}

				return entry;
			}
		);

	}

	delete extension.checksum;
	delete extension.data;

	return extension;
}

function _readExtension(reader) {
	var extension = {};

	return _readString(reader, 4).then(
		function(extensionName) {
			extension.name = extensionName;

			return _readUInt16(reader);
		}
	).then(
		function(length) {
			extension.length = length;

			return _readUInt16(reader);
		}
	).then(
		function(checksum) {
			extension.checksum = checksum;

			// Include null byte at end
			return _readValues(reader, extension.length + 1);
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

			if (data.extensions.GRBS) {
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

			if (data.extensions.RUSR) {
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

			return {
				timing: _.get(data, 'extensions.LTIM.timing')
			};
		}
	);
}

function _seek(reader, position, relativeTo) {
	var deferred = Q.defer();

	relativeTo = relativeTo || { start: true, };

	reader.seek(position, relativeTo, function() {
		deferred.resolve();
	});

	return deferred.promise;
}

function _readUInt8(reader) {
	return _readValues(reader, 1).then(
		function(buffer) {
			return buffer.readUInt8(0);
		}
	);
}

function _readUInt16(reader) {
	return _readValues(reader, 2).then(
		function(buffer) {
			return buffer.readUInt16LE(0);
		}
	);
}

function _readUInt32(reader) {
	return _readValues(reader, 4).then(
		function(buffer) {
			return buffer.readUInt32LE(0);
		}
	);
}

function _readString(reader, length) {
	var bufferLength = length || 20;

	return _readValues(reader, bufferLength).then(
		function(buffer) {
			var str = iconv.decode(buffer, ENCODING);

			if (length) {
				return str;
			}

			var nullIndex = str.indexOf('\0');
			var nullOffset;

			if (nullIndex >= 0) {
				nullOffset = nullIndex - str.length;

				if (nullOffset < 0) {
					return _seek(reader, nullOffset + 1, { current: true }).then(
						function() {
							return str.substring(0, nullIndex);
						}
					);
				}

				return str;
			}

			return _readString(reader).then(
				function(nextString) {
					return str + nextString;
				}
			);
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
				return _readString(reader);
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

function _readValues(reader, length) {
	var deferred = Q.defer();

	reader.read(length, function(bytesRead, buffer) {
		deferred.resolve(buffer);
	});

	return deferred.promise;
}

function _flattenSolution(solution) {
	return _.map(
		_.flatten(
			solution
		),
		function(entry) {
			return entry[0];
		}
	).join('');
}

function _textChecksum(puzzleData, checksum) {
	if (puzzleData.title) {
		checksum = _doChecksum(iconv.encode(puzzleData.title + '\0', ENCODING), checksum);
	}

	if (puzzleData.author) {
		checksum = _doChecksum(iconv.encode(puzzleData.author + '\0', ENCODING), checksum);
	}


	if (puzzleData.copyright) {
		checksum = _doChecksum(iconv.encode(puzzleData.copyright + '\0', ENCODING), checksum);
	}

	_.each(
		puzzleData._rawClueList,
		function(clue) {
			if (clue) {
				checksum = _doChecksum(iconv.encode(clue, ENCODING), checksum);
			}
		}
	);

	if (puzzleData.notes) {
		checksum = _doChecksum(iconv.encode(puzzleData.notes + '\0', ENCODING), checksum);
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
	var buffer = iconv.encode(_.flatten(puzzleData.answer).join(''), ENCODING	);

	checksum = _doChecksum(buffer, checksum);

	buffer = iconv.encode(_flattenSolution(puzzleData.solution), ENCODING);

	checksum = _doChecksum(buffer, checksum);

	checksum = _textChecksum(puzzleData, checksum);

	return checksum;
}

function _magicChecksum(puzzleData) {
	var headerChecksum = _headerChecksum(puzzleData);
	var answerChecksum = _doChecksum(iconv.encode(_.flatten(puzzleData.answer).join(''), ENCODING));
	var solutionChecksum = _doChecksum(iconv.encode(_flattenSolution(puzzleData.solution), ENCODING));
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

	return errors;
}

function _parsePuzzle(path) {
	var data = {};

	var deferred = Q.defer();

	var reader = BinaryReader.open(path)
		.on("error", function(err) {
			deferred.reject(err);
		}).on("close", function() {
			deferred.resolve(data);
		});

	_readHeader(reader).then(
		function(header) {
			data.header = header;

			var numberOfCells = data.header.width * data.header.height;

			return _readValues(reader, numberOfCells).then(
				function(buffer) {
					data.answer = _.chunk(
						iconv.decode(buffer, ENCODING).split(''),
						data.header.width
					);

					return _readValues(reader, numberOfCells);
				}
			).then(
				function(buffer) {
					data.solution = _.chunk(
						iconv.decode(buffer, ENCODING).split(''),
						data.header.width
					);

					return _readString(reader);
				}
			);
		}
	).then(
		function(title) {
			data.title = title;

			return _readString(reader);
		}
	).then(
		function(author) {
			data.author = author;

			return _readString(reader);
		}
	).then(
		function(copyright) {
			data.copyright = copyright;

			return _readClues(reader, data.header.numberOfClues);
		}
	).then(
		function(clues) {
			data._rawClueList = clues;
			var gridAndClues = _generateGridAndClues(data.answer, clues);

			data.grid = gridAndClues.grid;
			data.clues = gridAndClues.clues;

			return _readString(reader);
		}
	).then(
		function(notes) {
			data.notes = notes;

			return _parseExtensions(reader, data);
		}
	).then(
		function(extensions) {
			data.extensions = extensions;

			reader.close();
		},
		function(err) {
			deferred.reject(err);
		}
	);


	return deferred.promise;
}

function _validatePuzzle(puzzle) {
	var checksumResults = _validateChecksums(puzzle);

	var errors = [];

	if (checksumResults) {
		errors = errors.concat(checksumResults);
	}

	return _.isEmpty(errors) ? undefined : errors;
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
						user_solution: data.solution,
						extensions: {
							timing: data.extensions.timing
						}
					};

					return new Puzzle(puzzleDefinition);
				}
			);
			
		}
	},

	validatePuzzle: {
		value: function(puzzle) {
			return _validatePuzzle(puzzle);
		}
	}
});

exports = module.exports = PUZParser;
