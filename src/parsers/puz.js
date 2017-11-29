/**
 * PUZ file parser.
 *
 * @module xpuz/parsers/puz
 * @see {@link module:xpuz/puzzle|Puzzle}
 */

const map             = require("lodash/map");
const get             = require("lodash/get");
const range           = require("lodash/range");
const reverse         = require("lodash/reverse");
const zip             = require("lodash/zip");
const each            = require("lodash/each");
const reduce          = require("lodash/reduce");
const flatten         = require("lodash/flatten");
const padStart        = require("lodash/padStart");
const chunk           = require("lodash/chunk");
const findKey         = require("lodash/findKey");
const compact         = require("lodash/compact");
const size            = require("lodash/size");
const iconv           = require("iconv-lite");
const PUZReader       = require("./puz/puz-reader");
const Puzzle          = require("../lib/puzzle");
const ImmutablePuzzle = require("../lib/puzzle/immutable");


const BLOCK_CELL_VALUE = ".";

const BLOCK_CELL_VALUE_REGEX = /\./g;

const EXTENSION_HEADER_LENGTH = 8;

const HEADER_CHECKSUM_BYTE_LENGTH = 8;

const MAGIC_CHECKSUM_BYTE_LENGTH = 8;

const UNKNOWN1_BYTE_LENGTH = 2;

const UNKNOWN2_BYTE_LENGTH = 12;

const CHECKSUM_BUFFER_LENGTH = 2;

const NUMBER_OF_CLUES_BUFFER_LENGTH = 2;

const PUZZLE_TYPE_BUFFER_LENGTH = 2;

const SOLUTION_STATE_BUFFER_LENGTH = 2;

const HEADER_BUFFER_LENGTH = 52;

const EXTENSION_LENGTH_BUFFER_LENGTH = 2;

const EXTENSION_NAME_LENGTH = 4;

const PUZZLE_KEY_LENGTH = 4;

const RTBL_KEY_PADDING_WIDTH = 2;

const PUZZLE_TYPE = {
	Normal: 0x0001,
	Diagramless: 0x0401
};

const SOLUTION_STATE = {
	// solution is available in plaintext
	Unlocked: 0x0000,
	// solution is locked (scrambled) with a key
	Locked: 0x0004
};

const CELL_STATES = {
	PreviouslyIncorrect: 0x10,
	CurrentlyIncorrect: 0x20,
	AnswerGiven: 0x40,
	Circled: 0x80
};

const ATOZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const MINIMUM_KEY_VALUE = 1000;

const MAXIMUM_KEY_VALUE = 9999;

function _doChecksum(buffer, cksum) {
	for (let i = 0; i < buffer.length; i++) {
		// right-shift one with wrap-around
		const lowbit = cksum & 0x0001;

		cksum = cksum >> 1;

		if (lowbit) {
			// eslint-disable-next-line no-magic-numbers
			cksum = cksum | 0x8000;
		}

		// then add in the data and clear any carried bit past 16
		// eslint-disable-next-line no-magic-numbers
		cksum = (cksum + buffer.readUInt8(i)) & 0xFFFF;
	}

	return cksum;
}

function _readHeader(reader, options) {
	const data = {};

	data.globalChecksum = reader._readUInt16();

	reader._seek("ACROSS&DOWN\0".length, { current: true });

	data.headerChecksum = reader._readUInt16();

	data.magicChecksum = reader._readValues(MAGIC_CHECKSUM_BYTE_LENGTH);

	data.version = reader._readString();

	data.unknown1 = reader._readValues(UNKNOWN1_BYTE_LENGTH);

	data.scrambledChecksum = reader._readUInt16();

	data.unknown2 = reader._readValues(UNKNOWN2_BYTE_LENGTH);

	data.width = reader._readUInt8();

	data.height = reader._readUInt8();

	data.numberOfClues = reader._readUInt16();

	data.puzzleType = reader._readUInt16();

	data.solutionState = reader._readUInt16();

	if (data.solutionState === SOLUTION_STATE.Locked && !options.solutionKey) {
		throw new Error("Puzzle solution is locked and no solutionKey option was provided");
	}

	return data;
}

