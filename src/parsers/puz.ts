/**
 * PUZ file parser.
 *
 * @module xpuz/parsers/puz
 * @see {@link module:xpuz/puzzle|Puzzle}
 */

import get from "lodash/get";
import range from "lodash/range";
import reverse from "lodash/reverse";
import zip from "lodash/zip";
import each from "lodash/each";
import flatten from "lodash/flatten";
import padStart from "lodash/padStart";
import chunk from "lodash/chunk";
import findKey from "lodash/findKey";
import compact from "lodash/compact";
import size from "lodash/size";
import iconv from "iconv-lite";
import PUZReader from "./puz/puz-reader";
import Puzzle from "../puzzle";
import { IPuzzleConstructorArgs } from "../base-puzzle";
import { Grid, IGridCell, IInputCell } from "../Grid";
import { IPuzzleClues } from "../base-puzzle";


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

export enum PuzzleType {
	Normal = 0x0001,
	Diagramless = 0x0401,
}

export enum SolutionState {
	// solution is available in plaintext
	Unlocked = 0x0000,
	// solution is locked (scrambled) with a key
	Locked = 0x0004,
}

export const enum CellStates {
	PreviouslyIncorrect = 0x10,
	CurrentlyIncorrect = 0x20,
	AnswerGiven = 0x40,
	Circled = 0x80,
}

interface IHeaderData {
	globalChecksum: number,
	headerChecksum: number,
	magicChecksum: Buffer,
	version: string,
	unknown1: Buffer,
	scrambledChecksum: number,
	unknown2: Buffer,
	width: number,
	height: number,
	numberOfClues: number,
	puzzleType: PuzzleType,
	solutionState: SolutionState,
}

export type ExtensionName = "GRBS"|"RTBL"|"LTIM"|"GEXT"|"RUSR";

interface IExtensionInfo {
	name: ExtensionName;
	checksum: number;
	data: Buffer;
	[key: string]: any,
}

export type PuzzleContent = string|Buffer|ArrayBufferLike;

export interface IPuzzleParseOptions {
	solutionKey?: number,
}

interface IPuzzleData {
	header: IHeaderData;
	answer: string;
	unscrambledAnswer: string;
	solution: string[][];
	title: string;
	author: string;
	copyright: string;
	clueList: string[];
	notes: string;
	timing: number;
	userSolution: string;
	grid: Grid;
	clues: {};
}

const ATOZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const MINIMUM_KEY_VALUE = 1000;

const MAXIMUM_KEY_VALUE = 9999;

