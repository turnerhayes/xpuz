"use strict";
/**
 * PUZ file parser.
 *
 * @module xpuz/parsers/puz
 * @see {@link module:xpuz/puzzle|Puzzle}
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const get_1 = __importDefault(require("lodash/get"));
const range_1 = __importDefault(require("lodash/range"));
const zip_1 = __importDefault(require("lodash/zip"));
const each_1 = __importDefault(require("lodash/each"));
const flatten_1 = __importDefault(require("lodash/flatten"));
const padStart_1 = __importDefault(require("lodash/padStart"));
const chunk_1 = __importDefault(require("lodash/chunk"));
const findKey_1 = __importDefault(require("lodash/findKey"));
const compact_1 = __importDefault(require("lodash/compact"));
const size_1 = __importDefault(require("lodash/size"));
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const puz_reader_1 = __importDefault(require("./puz/puz-reader"));
const puzzle_1 = __importDefault(require("../puzzle"));
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
var PuzzleType;
(function (PuzzleType) {
    PuzzleType[PuzzleType["Normal"] = 1] = "Normal";
    PuzzleType[PuzzleType["Diagramless"] = 1025] = "Diagramless";
})(PuzzleType = exports.PuzzleType || (exports.PuzzleType = {}));
var SolutionState;
(function (SolutionState) {
    // solution is available in plaintext
    SolutionState[SolutionState["Unlocked"] = 0] = "Unlocked";
    // solution is locked (scrambled) with a key
    SolutionState[SolutionState["Locked"] = 4] = "Locked";
})(SolutionState = exports.SolutionState || (exports.SolutionState = {}));
const ATOZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MINIMUM_KEY_VALUE = 1000;
const MAXIMUM_KEY_VALUE = 9999;
function _doChecksum(buffer, cksum = 0) {
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
    const puzzleType = reader.readUInt16();
    const solutionState = reader.readUInt16();
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
function _processExtension(extension) {
    if (extension.name === "GRBS") {
        extension.board = Array.from(extension.data).map((b) => {
            if (b === 0) {
                return null;
            }
            return b - 1;
        });
    }
    if (extension.name === "RTBL") {
        extension.rebus_solutions = iconv_lite_1.default.decode(extension.data, puz_reader_1.default.ENCODING).split(";").reduce((solutions, solutionPair) => {
            let [num, solution] = solutionPair
                .split(":");
            num = parseInt(num, 10);
            solutions[num] = solution;
            return solutions;
        }, {});
    }
    if (extension.name === "LTIM") {
        const timings = iconv_lite_1.default.decode(extension.data, puz_reader_1.default.ENCODING).split(",");
        extension.timing = {
            elapsed: parseInt(timings[0], 10),
            running: timings[1] === "0"
        };
    }
    if (extension.name === "GEXT") {
        extension.cell_states = Array.from(extension.data).map((b) => {
            return {
                PreviouslyIncorrect: !!(b & 16 /* PreviouslyIncorrect */),
                CurrentlyIncorrect: !!(b & 32 /* CurrentlyIncorrect */),
                AnswerGiven: !!(b & 64 /* AnswerGiven */),
                Circled: !!(b & 128 /* Circled */)
            };
        });
    }
    if (extension.name === "RUSR") {
        extension.user_rebus_entries = iconv_lite_1.default.decode(extension.data, puz_reader_1.default.ENCODING).split("\0").map((entry) => entry === "" ? null : entry);
    }
    return extension;
}
function _readExtension(reader) {
    const name = reader.readString(EXTENSION_NAME_LENGTH);
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
function _parseEnd(reader, extensions = {}) {
    const remainingLength = reader.size() - reader.tell();
    if (remainingLength >= EXTENSION_HEADER_LENGTH) {
        const extension = _readExtension(reader);
        extensions[extension.name] = extension;
        delete extension.name;
        extensions = _parseEnd(reader, extensions);
    }
    return extensions;
}
function _parseExtensions(reader, { grid, header, solution, }) {
    const data = {};
    const extensions = _parseEnd(reader, data);
    if (extensions.GRBS) {
        flatten_1.default(grid).map((cell, index) => {
            if (extensions.GRBS.board[index] === null) {
                return;
            }
            const rebusSolution = extensions.RTBL.rebus_solutions[extensions.GRBS.board[index]];
            cell.solution = rebusSolution;
        });
    }
    if (extensions.RUSR) {
        extensions.RUSR.user_rebus_entries.forEach((rusr, index) => {
            if (rusr !== null) {
                const y = Math.floor(index / header.width);
                const x = index % header.width;
                solution[y][x] = rusr;
            }
        });
    }
    return {
        extensions,
        timing: extensions.LTIM ?
            extensions.LTIM.timing :
            undefined,
    };
}
function _readClues(reader, numberOfClues) {
    const clues = [];
    for (let i = 0; i < numberOfClues; i++) {
        clues.push(reader.readString());
    }
    return clues;
}
function _generateGridAndClues(answers, clueList) {
    const _isBlockCell = (x, y) => {
        return answers[y][x] === BLOCK_CELL_VALUE;
    };
    const clues = {
        across: {},
        down: {}
    };
    const grid = [];
    const height = answers.length;
    const width = answers[0].length;
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
                if ((x === 0 ||
                    _isBlockCell(x - 1, y)) && (x + 1 < width &&
                    !_isBlockCell(x + 1, y))) {
                    across = true;
                }
                if ((y === 0 ||
                    _isBlockCell(x, y - 1)) && (y + 1 < height &&
                    !_isBlockCell(x, y + 1))) {
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
    return grid.map((row) => row.map((cell) => {
        if (cell.isBlockCell) {
            return BLOCK_CELL_VALUE;
        }
        if (cell.solution === null) {
            return " ";
        }
        return cell.solution;
    }));
}
function _flattenSolution(solution) {
    return flatten_1.default(solution).map((entry) => {
        if (entry === null) {
            return BLOCK_CELL_VALUE;
        }
        if (entry === "") {
            return "-";
        }
        return entry[0];
    }).join("");
}
function _unflattenSolution(solution, width) {
    return chunk_1.default(solution.split(""), width).map((row) => row.map((cell) => cell === "-" ? "" : cell));
}
function _textChecksum({ title, author, copyright, clueList, notes, }, checksum = 0) {
    if (title) {
        checksum = _doChecksum(iconv_lite_1.default.encode(title + "\0", puz_reader_1.default.ENCODING), checksum);
    }
    if (author) {
        checksum = _doChecksum(iconv_lite_1.default.encode(author + "\0", puz_reader_1.default.ENCODING), checksum);
    }
    if (copyright) {
        checksum = _doChecksum(iconv_lite_1.default.encode(copyright + "\0", puz_reader_1.default.ENCODING), checksum);
    }
    clueList.forEach((clue) => {
        if (clue) {
            checksum = _doChecksum(iconv_lite_1.default.encode(clue, puz_reader_1.default.ENCODING), checksum);
        }
    });
    if (notes) {
        checksum = _doChecksum(iconv_lite_1.default.encode(notes + "\0", puz_reader_1.default.ENCODING), checksum);
    }
    return checksum;
}
function _headerChecksum(puzzleData, checksum) {
    if (checksum === undefined) {
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
function _globalChecksum(puzzleData, headerChecksum = 0) {
    let checksum = headerChecksum === undefined ? _headerChecksum(puzzleData) : headerChecksum;
    let buffer = iconv_lite_1.default.encode(puzzleData.answer, puz_reader_1.default.ENCODING);
    checksum = _doChecksum(buffer, checksum);
    buffer = iconv_lite_1.default.encode(puzzleData.solution, puz_reader_1.default.ENCODING);
    checksum = _doChecksum(buffer, checksum);
    checksum = _textChecksum({
        title: puzzleData.title,
        author: puzzleData.author,
        copyright: puzzleData.copyright,
        clueList: puzzleData.clueList,
        notes: puzzleData.notes,
    }, checksum);
    return checksum;
}
function _magicChecksum(puzzleData) {
    const headerChecksum = _headerChecksum(puzzleData);
    const answerChecksum = _doChecksum(iconv_lite_1.default.encode(puzzleData.answer, puz_reader_1.default.ENCODING));
    const solutionChecksum = _doChecksum(iconv_lite_1.default.encode(puzzleData.solution, puz_reader_1.default.ENCODING));
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
function _transposeGrid(gridString, width, height) {
    const data = gridString.match(new RegExp(".{1," + width + "}", "g"));
    if (data === null) {
        throw new Error("Grid string invalid");
    }
    return range_1.default(width).map((c) => range_1.default(height).map((r) => data[r][c]).join("")).join("");
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
    const splitTarget = t.split("");
    return s.split("").reduce((arr, c) => {
        if (c === BLOCK_CELL_VALUE) {
            arr.push(c);
        }
        else {
            arr.push(splitTarget.shift());
        }
        return arr;
    }, []).join("");
}
function _shift(str, key) {
    return str.split("").map((c, index) => {
        let letterIndex = (ATOZ.indexOf(c) + Number(key[index % key.length])) % ATOZ.length;
        if (letterIndex < 0) {
            letterIndex = ATOZ.length + letterIndex;
        }
        return ATOZ[letterIndex];
    }).join("");
}
function _unshift(str, key) {
    return _shift(str, Array.from(key).map((k) => -k));
}
function _everyOther(str) {
    return str.split("").reduce((arr, char, index) => {
        // eslint-disable-next-line no-magic-numbers
        if (index % 2 === 0) {
            arr.push(char);
        }
        return arr;
    }, []).join("");
}
function _unshuffle(str) {
    return _everyOther(str.substring(1)) + _everyOther(str);
}
function _unscrambleString(str, key) {
    const len = str.length;
    padStart_1.default(key, PUZZLE_KEY_LENGTH, "0").split("").reverse().forEach((k) => {
        str = _unshuffle(str);
        str = str.substring(len - Number(k)) + str.substring(0, len - Number(k));
        str = _unshift(str, key);
    });
    return str;
}
function _shuffle(str) {
    // eslint-disable-next-line no-magic-numbers
    const mid = Math.floor(str.length / 2);
    return zip_1.default(str.substring(mid).split(""), str.substring(0, mid).split("")).reduce((arr, chars) => {
        if (chars[0] === undefined || chars[1] === undefined) {
            return arr;
        }
        arr.push(chars[0] + chars[1]);
        return arr;
    }, []
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
    Array.from(padStart_1.default(key, PUZZLE_KEY_LENGTH, "0")).forEach((k) => {
        str = _shift(str, key);
        str = str.substring(Number(k)) + str.substring(0, Number(k));
        str = _shuffle(str);
    });
    return str;
}
function _scrambledChecksum(answer, width, height) {
    const transposed = _transposeGrid(_flattenSolution(answer), width, height).replace(BLOCK_CELL_VALUE_REGEX, "");
    return _doChecksum(iconv_lite_1.default.encode(transposed, puz_reader_1.default.ENCODING));
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
    each_1.default(puzzleData.extensions, (extension, name) => {
        if (extension.checksum !== _doChecksum(extension.data)) {
            errors.push(`checksum for extension ${name} does not match`);
        }
    });
    return errors;
}
function _scrambleSolution(solutionGrid, key) {
    const height = solutionGrid.length;
    const width = solutionGrid[0].length;
    let solutionString = flatten_1.default(_flattenSolution(solutionGrid)).join("");
    const transposed = _transposeGrid(solutionString, width, height);
    const data = _restoreSolution(transposed, _scrambleString(transposed.replace(BLOCK_CELL_VALUE_REGEX, ""), key));
    solutionString = _transposeGrid(data, height, width);
    return chunk_1.default(solutionString.split(""), width);
}
function _unscrambleSolution({ answer, width, height, key, }) {
    const transposed = _transposeGrid(answer, width, height);
    const data = _restoreSolution(transposed, _unscrambleString(transposed.replace(BLOCK_CELL_VALUE_REGEX, ""), key));
    const result = _transposeGrid(data, height, width);
    if (result === answer) {
        throw new Error("Unscrambled solution is the same as the scrambled solution; incorrect key?");
    }
    return result;
}
function _writeHeader(puzzleData, options) {
    const globalChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);
    globalChecksumBuffer.writeUInt16LE(_globalChecksum(puzzleData), 0);
    const headerChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);
    headerChecksumBuffer.writeUInt16LE(_headerChecksum(puzzleData), 0);
    const magicChecksumBuffer = _magicChecksum(puzzleData);
    const scrambledChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);
    if (get_1.default(options, "scrambled")) {
        scrambledChecksumBuffer.writeUInt16LE(_scrambledChecksum(puzzleData.unscrambledAnswer, puzzleData.header.width, puzzleData.header.height), 0);
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
    return Buffer.concat([
        globalChecksumBuffer,
        iconv_lite_1.default.encode("ACROSS&DOWN\0", puz_reader_1.default.ENCODING),
        headerChecksumBuffer,
        magicChecksumBuffer,
        iconv_lite_1.default.encode(get_1.default(options, "version", "1.3") + "\0", puz_reader_1.default.ENCODING),
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
    ], HEADER_BUFFER_LENGTH);
}
function _writeExtension(extensionBuffer, extensionName) {
    const lengthBuffer = new Buffer(EXTENSION_LENGTH_BUFFER_LENGTH);
    lengthBuffer.writeUInt16LE(extensionBuffer.length, 0);
    const checksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);
    checksumBuffer.writeUInt16LE(_doChecksum(extensionBuffer), 0);
    return Buffer.concat([
        iconv_lite_1.default.encode(extensionName, puz_reader_1.default.ENCODING),
        lengthBuffer,
        checksumBuffer,
        extensionBuffer,
        new Buffer([0])
    ], EXTENSION_NAME_LENGTH + EXTENSION_LENGTH_BUFFER_LENGTH + CHECKSUM_BUFFER_LENGTH + extensionBuffer.length + 1);
}
function _writeGRBS(answerArray, rebusSolutions) {
    const grbsBuffer = new Buffer(answerArray.map((cell, index) => {
        const solutionKey = findKey_1.default(rebusSolutions, (solutionInfo) => solutionInfo.cells.includes(index));
        if (solutionKey === undefined) {
            return 0;
        }
        return parseInt(solutionKey, 10) + 1;
    }));
    return _writeExtension(grbsBuffer, "GRBS");
}
function _writeRTBL(rebusSolutions) {
    const rtblBuffer = iconv_lite_1.default.encode(Object.keys(rebusSolutions).map((key) => `${padStart_1.default(key, RTBL_KEY_PADDING_WIDTH, " ")}:${rebusSolutions[key].solution};`).join(""), puz_reader_1.default.ENCODING);
    return _writeExtension(rtblBuffer, "RTBL");
}
function _writeRUSR(userSolutionArray) {
    const rusrBuffer = iconv_lite_1.default.encode(userSolutionArray.map((solution) => {
        if (solution.length > 1) {
            return `${solution}\0`;
        }
        return "\0";
    }).join(""), puz_reader_1.default.ENCODING);
    return _writeExtension(rusrBuffer, "RUSR");
}
function _writeLTIM(timing) {
    return _writeExtension(iconv_lite_1.default.encode(`${timing.elapsed},${timing.running ? "1" : "0"}`, puz_reader_1.default.ENCODING), "LTIM");
}
function _writeRebus(answerArray, userSolutionArray, extensions) {
    let solutionKey = 0;
    const rebusSolutions = flatten_1.default(answerArray).reduce((solutions, cellSolution, cellIndex) => {
        if (cellSolution && cellSolution.length > 1) {
            const key = findKey_1.default(solutions, { solution: cellSolution });
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
    }, {});
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
    return Buffer.concat(buffers, totalBufferLength);
}
function _parsePuzzle(path, options) {
    const reader = new puz_reader_1.default(path);
    const header = _readHeader(reader, options);
    const numberOfCells = header.width * header.height;
    const answer = reader.readString(numberOfCells);
    let unscrambledAnswer = answer;
    if (header.solutionState === SolutionState.Locked) {
        unscrambledAnswer = _unscrambleSolution({
            width: header.width,
            height: header.height,
            answer,
            key: options.solutionKey
        });
    }
    else {
        unscrambledAnswer = answer;
    }
    const solution = reader.readString(numberOfCells);
    const title = reader.readString();
    const author = reader.readString();
    const copyright = reader.readString();
    const clueList = _readClues(reader, header.numberOfClues);
    const { grid, clues } = _generateGridAndClues(_unflattenSolution(unscrambledAnswer, header.width), clueList);
    const notes = reader.readString();
    const extensions = _parseExtensions(reader, {
        grid,
        header,
        solution,
    });
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
function validatePuzzle(puzzle) {
    const checksumResults = _validateChecksums(puzzle);
    const errors = [];
    if (checksumResults) {
        errors.push(...checksumResults);
    }
    return errors.length === 0 ? undefined : errors;
}
async function _getPuzzleData(path, options) {
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
            userSolution: _unflattenSolution(puzzleData.solution, puzzleData.header.width),
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
    path, options = {}) {
        return _getPuzzleData(path, options).then((puzzleData) => new puzzle_1.default(puzzleData));
    }
    /**
     * Given a {@link module:xpuz/puzzle~Puzzle|Puzzle} object, returns a {@link external:Buffer|Buffer}
     * containing the puzzle in .puz format.
     *
     * @throws if `options.scrambled` is true but `options.solutionKey` is not a 4-digit integer
     *	(between 1000 and 9999, inclusive).
     */
    generate(puzzle, options = {}) {
        const puzzleObj = puzzle.toJSON();
        const numberOfClues = size_1.default(puzzleObj.clues.across) + size_1.default(puzzleObj.clues.down);
        const puzzleType = PuzzleType.Normal;
        let solutionState = SolutionState.Unlocked;
        options = options || {};
        const height = puzzleObj.grid.length;
        const width = puzzleObj.grid[0].length;
        const notes = puzzleObj.info.intro || "";
        let answerArray = _pluckSolutions(puzzleObj.grid);
        let unscrambledAnswerArray;
        if (options.scrambled) {
            if (!options.solutionKey ||
                Number(options.solutionKey) < MINIMUM_KEY_VALUE ||
                Number(options.solutionKey) > MAXIMUM_KEY_VALUE) {
                throw new Error(`Must specify a solution key that is an integer >= 1000 and <= 9999; was ${options.solutionKey}`);
            }
            unscrambledAnswerArray = answerArray;
            answerArray = _scrambleSolution(answerArray, options.solutionKey);
            solutionState = SolutionState.Locked;
        }
        const flattenedAnswerArray = flatten_1.default(answerArray);
        const flattenedUnscrambledAnswerArray = flatten_1.default(unscrambledAnswerArray || answerArray);
        const userSolution = puzzleObj.userSolution.map((row) => row.map((solution) => {
            if (solution === null) {
                return BLOCK_CELL_VALUE;
            }
            if (solution === "") {
                return "-";
            }
            return solution;
        }));
        const userSolutionArray = flatten_1.default(userSolution);
        const clueList = compact_1.default(flatten_1.default(puzzleObj.grid).map((cell) => cell.clueNumber)).reduce((cluesArray, clueNumber) => {
            if (puzzleObj.clues.across[clueNumber] !== undefined) {
                cluesArray.push(puzzleObj.clues.across[clueNumber]);
            }
            if (puzzleObj.clues.down[clueNumber] !== undefined) {
                cluesArray.push(puzzleObj.clues.down[clueNumber]);
            }
            return cluesArray;
        }, []);
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
        const answerStringBuffer = iconv_lite_1.default.encode(_flattenSolution(answerArray), puz_reader_1.default.ENCODING);
        const userSolutionStringBuffer = iconv_lite_1.default.encode(userSolutionArray.map((solution) => solution[0]).join(""), puz_reader_1.default.ENCODING);
        const titleStringBuffer = iconv_lite_1.default.encode(`${puzzleObj.info.title || ""}\0`, puz_reader_1.default.ENCODING);
        const authorStringBuffer = iconv_lite_1.default.encode(`${puzzleObj.info.author || ""}\0`, puz_reader_1.default.ENCODING);
        const copyrightStringBuffer = iconv_lite_1.default.encode(`${puzzleObj.info.copyright || ""}\0`, puz_reader_1.default.ENCODING);
        const cluesStringBuffer = iconv_lite_1.default.encode(`${clueList.join("\0")}\0`, puz_reader_1.default.ENCODING);
        const notesStringBuffer = iconv_lite_1.default.encode(`${notes}\0`, puz_reader_1.default.ENCODING);
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
        if (flattenedUnscrambledAnswerArray.some((solution) => solution.length > 1)) {
            const rebusBuffer = _writeRebus(flattenedUnscrambledAnswerArray, userSolutionArray, puzzleObj.extensions || {});
            buffers.push(rebusBuffer);
            totalBufferLength += rebusBuffer.length;
        }
        return Buffer.concat(buffers, totalBufferLength);
    }
}
exports.default = PUZParser;
//# sourceMappingURL=puz.js.map