function _processExtension(extension) {
	if (extension.name === "GRBS") {
		extension.board = map(
			extension.data,
			(b) => {
				if (b === 0) {
					return null;
				}

				return b - 1;
			}
		);
	}

	if (extension.name === "RTBL") {
		extension.rebus_solutions = reduce(
			iconv.decode(extension.data, PUZReader.ENCODING).split(";"),
			(solutions, solutionPair) => {
				const pair = solutionPair.split(":");

				pair[0] = parseInt(pair[0], 10);

				solutions[pair[0]] = pair[1];

				return solutions;
			},
			{}
		);
	}

	if (extension.name === "LTIM") {
		const timings = iconv.decode(extension.data, PUZReader.ENCODING).split(",");

		extension.timing = {
			elapsed: parseInt(timings[0], 10),
			running: timings[1] === "0"
		};
	}

	if (extension.name === "GEXT") {
		extension.cell_states = map(
			extension.data,
			(b) => {
				return {
					PreviouslyIncorrect: !!(b & CELL_STATES.PreviouslyIncorrect),
					CurrentlyIncorrect: !!(b & CELL_STATES.CurrentlyIncorrect),
					AnswerGiven: !!(b & CELL_STATES.AnswerGiven),
					Circled: !!(b & CELL_STATES.Circled)
				};
			}
		);
	}

	if (extension.name === "RUSR") {
		extension.user_rebus_entries = map(
			iconv.decode(extension.data, PUZReader.ENCODING).split("\0"),
			(entry) => entry === "" ? null : entry
		);
	}

	return extension;
}

function _readExtension(reader) {
	const extension = {};

	extension.name = reader._readString(EXTENSION_NAME_LENGTH);

	const length = reader._readUInt16();

	extension.checksum = reader._readUInt16();

	// Include null byte at end
	extension.data = reader._readValues(length + 1);
	// Remove null byte at the end
	extension.data = extension.data.slice(0, -1);

	return _processExtension(extension);
}

function _parseEnd(reader, data) {
	const remainingLength = reader.size() - reader.tell();

	if (remainingLength >= EXTENSION_HEADER_LENGTH) {
		const extension = _readExtension(reader);

		data.extensions = data.extensions || {};
		data.extensions[extension.name] = extension;

		delete extension.name;

		_parseEnd(reader, data);
	}
}

function _parseExtensions(reader, puzzleData) {
	const data = {};

	_parseEnd(reader, data);

	if (get(data, "extensions.GRBS")) {
		each(
			flatten(puzzleData.grid),
			(cell, index) => {
				const c = cell;

				if (data.extensions.GRBS.board[index] === null) {
					return;
				}

				const rebusSolution = data.extensions.RTBL.rebus_solutions[
					data.extensions.GRBS.board[index]
				];

				c.solution = rebusSolution;
			}
		);
	}

	if (get(data, "extensions.RUSR")) {
		data.extensions.RUSR.user_rebus_entries.forEach(
			(rusr, index) => {
				if (rusr !== null) {
					const y = Math.floor(index / puzzleData.header.width);
					const x = index % puzzleData.header.width;

					puzzleData.solution[y][x] = rusr;
				}
			}
		);
	}

	puzzleData._extensions = data.extensions;

	puzzleData.timing = get(data, "extensions.LTIM.timing");
}

function _readClues(reader, numberOfClues) {
	const clues = [];

	for (let i = 0; i < numberOfClues; i++) {
		clues.push(reader._readString());
	}

	return clues;
}