function _doChecksum(buffer: Buffer, cksum: number = 0): number {
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

function _readHeader(
	reader: PUZReader,
	options: {
		solutionKey?: string,
	}
): IHeaderData {
	const globalChecksum = reader.readUInt16();

	reader.seek("ACROSS&DOWN\0".length, { current: true });

	const headerChecksum = reader.readUInt16();

	const magicChecksum = reader.readValues(MAGIC_CHECKSUM_BYTE_LENGTH);

	const version = reader.readString();

	const unknown1 = reader.readValues(UNKNOWN1_BYTE_LENGTH);

	const scrambledChecksum = reader.readUInt16();

	const unknown2 = reader.readValues(UNKNOWN2_BYTE_LENGTH);

	const width = reader.readUInt8();

	const height = reader.readUInt8();

	const numberOfClues = reader.readUInt16();

	const puzzleType = reader.readUInt16() as PuzzleType;

	const solutionState = reader.readUInt16() as SolutionState;

	if (solutionState === SolutionState.Locked && !options.solutionKey) {
		throw new Error("Puzzle solution is locked and no solutionKey option was provided");
	}

	return {
		globalChecksum,
		headerChecksum,
		magicChecksum,
		version,
		unknown1,
		scrambledChecksum,
		unknown2,
		width,
		height,
		numberOfClues,
		puzzleType,
		solutionState,
	};
}

function _processExtension(extension: IExtensionInfo) {
	if (extension.name === "GRBS") {
		extension.board = Array.from(extension.data).map(
			(b) => {
				if (b === 0) {
					return null;
				}

				return b - 1;
			}
		);
	}

	if (extension.name === "RTBL") {
		extension.rebus_solutions = iconv.decode(
			extension.data,
			PUZReader.ENCODING
		).split(";").reduce(
			(solutions: {[key: string]: string}, solutionPair: string) => {
				let [num, solution]: [string|number, string] = solutionPair
					.split(":") as [string, string];

				num = parseInt(num, 10);

				solutions[num] = solution;

				return solutions;
			},
			{}
		);
	}

	if (extension.name === "LTIM") {
		const timings = iconv.decode(
			extension.data as Buffer,
			PUZReader.ENCODING
		).split(",");

		extension.timing = {
			elapsed: parseInt(timings[0], 10),
			running: timings[1] === "0"
		};
	}

	if (extension.name === "GEXT") {
		extension.cell_states = Array.from(extension.data).map(
			(b) => {
				return {
					PreviouslyIncorrect: !!(b & CellStates.PreviouslyIncorrect),
					CurrentlyIncorrect: !!(b & CellStates.CurrentlyIncorrect),
					AnswerGiven: !!(b & CellStates.AnswerGiven),
					Circled: !!(b & CellStates.Circled)
				};
			}
		);
	}

	if (extension.name === "RUSR") {
		extension.user_rebus_entries = iconv.decode(
			extension.data as Buffer,
			PUZReader.ENCODING
		).split("\0").map(
			(entry) => entry === "" ? null : entry
		);
	}

	return extension;
}

function _readExtension(reader: PUZReader): IExtensionInfo {
	const name = reader.readString(
		EXTENSION_NAME_LENGTH
	) as ExtensionName;

	const length = reader.readUInt16();

	const checksum = reader.readUInt16();

	// Include null byte at end
	let data = reader.readValues(length + 1);
	// Remove null byte at the end
	data = data.slice(0, -1);

	return _processExtension({
		name,
		checksum,
		data,
	});
}

function _parseEnd(
	reader: PUZReader,
	extensions: {
		[name: string]: IExtensionInfo,
	} = {},
): {
	[name: string]: IExtensionInfo,
} {
	const remainingLength = reader.size() - reader.tell();

	if (remainingLength >= EXTENSION_HEADER_LENGTH) {
		const extension = _readExtension(reader);

		extensions[extension.name] = extension;

		delete extension.name;

		extensions = _parseEnd(reader, extensions);
	}

	return extensions;
}

function _parseExtensions(
	reader: PUZReader,
	{
		grid,
		header,
		solution,
	}: {
		grid: Grid,
		header: IHeaderData,
		solution: string[][],
	}
): {
	extensions: {[name: string]: IExtensionInfo},
	timing: number,
} {
	const data = {};
	const extensions = _parseEnd(reader, data);

	if (extensions.GRBS) {
		flatten(grid).map(
			(cell, index) => {
				if (extensions.GRBS.board[index] === null) {
					return;
				}

				const rebusSolution = extensions.RTBL.rebus_solutions[
					extensions.GRBS.board[index]
				];

				(cell as IInputCell).solution = rebusSolution;
			}
		);
	}

	if (extensions.RUSR) {
		extensions.RUSR.user_rebus_entries.forEach(
			(rusr: string|null, index: number) => {
				if (rusr !== null) {
					const y = Math.floor(index / header.width);
					const x = index % header.width;

					solution[y][x] = rusr;
				}
			}
		);
	}

	return {
		extensions,
		timing: extensions.LTIM ?
			extensions.LTIM.timing :
			undefined,
	};
}

function _readClues(reader: PUZReader, numberOfClues: number): string[] {
	const clues = [];

	for (let i = 0; i < numberOfClues; i++) {
		clues.push(reader.readString());
	}

	return clues;
}

function _generateGridAndClues(
	answers: string[][],
	clueList: string[]
): {
	grid: Grid,
	clues: IPuzzleClues,
} {
	const _isBlockCell = (x: number, y: number) => {
		return answers[y][x] === BLOCK_CELL_VALUE;
	};

	const clues: IPuzzleClues = {
		across: {},
		down: {}
	};

	const grid: Grid = [];

	const height = answers.length;
	const width = answers[0].length;

	let clueCount = 0;

	let clueListIndex = 0;

	for (let y = 0; y < height; y++) {
		const row: IGridCell[] = [];

		for (let x = 0; x < width; x++) {
			const cell: IGridCell = {};

			if (_isBlockCell(x, y)) {
				cell.isBlockCell = true;
			}
			else {
				(cell as IInputCell).solution = answers[y][x];

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
					(cell as IInputCell).clueNumber = ++clueCount;
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

function _pluckSolutions(
	grid: Grid
) {
	return grid.map(
		(row) => row.map(
			(cell) => {
				if (cell.isBlockCell) {
					return BLOCK_CELL_VALUE;
				}

				if ((cell as IInputCell).solution === null) {
					return " ";
				}

				return (cell as IInputCell).solution;
			}
		)
	);
}

function _flattenSolution(solution: string|string[][]): string {
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

function _unflattenSolution(solution: string, width: number) {
	return chunk(
		solution.split(""),
		width
	).map(
		(row) => row.map(
			(cell) => cell === "-" ? "" : cell
		)
	);
}

function _textChecksum(
	{
		title,
		author,
		copyright,
		clueList,
		notes,
	}: {
		title: string,
		author: string,
		copyright: string,
		clueList: string[],
		notes: string,
	},
	checksum: number = 0
) {
	if (title) {
		checksum = _doChecksum(iconv.encode(title + "\0", PUZReader.ENCODING), checksum);
	}

	if (author) {
		checksum = _doChecksum(iconv.encode(author + "\0", PUZReader.ENCODING), checksum);
	}

	if (copyright) {
		checksum = _doChecksum(iconv.encode(copyright + "\0", PUZReader.ENCODING), checksum);
	}

	clueList.forEach(
		(clue) => {
			if (clue) {
				checksum = _doChecksum(iconv.encode(clue, PUZReader.ENCODING), checksum);
			}
		}
	);

	if (notes) {
		checksum = _doChecksum(iconv.encode(notes + "\0", PUZReader.ENCODING), checksum);
	}

	return checksum;
}

function _headerChecksum(header: IHeaderData, checksum?: number) {
	if(checksum === undefined) {
		checksum = 0;
	}

	const buffer = new Buffer(HEADER_CHECKSUM_BYTE_LENGTH);

	buffer.writeUInt8(header.width, 0);
	buffer.writeUInt8(header.height, 1);
	// These "magic numbers" are the successive byte offsets to write at
	/* eslint-disable no-magic-numbers */
	buffer.writeUInt16LE(header.numberOfClues, 2);
	buffer.writeUInt16LE(header.puzzleType, 4);
	buffer.writeUInt16LE(header.solutionState, 6);
	/* eslint-enable no-magic-numbers */

	return _doChecksum(buffer, checksum);
}

function _globalChecksum(
	puzzleData: IPuzzleData,
	headerChecksum = 0
) {
	let checksum = headerChecksum === undefined ? _headerChecksum(puzzleData.header) : headerChecksum;

	let buffer = iconv.encode(puzzleData.answer, PUZReader.ENCODING);

	checksum = _doChecksum(buffer, checksum);

	buffer = iconv.encode(puzzleData.solution, PUZReader.ENCODING);

	checksum = _doChecksum(buffer, checksum);

	checksum = _textChecksum(
		{
			title: puzzleData.title,
			author: puzzleData.author,
			copyright: puzzleData.copyright,
			clueList: puzzleData.clueList,
			notes: puzzleData.notes,
		},
		checksum
	);

	return checksum;
}

function _magicChecksum(puzzleData: IPuzzleData): Buffer {
	const headerChecksum = _headerChecksum(puzzleData.header);
	const answerChecksum = _doChecksum(iconv.encode(puzzleData.answer, PUZReader.ENCODING));
	const solutionChecksum = _doChecksum(iconv.encode(puzzleData.solution, PUZReader.ENCODING));
	const textChecksum = _textChecksum({
		title: puzzleData.title,
		author: puzzleData.author,
		copyright: puzzleData.copyright,
		clueList: puzzleData.clueList,
		notes: puzzleData.notes,
	});

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

function _transposeGrid(
	gridString: string,
	width: number,
	height: number
): string {
	const data = gridString.match(new RegExp(".{1," + width + "}", "g"));

	if (data === null) {
		throw new Error("Grid string invalid");
	}

	return range(width).map(
		(c) => range(height).map(
			(r) => data[r][c]
		).join("")
	).join("");
}

function _restoreSolution(s: string, t: string) {
	/*
	s is the source string, it can contain '.'
	t is the target, it's smaller than s by the number of '.'s in s

	Each char in s is replaced by the corresponding
	char in t, jumping over '.'s in s.

	>>> restore('ABC.DEF', 'XYZABC')
	'XYZ.ABC'
	*/
    
	const splitTarget = t.split("");

	return s.split("").reduce(
		(arr: string[], c) => {
			if (c === BLOCK_CELL_VALUE) {
				arr.push(c);
			}
			else {
				arr.push(splitTarget.shift() as string);
			}

			return arr;
		},
		[]
	).join("");
}

function _shift(str: string, key: string): string {
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

function _unshift(str: string, key: string): string {
	return _shift(
		str,
		Array.from(key).map((k) => -k)
	);
}

function _everyOther(str: string): string {
	return str.split("").reduce(
		(arr: string[], char: string, index: number) => {
			// eslint-disable-next-line no-magic-numbers
			if (index % 2 === 0) {
				arr.push(char);
			}

			return arr;
		},
		[]
	).join("");
}

function _unshuffle(str: string): string {
	return _everyOther(str.substring(1)) + _everyOther(str);
}

function _unscrambleString(str: string, key: string): string {
	const len = str.length;

	padStart(key, PUZZLE_KEY_LENGTH, "0").split("").reverse().forEach(
		(k) => {
			str = _unshuffle(str);
			str = str.substring(len - Number(k)) + str.substring(0, len - Number(k));
			str = _unshift(str, key);
		}
	);

	return str;
}


function _shuffle(str: string): string {
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

			arr.push((chars[0] as string) + (chars[1] as string));

			return arr;
		},
		[]
	// eslint-disable-next-line no-magic-numbers
	).join("") + (str.length % 2 ? str[str.length - 1] : "");
}

function _scrambleString(str: string, key: string): string {
	/*
	str is the puzzle's solution in column-major order, omitting black squares:
	i.e. if the puzzle is:
		C A T
		# # A
		# # R
	solution is CATAR


	Key is a 4-digit number in the range 1000 <= key <= 9999

    */

	Array.from(padStart(key, PUZZLE_KEY_LENGTH, "0")).forEach(
		(k) => {
			str = _shift(str, key);
			str = str.substring(Number(k)) + str.substring(0, Number(k));
			str = _shuffle(str);
		}
	);

	return str;
}

function _scrambledChecksum(
	answer: string|string[][],
	width: number,
	height: number
): number {
	const transposed = _transposeGrid(
		_flattenSolution(answer as string[][]),
		width,
		height
	).replace(BLOCK_CELL_VALUE_REGEX, "");

	return _doChecksum(iconv.encode(transposed, PUZReader.ENCODING));
}

function _validateChecksums(puzzleData: IPuzzleData): string[] {
	const headerChecksum = _headerChecksum(puzzleData.header);

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
		puzzleData.extensions,
		(extension, name) => {
			if (extension.checksum !== _doChecksum(extension.data)) {
				errors.push(`checksum for extension ${name} does not match`);
			}
		}
	);

	return errors;
}

function _scrambleSolution(solutionGrid: string[][], key: string): string[] {
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

function _unscrambleSolution(
	{
		answer,
		width,
		height,
		key,
	}: {
		answer: string,
		width: number,
		height: number,
		key: string,
	},
): string {
	const transposed = _transposeGrid(
		answer,
		width,
		height
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
		height,
		width
	);

	if (result === answer) {
		throw new Error("Unscrambled solution is the same as the scrambled solution; incorrect key?");
	}

	return result;
}

function _writeHeader(
	puzzleData: {
		header: {
			width: number,
			height: number,
			numberOfClues: number,
			puzzleType: PuzzleType,
			solutionState: SolutionState,
		},
		unscrambledAnswer: string,
	},
	options: {
		scrambled?: boolean,
	}
): Buffer {
	const globalChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

	globalChecksumBuffer.writeUInt16LE(_globalChecksum(puzzleData), 0);

	const headerChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

	headerChecksumBuffer.writeUInt16LE(_headerChecksum(puzzleData.header), 0);

	const magicChecksumBuffer = _magicChecksum(puzzleData);

	const scrambledChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

	if (get(options, "scrambled")) {
		scrambledChecksumBuffer.writeUInt16LE(
			_scrambledChecksum(
				puzzleData.unscrambledAnswer,
				puzzleData.header.width,
				puzzleData.header.height
			),
			0
		);
	}
	else {
		scrambledChecksumBuffer.fill(0x0);
	}

	const numberOfCluesBuffer = new Buffer(NUMBER_OF_CLUES_BUFFER_LENGTH);

	numberOfCluesBuffer.writeUInt16LE(puzzleData.header.numberOfClues, 0);

	const puzzleTypeBuffer = new Buffer(PUZZLE_TYPE_BUFFER_LENGTH);

	puzzleTypeBuffer.writeUInt16LE(puzzleData.header.puzzleType, 0);

	const solutionStateBuffer = new Buffer(SOLUTION_STATE_BUFFER_LENGTH);

	solutionStateBuffer.writeUInt16LE(puzzleData.header.solutionState, 0);

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

function _writeExtension(extensionBuffer: Buffer, extensionName: ExtensionName): Buffer {
	const lengthBuffer = new Buffer(EXTENSION_LENGTH_BUFFER_LENGTH);
	lengthBuffer.writeUInt16LE(extensionBuffer.length, 0);

	const checksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);
	checksumBuffer.writeUInt16LE(_doChecksum(extensionBuffer), 0);

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

function _writeGRBS(
	answerArray: any[],
	rebusSolutions
) {
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

function _writeRUSR(userSolutionArray: string[]) {
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

function _writeRebus(
	answerArray: string[],
	userSolutionArray: string[],
	extensions: {
		timing?: number,
	}
): Buffer {
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
		totalBufferLength,
	);
}

function _parsePuzzle(
	path: PuzzleContent,
	options: {
		solutionKey?: string,
	}
): IPuzzleData {
	const reader = new PUZReader(path);

	const header = _readHeader(reader, options);

	const numberOfCells = header.width * header.height;

	const answer = reader.readString(numberOfCells);

	let unscrambledAnswer: string = answer;

	if (header.solutionState === SolutionState.Locked) {						
		unscrambledAnswer = _unscrambleSolution(
			{
				width: header.width,
				height: header.height,
				answer,
				key: options.solutionKey
			},
		);
	}
	else {
		unscrambledAnswer = answer;
	}

	const solution = reader.readString(numberOfCells);

	const title = reader.readString();

	const author = reader.readString();

	const copyright = reader.readString();

	const clueList = _readClues(reader, header.numberOfClues);

	const { grid, clues } = _generateGridAndClues(
		_unflattenSolution(unscrambledAnswer, header.width),
		clueList
	);

	const notes = reader.readString();

	const extensions = _parseExtensions(
		reader,
		{
			grid,
			header,
			solution,
		}
	);

	return {
		header,
		numberOfCells,
		answer,
		unscrambledAnswer,
		solution,
		title,
		author,
		copyright,
		clueList,
		grid,
		clues,
		notes,
		...extensions,
	};
}

function validatePuzzle(puzzle: IPuzzleData) {
	const checksumResults = _validateChecksums(puzzle);

	const errors = [];

	if (checksumResults) {
		errors.push(...checksumResults);
	}

	return errors.length === 0 ? undefined : errors;
}

async function _getPuzzleData(
	path: PuzzleContent,
	options: IPuzzleParseOptions
): Promise<IPuzzleConstructorArgs> {
	const puzzleData = _parsePuzzle(path, options);

	const errors = validatePuzzle(puzzleData);

	if (errors !== undefined) {
		throw new Error(`Invalid puzzle:\n\t${errors.join("\n\t")}`);
	}
	else {
		return {
			info: {
				title: puzzleData.title || undefined,
				author: puzzleData.author || undefined,
				copyright: puzzleData.copyright || undefined,
				intro: puzzleData.notes || undefined,
			},
			grid: puzzleData.grid,
			clues: puzzleData.clues,
			userSolution: _unflattenSolution(
				puzzleData.solution as string,
				puzzleData.header.width
			),
			extensions: {
				timing: puzzleData.timing,
			},
		};
	}
}

/**
 * Parser class for PUZ-formatted puzzles.
 *
 * @constructor
 */
class PUZParser {
	/**
	 * Parses a file in .puz format into a {@link Puzzle} object.
	 * 
	 * If the puzzle is not locked and an `options.solutionKey` was specified,
	 * the solutionKey will be ignored.
	 *
	 * @throws if the puzzle is locked and an invalid (or no)
	 * `options.solutionKey` was provided
	 */
	parse(
		/**
		 * the .puz file to parse, either as a file path or a {@link Buffer} or 
		 * {@link ArrayBuffer} containing the puzzle content
		 */
		path: PuzzleContent,
		options: IPuzzleParseOptions = {}
	): Promise<Puzzle> {
		return _getPuzzleData(path, options).then(
			(puzzleData) => new Puzzle(puzzleData)
		);
	}

	/**
	 * Given a {@link module:xpuz/puzzle~Puzzle|Puzzle} object, returns a {@link external:Buffer|Buffer}
	 * containing the puzzle in .puz format.
	 *
	 * @throws if `options.scrambled` is true but `options.solutionKey` is not a 4-digit integer
	 *	(between 1000 and 9999, inclusive).
	 */
	generate(
		puzzle: Puzzle,
		options: {
			/**
			 * If true, the puzzle's solution will be scrambled
			 */
			scrambled?: boolean,
			solutionKey?: string,
		} = {}
	): Buffer {
		const puzzleObj = puzzle.toJSON();

		const numberOfClues = size(puzzleObj.clues.across) + size(puzzleObj.clues.down);
		const puzzleType = PuzzleType.Normal;
		let solutionState = SolutionState.Unlocked;

		options = options || {};

		const height = puzzleObj.grid.length;
		const width = puzzleObj.grid[0].length;

		const notes = puzzleObj.info.intro || "";

		let answerArray = _pluckSolutions(puzzleObj.grid);
		let unscrambledAnswerArray: string[][]|undefined;

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

			solutionState = SolutionState.Locked;
		}

		const flattenedAnswerArray = flatten(answerArray);
		const flattenedUnscrambledAnswerArray = flatten(unscrambledAnswerArray || answerArray);

		const userSolution = puzzleObj.userSolution.map(
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

		const clueList = compact(flatten(puzzleObj.grid).map(
			(cell: IGridCell) => (cell as IInputCell).clueNumber
		)).reduce(
			(cluesArray: string[], clueNumber: number) => {
				if (puzzleObj.clues.across[clueNumber] !== undefined) {
					cluesArray.push(puzzleObj.clues.across[clueNumber]);
				}

				if (puzzleObj.clues.down[clueNumber] !== undefined) {
					cluesArray.push(puzzleObj.clues.down[clueNumber]);
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
			title: puzzleObj.info.title,
			author: puzzleObj.info.author,
			copyright: puzzleObj.info.copyright,
			clueList,
			notes,
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

		const titleStringBuffer = iconv.encode(`${puzzleObj.info.title || ""}\0`, PUZReader.ENCODING);
		const authorStringBuffer = iconv.encode(`${puzzleObj.info.author || ""}\0`, PUZReader.ENCODING);
		const copyrightStringBuffer = iconv.encode(`${puzzleObj.info.copyright || ""}\0`, PUZReader.ENCODING);

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
				puzzleObj.extensions || {}
			);

			buffers.push(rebusBuffer);

			totalBufferLength += rebusBuffer.length;
		}

		return Buffer.concat(buffers, totalBufferLength);
	}
}

export default PUZParser;