function _generateGridAndClues(answers, clueList) {
	function _isBlockCell(x, y) {
		return answers[y][x] === BLOCK_CELL_VALUE;
	}

	const clues = {
		across: {},
		down: {}
	};

	const grid = [];

	const width = answers[0].length, height = answers.length;

	let clueCount = 0;

	let clueListIndex = 0;

	for (let y = 0; y < height; y++) {
		const row = [];

		for (let x = 0; x < width; x++) {
			const cell = {};

			if (_isBlockCell(x, y)) {
				cell.isBlockCell = true;
			}
			else {
				cell.solution = answers[y][x];

				let down = false, across = false;

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
		grid,
		clues,
	};
}

function _pluckSolutions(grid) {
	return grid.map(
		(row) => row.map(
			(cell) => {
				if (cell.isBlockCell) {
					return BLOCK_CELL_VALUE;
				}

				if (cell.solution === null) {
					return " ";
				}

				return cell.solution;
			}
		)
	);
}

function _flattenSolution(solution) {
	return flatten(solution).map(
		(entry) => {
			if (entry === null) {
				return BLOCK_CELL_VALUE;
			}

			if (entry === "") {
				return "-";
			}

			return entry[0];
		}
	).join("");
}

function _unflattenSolution(solution, width) {
	return chunk(
		solution.split(""),
		width
	).map(
		(row) => row.map(
			(cell) => cell === "-" ? "" : cell
		)
	);
}

function _textChecksum(puzzleData, checksum) {
	if (puzzleData.title) {
		checksum = _doChecksum(iconv.encode(puzzleData.title + "\0", PUZReader.ENCODING), checksum);
	}

	if (puzzleData.author) {
		checksum = _doChecksum(iconv.encode(puzzleData.author + "\0", PUZReader.ENCODING), checksum);
	}


	if (puzzleData.copyright) {
		checksum = _doChecksum(iconv.encode(puzzleData.copyright + "\0", PUZReader.ENCODING), checksum);
	}

	puzzleData.clueList.forEach(
		(clue) => {
			if (clue) {
				checksum = _doChecksum(iconv.encode(clue, PUZReader.ENCODING), checksum);
			}
		}
	);

	if (puzzleData.notes) {
		checksum = _doChecksum(iconv.encode(puzzleData.notes + "\0", PUZReader.ENCODING), checksum);
	}

	return checksum;
}

function _headerChecksum(puzzleData, checksum) {
	if(checksum === undefined) {
		checksum = 0;
	}

	const buffer = new Buffer(HEADER_CHECKSUM_BYTE_LENGTH);

	buffer.writeUInt8(puzzleData.header.width, 0);
	buffer.writeUInt8(puzzleData.header.height, 1);
	// These "magic numbers" are the successive byte offsets to write at
	/* eslint-disable no-magic-numbers */
	buffer.writeUInt16LE(puzzleData.header.numberOfClues, 2);
	buffer.writeUInt16LE(puzzleData.header.puzzleType, 4);
	buffer.writeUInt16LE(puzzleData.header.solutionState, 6);
	/* eslint-enable no-magic-numbers */

	return _doChecksum(buffer, checksum);
}

function _globalChecksum(puzzleData, headerChecksum) {
	let checksum = headerChecksum === undefined ? _headerChecksum(puzzleData) : headerChecksum;

	let buffer = iconv.encode(puzzleData.answer, PUZReader.ENCODING);

	checksum = _doChecksum(buffer, checksum);

	buffer = iconv.encode(puzzleData.solution, PUZReader.ENCODING);

	checksum = _doChecksum(buffer, checksum);

	checksum = _textChecksum(puzzleData, checksum);

	return checksum;
}

function _magicChecksum(puzzleData) {
	const headerChecksum = _headerChecksum(puzzleData);
	const answerChecksum = _doChecksum(iconv.encode(puzzleData.answer, PUZReader.ENCODING));
	const solutionChecksum = _doChecksum(iconv.encode(puzzleData.solution, PUZReader.ENCODING));
	const textChecksum = _textChecksum(puzzleData);

	const MAGIC_CHECKSUM_STRING = "ICHEATED";

	const magicChecksum = new Buffer([
		/* eslint-disable no-magic-numbers */
		MAGIC_CHECKSUM_STRING.charCodeAt(0) ^ (headerChecksum & 0xFF),
		MAGIC_CHECKSUM_STRING.charCodeAt(1) ^ (answerChecksum & 0xFF),
		MAGIC_CHECKSUM_STRING.charCodeAt(2) ^ (solutionChecksum & 0xFF),
		MAGIC_CHECKSUM_STRING.charCodeAt(3) ^ (textChecksum & 0xFF),
		MAGIC_CHECKSUM_STRING.charCodeAt(4) ^ ((headerChecksum & 0xFF00) >> 8),
		MAGIC_CHECKSUM_STRING.charCodeAt(5) ^ ((answerChecksum & 0xFF00) >> 8),
		MAGIC_CHECKSUM_STRING.charCodeAt(6) ^ ((solutionChecksum & 0xFF00) >> 8),
		MAGIC_CHECKSUM_STRING.charCodeAt(7) ^ ((textChecksum & 0xFF00) >> 8)
		/* eslint-enable no-magic-numbers */
	]);


	return magicChecksum;
}

function _transposeGrid(gridString, width, height) {
	const data = gridString.match(new RegExp(".{1," + width + "}", "g"));

	return range(width).map(
		(c) => range(height).map(
			(r) => data[r][c]
		).join("")
	).join("");
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
    
	t = t.split("");

	return s.split("").reduce(
		(arr, c) => {
			if (c === BLOCK_CELL_VALUE) {
				arr.push(c);
			}
			else {
				arr.push(t.shift());
			}

			return arr;
		},
		[]
	).join("");
}

function _shift(str, key) {
	return str.split("").map(
		(c, index) => {
			let letterIndex = (ATOZ.indexOf(c) + Number(key[index % key.length])) % ATOZ.length;

			if (letterIndex < 0) {
				letterIndex = ATOZ.length + letterIndex;
			}

			return ATOZ[letterIndex];
		}
	).join("");
}

function _unshift(str, key) {
	return _shift(
		str,
		map(key, (k) => -k)
	);
}

function _everyOther(str) {
	return str.split("").reduce(
		(arr, c, i) => {
			// eslint-disable-next-line no-magic-numbers
			if (i % 2 === 0) {
				arr.push(c);
			}

			return arr;
		},
		[]
	).join("");
}

function _unshuffle(str) {
	return _everyOther(str.substring(1)) + _everyOther(str);
}

function _unscrambleString(str, key) {
	const len = str.length;

	reverse(padStart(key, PUZZLE_KEY_LENGTH, "0").split("")).forEach(
		(k) => {
			str = _unshuffle(str);
			str = str.substring(len - k) + str.substring(0, len - k);
			str = _unshift(str, key);
		}
	);

	return str;
}


function _shuffle(str) {
	// eslint-disable-next-line no-magic-numbers
	const mid = Math.floor(str.length / 2);

	return zip(
		str.substring(mid).split(""),
		str.substring(0, mid).split("")
	).reduce(
		(arr, chars) => {
			if (chars[0] === undefined || chars[1] === undefined) {
				return arr;
			}

			arr.push(chars[0] + chars[1]);

			return arr;
		},
		[]
	// eslint-disable-next-line no-magic-numbers
	).join("") + (str.length % 2 ? str[str.length - 1] : "");
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

	each(
		padStart(key, PUZZLE_KEY_LENGTH, "0"),
		(k) => {
			str = _shift(str, key);
			str = str.substring(k) + str.substring(0, k);
			str = _shuffle(str);
		}
	);

	return str;
}

function _scrambledChecksum(answer, width, height) {
	const transposed = _transposeGrid(
		_flattenSolution(answer),
		width,
		height
	).replace(BLOCK_CELL_VALUE_REGEX, "");

	return _doChecksum(iconv.encode(transposed, PUZReader.ENCODING));
}

function _validateChecksums(puzzleData) {
	const headerChecksum = _headerChecksum(puzzleData);

	const globalChecksum = _globalChecksum(puzzleData, headerChecksum);

	const magicChecksum = _magicChecksum(puzzleData);

	const checksums = {
		header: headerChecksum,
		global: globalChecksum,
		magic: magicChecksum
	};

	const errors = [];

	if (checksums.header !== puzzleData.header.headerChecksum) {
		errors.push("header checksums do not match");
	}

	if (checksums.global !== puzzleData.header.globalChecksum) {
		errors.push("global checksums do not match");
	}

	if (!checksums.magic.equals(puzzleData.header.magicChecksum)) {
		errors.push("magic checksums do not match");
	}

	each(
		puzzleData._extensions,
		(extension, name) => {
			if (extension.checksum !== _doChecksum(extension.data)) {
				errors.push(`checksum for extension ${name} does not match`);
			}
		}
	);

	return errors;
}

function _scrambleSolution(solutionGrid, key) {
	const height = solutionGrid.length;
	const width = solutionGrid[0].length;

	let solutionString = flatten(
		_flattenSolution(solutionGrid)
	).join("");

	const transposed = _transposeGrid(solutionString, width, height);

	const data = _restoreSolution(
		transposed,
		_scrambleString(transposed.replace(BLOCK_CELL_VALUE_REGEX, ""), key)
	);

	solutionString = _transposeGrid(data, height, width);

	return chunk(solutionString.split(""), width);
}

function _unscrambleSolution(puzzleData, key) {
	const transposed = _transposeGrid(
		puzzleData.answer,
		puzzleData.header.width,
		puzzleData.header.height
	);

	const data = _restoreSolution(
		transposed,
		_unscrambleString(
			transposed.replace(BLOCK_CELL_VALUE_REGEX, ""),
			key
		)
	);

	const result = _transposeGrid(
		data,
		puzzleData.header.height,
		puzzleData.header.width
	);

	if (result === puzzleData.answer) {
		throw new Error("Unscrambled solution is the same as the scrambled solution; incorrect key?");
	}

	return result;
}

function _writeHeader(puzzleData, options) {
	const globalChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

	globalChecksumBuffer.writeUInt16LE(_globalChecksum(puzzleData));

	const headerChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

	headerChecksumBuffer.writeUInt16LE(_headerChecksum(puzzleData));

	const magicChecksumBuffer = _magicChecksum(puzzleData);

	const scrambledChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

	if (get(options, "scrambled")) {
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

	const numberOfCluesBuffer = new Buffer(NUMBER_OF_CLUES_BUFFER_LENGTH);

	numberOfCluesBuffer.writeUInt16LE(puzzleData.header.numberOfClues);

	const puzzleTypeBuffer = new Buffer(PUZZLE_TYPE_BUFFER_LENGTH);

	puzzleTypeBuffer.writeUInt16LE(puzzleData.header.puzzleType);

	const solutionStateBuffer = new Buffer(SOLUTION_STATE_BUFFER_LENGTH);

	solutionStateBuffer.writeUInt16LE(puzzleData.header.solutionState);

	return Buffer.concat(
		[
			globalChecksumBuffer,
			iconv.encode("ACROSS&DOWN\0", PUZReader.ENCODING),
			headerChecksumBuffer,
			magicChecksumBuffer,
			iconv.encode(get(options, "version", "1.3") + "\0", PUZReader.ENCODING),
			// unknown block 1
			new Buffer([0x0, 0x0]),
			scrambledChecksumBuffer,
			// unknown block 2
			new Buffer(UNKNOWN2_BYTE_LENGTH).fill(0x0),
			new Buffer([puzzleData.header.width]),
			new Buffer([puzzleData.header.height]),
			numberOfCluesBuffer,
			puzzleTypeBuffer,
			solutionStateBuffer
		],
		HEADER_BUFFER_LENGTH
	);
}

function _writeExtension(extensionBuffer, extensionName) {
	const lengthBuffer = new Buffer(EXTENSION_LENGTH_BUFFER_LENGTH);
	lengthBuffer.writeUInt16LE(extensionBuffer.length);

	const checksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);
	checksumBuffer.writeUInt16LE(_doChecksum(extensionBuffer));

	return Buffer.concat(
		[
			iconv.encode(extensionName, PUZReader.ENCODING),
			lengthBuffer,
			checksumBuffer,
			extensionBuffer,
			new Buffer([0])
		],
		EXTENSION_NAME_LENGTH + EXTENSION_LENGTH_BUFFER_LENGTH + CHECKSUM_BUFFER_LENGTH + extensionBuffer.length + 1
	);
}

function _writeGRBS(answerArray, rebusSolutions) {
	const grbsBuffer = new Buffer(
		answerArray.map(
			(cell, index) => {
				const solutionKey = findKey(
					rebusSolutions,
					(solutionInfo) => solutionInfo.cells.includes(index)
				);

				if (solutionKey === undefined) {
					return 0;
				}

				return parseInt(solutionKey, 10) + 1;
			}
		)
	);

	return _writeExtension(grbsBuffer, "GRBS");
}

function _writeRTBL(rebusSolutions) {
	const rtblBuffer = iconv.encode(
		Object.keys(rebusSolutions).map(
			(key) => `${padStart(key, RTBL_KEY_PADDING_WIDTH, " ")}:${rebusSolutions[key].solution};`
		).join(""),
		PUZReader.ENCODING
	);

	return _writeExtension(rtblBuffer, "RTBL");
}

function _writeRUSR(userSolutionArray) {
	const rusrBuffer = iconv.encode(
		userSolutionArray.map(
			(solution) => {
				if (solution.length > 1) {
					return `${solution}\0`;
				}

				return "\0";
			}
		).join(""),
		PUZReader.ENCODING
	);

	return _writeExtension(rusrBuffer, "RUSR");
}

function _writeLTIM(timing) {
	return _writeExtension(
		iconv.encode(
			`${timing.elapsed},${timing.running ? "1" : "0"}`,
			PUZReader.ENCODING
		),
		"LTIM"
	);
}

function _writeRebus(answerArray, userSolutionArray, extensions) {
	let solutionKey = 0;

	const rebusSolutions = flatten(answerArray).reduce(
		(solutions, cellSolution, cellIndex) => {
			if (cellSolution && cellSolution.length > 1) {
				const key = findKey(solutions, {solution: cellSolution});

				if (key === undefined) {
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

	const grbsBuffer = _writeGRBS(answerArray, rebusSolutions);

	const rtblBuffer = _writeRTBL(rebusSolutions);

	const rusrBuffer = _writeRUSR(userSolutionArray);

	const buffers = [
		grbsBuffer,
		rtblBuffer,
		rusrBuffer,
	];

	let totalBufferLength = grbsBuffer.length + rtblBuffer.length + rusrBuffer.length;

	if (extensions.timing) {
		const ltimBuffer = _writeLTIM(extensions.timing);
		buffers.push(ltimBuffer);

		totalBufferLength += ltimBuffer.length;
	}

	return Buffer.concat(
		buffers,
		totalBufferLength
	);
}

function _parsePuzzle(path, options) {
	const data = {};

	const reader = new PUZReader(path);

	data.header = _readHeader(reader, options);

	const numberOfCells = data.header.width * data.header.height;

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

	const gridAndClues = _generateGridAndClues(
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
	const checksumResults = _validateChecksums(puzzle);

	const errors = [];

	if (checksumResults) {
		errors.push(...checksumResults);
	}

	return errors.length === 0 ? undefined : errors;
}

function _getPuzzleData(path, options) {
	return new Promise(
		(resolve, reject) => {
			try {
				const puzzleData = _parsePuzzle(path, options);

				const errors = validatePuzzle(puzzleData);

				if (errors !== undefined) {
					reject(`Invalid puzzle:\n\t${errors.join("\n\t")}`);
				}
				else {
					resolve({
						info: {
							title: puzzleData.title || undefined,
							author: puzzleData.author || undefined,
							copyright: puzzleData.copyright || undefined,
							intro: puzzleData.notes || undefined,
						},
						grid: puzzleData.grid,
						clues: puzzleData.clues,
						userSolution: _unflattenSolution(puzzleData.solution, puzzleData.header.width),
						extensions: {
							timing: puzzleData.timing
						}
					});
				}
			}
			catch(err) {
				reject(err);
			}
		}
	);
}

/**
 * Parser class for PUZ-formatted puzzles.
 *
 * @constructor
 */
class PUZParser {
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
	 * @returns {external:Bluebird} a promise that resolves with the {@link module:xpuz/puzzle~Puzzle|Puzzle} object 
	 */
	parse(path, options) {
		options = options || {};

		return _getPuzzleData(path, options).then(
			(puzzleData) => new Puzzle(puzzleData)
		);
	}

	parseImmutable(path, options) {
		options = options || {};

		return _getPuzzleData(path, options).then(
			(puzzleData) => new ImmutablePuzzle(puzzleData)
		);
	}

	/**
	 * Given a {@link module:xpuz/puzzle~Puzzle|Puzzle} object, returns a {@link external:Buffer|Buffer}
	 * containing the puzzle in .puz format.
	 *
	 * @memberOf module:xpuz/parsers/puz~PUZParser
	 * @function
	 * @instance
	 *
	 * @param {module:xpuz/puzzle~Puzzle|XPuz.ImmutablePuzzle} puzzle - the puzzle to convert to .puz content.
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
	generate(puzzle, options) {
		puzzle = puzzle.toJSON();

		const numberOfClues = size(puzzle.clues.across) + size(puzzle.clues.down);
		const puzzleType = PUZZLE_TYPE.Normal;
		let solutionState = SOLUTION_STATE.Unlocked;

		options = options || {};

		const height = puzzle.grid.length;
		const width = puzzle.grid[0].length;

		const notes = puzzle.info.intro || "";

		let answerArray = _pluckSolutions(puzzle.grid);
		let unscrambledAnswerArray;

		if (options.scrambled) {
			if (
				!options.solutionKey ||
				Number(options.solutionKey) < MINIMUM_KEY_VALUE ||
				Number(options.solutionKey) > MAXIMUM_KEY_VALUE
			) {
				throw new Error(`Must specify a solution key that is an integer >= 1000 and <= 9999; was ${options.solutionKey}`);
			}

			unscrambledAnswerArray = answerArray;
			answerArray = _scrambleSolution(answerArray, options.solutionKey);

			solutionState = SOLUTION_STATE.Locked;
		}

		const flattenedAnswerArray = flatten(answerArray);
		const flattenedUnscrambledAnswerArray = flatten(unscrambledAnswerArray || answerArray);

		const userSolution = puzzle.userSolution.map(
			(row) => row.map(
				(solution) => {
					if (solution === null) {
						return BLOCK_CELL_VALUE;
					}

					if (solution === "") {
						return "-";
					}

					return solution;
				}
			)
		);

		const userSolutionArray = flatten(userSolution);

		const clueList = compact(flatten(puzzle.grid).map((cell) => cell.clueNumber)).reduce(
			(cluesArray, clueNumber) => {
				if (puzzle.clues.across[clueNumber] !== undefined) {
					cluesArray.push(puzzle.clues.across[clueNumber]);
				}

				if (puzzle.clues.down[clueNumber] !== undefined) {
					cluesArray.push(puzzle.clues.down[clueNumber]);
				}

				return cluesArray;
			},
			[]
		);

		const puzzleData = {
			header: {
				width,
				height,
				numberOfClues,
				puzzleType,
				solutionState
			},
			answer: _flattenSolution(flattenedAnswerArray),
			unscrambledAnswer: _flattenSolution(flattenedUnscrambledAnswerArray),
			solution: _flattenSolution(userSolution),
			title: puzzle.info.title,
			author: puzzle.info.author,
			copyright: puzzle.info.copyright,
			clueList,
			notes
		};

		const headerBuffer = _writeHeader(puzzleData, options);

		const answerStringBuffer = iconv.encode(
			_flattenSolution(answerArray),
			PUZReader.ENCODING
		);

		const userSolutionStringBuffer = iconv.encode(
			userSolutionArray.map(
				(solution) => solution[0]
			).join(""),
			PUZReader.ENCODING
		);

		const titleStringBuffer = iconv.encode(`${puzzle.info.title || ""}\0`, PUZReader.ENCODING);
		const authorStringBuffer = iconv.encode(`${puzzle.info.author || ""}\0`, PUZReader.ENCODING);
		const copyrightStringBuffer = iconv.encode(`${puzzle.info.copyright || ""}\0`, PUZReader.ENCODING);

		const cluesStringBuffer = iconv.encode(`${clueList.join("\0")}\0`, PUZReader.ENCODING);

		const notesStringBuffer = iconv.encode(`${notes}\0`, PUZReader.ENCODING);

		const buffers = [
			headerBuffer,
			answerStringBuffer,
			userSolutionStringBuffer,
			titleStringBuffer,
			authorStringBuffer,
			copyrightStringBuffer,
			cluesStringBuffer,
			notesStringBuffer,
		];

		let totalBufferLength = headerBuffer.length + answerStringBuffer.length +
			userSolutionStringBuffer.length + titleStringBuffer.length +
			authorStringBuffer.length + copyrightStringBuffer.length +
			cluesStringBuffer.length + notesStringBuffer.length;

		if (
			flattenedUnscrambledAnswerArray.some((solution) => solution.length > 1)
		) {
			const rebusBuffer = _writeRebus(
				flattenedUnscrambledAnswerArray,
				userSolutionArray,
				puzzle.extensions || {}
			);

			buffers.push(rebusBuffer);

			totalBufferLength += rebusBuffer.length;
		}

		return Buffer.concat(buffers, totalBufferLength);
	}
}

exports = module.exports = PUZParser;
