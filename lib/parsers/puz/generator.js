"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const flatten_1 = __importDefault(require("lodash/flatten"));
const chunk_1 = __importDefault(require("lodash/chunk"));
const compact_1 = __importDefault(require("lodash/compact"));
const findKey_1 = __importDefault(require("lodash/findKey"));
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const puz_reader_1 = __importDefault(require("./puz-reader"));
const common_1 = require("./common");
const grid_string_utils_1 = require("./grid-string-utils");
const constants_1 = require("./constants");
const NULL_BYTE = String.fromCharCode(0);
function writeExtension(extensionBuffer, extensionName) {
    const lengthBuffer = new Buffer(constants_1.EXTENSION_LENGTH_BUFFER_LENGTH);
    lengthBuffer.writeUInt16LE(extensionBuffer.length, 0);
    const checksumBuffer = new Buffer(constants_1.CHECKSUM_BUFFER_LENGTH);
    checksumBuffer.writeUInt16LE(doChecksum(extensionBuffer), 0);
    return Buffer.concat([
        iconv_lite_1.default.encode(extensionName, puz_reader_1.default.ENCODING),
        lengthBuffer,
        checksumBuffer,
        extensionBuffer,
        new Buffer([0])
    ], constants_1.EXTENSION_NAME_LENGTH + constants_1.EXTENSION_LENGTH_BUFFER_LENGTH + constants_1.CHECKSUM_BUFFER_LENGTH + extensionBuffer.length + 1);
}
function writeExtensions(answerArray, userSolutionArray, timing) {
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
    const grbsBuffer = writeExtension(new Buffer(answerArray.map((cell, index) => {
        const solutionKey = findKey_1.default(rebusSolutions, (solutionInfo) => solutionInfo.cells.includes(index));
        if (solutionKey === undefined) {
            return 0;
        }
        return parseInt(solutionKey, 10) + 1;
    })), "GRBS");
    const RTBL_KEY_PADDING_WIDTH = 2;
    const rtblBuffer = writeExtension(iconv_lite_1.default.encode(Object.keys(rebusSolutions).map((key) => `${grid_string_utils_1.padStart(key, RTBL_KEY_PADDING_WIDTH, " ")}:${rebusSolutions[key].solution};`).join(""), puz_reader_1.default.ENCODING), "RTBL");
    const rusrBuffer = writeExtension(iconv_lite_1.default.encode(userSolutionArray.map((solution) => {
        if (solution.length > 1) {
            return `${solution}${NULL_BYTE}`;
        }
        return NULL_BYTE;
    }).join(""), puz_reader_1.default.ENCODING), "RUSR");
    const buffers = [
        grbsBuffer,
        rtblBuffer,
        rusrBuffer,
    ];
    let totalBufferLength = grbsBuffer.length + rtblBuffer.length + rusrBuffer.length;
    if (timing) {
        const ltimBuffer = writeExtension(iconv_lite_1.default.encode(`${timing.elapsed},${timing.running ? "1" : "0"}`, puz_reader_1.default.ENCODING), "LTIM");
        buffers.push(ltimBuffer);
        totalBufferLength += ltimBuffer.length;
    }
    return Buffer.concat(buffers, totalBufferLength);
}
function scrambleSolution(solutionGrid, key) {
    const height = solutionGrid.length;
    const width = solutionGrid[0].length;
    let solutionString = flattenSolution(solutionGrid);
    const transposed = grid_string_utils_1.transposeGrid(solutionString, width, height);
    const data = grid_string_utils_1.restoreSolution(transposed, grid_string_utils_1.scrambleString(transposed.replace(constants_1.BLOCK_CELL_VALUE_REGEX, ""), key));
    solutionString = grid_string_utils_1.transposeGrid(data, height, width);
    return chunk_1.default(solutionString.split(""), width);
}
function magicChecksum({ header, answer, solution, title, author, copyright, notes, clueList, }) {
    const _headerChecksum = getHeaderChecksum(header);
    const answerChecksum = doChecksum(iconv_lite_1.default.encode(answer, puz_reader_1.default.ENCODING));
    const solutionChecksum = doChecksum(iconv_lite_1.default.encode(solution, puz_reader_1.default.ENCODING));
    const _textChecksum = textChecksum({
        title,
        author,
        copyright,
        clueList,
        notes,
        version: header.version,
    });
    const MAGIC_CHECKSUM_STRING = "ICHEATED";
    const magicChecksum = new Buffer([
        /* eslint-disable no-magic-numbers */
        MAGIC_CHECKSUM_STRING.charCodeAt(0) ^ (_headerChecksum & 0xFF),
        MAGIC_CHECKSUM_STRING.charCodeAt(1) ^ (answerChecksum & 0xFF),
        MAGIC_CHECKSUM_STRING.charCodeAt(2) ^ (solutionChecksum & 0xFF),
        MAGIC_CHECKSUM_STRING.charCodeAt(3) ^ (_textChecksum & 0xFF),
        MAGIC_CHECKSUM_STRING.charCodeAt(4) ^ ((_headerChecksum & 0xFF00) >> 8),
        MAGIC_CHECKSUM_STRING.charCodeAt(5) ^ ((answerChecksum & 0xFF00) >> 8),
        MAGIC_CHECKSUM_STRING.charCodeAt(6) ^ ((solutionChecksum & 0xFF00) >> 8),
        MAGIC_CHECKSUM_STRING.charCodeAt(7) ^ ((_textChecksum & 0xFF00) >> 8)
        /* eslint-enable no-magic-numbers */
    ]);
    return magicChecksum;
}
function scrambledChecksum(answer, width, height) {
    const transposed = grid_string_utils_1.transposeGrid(flattenSolution(answer), width, height).replace(constants_1.BLOCK_CELL_VALUE_REGEX, "");
    return doChecksum(iconv_lite_1.default.encode(transposed, puz_reader_1.default.ENCODING));
}
function doChecksum(buffer, cksum = 0) {
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
function writeHeader({ header, unscrambledAnswer, answer, solution, title = "", author = "", copyright = "", notes = "", clueList, scrambled, }) {
    const globalChecksumBuffer = new Buffer(constants_1.CHECKSUM_BUFFER_LENGTH);
    globalChecksumBuffer.writeUInt16LE(globalChecksum({
        header,
        answer,
        solution,
        title,
        author,
        copyright,
        notes,
        clueList,
    }), 0);
    const headerChecksumBuffer = new Buffer(constants_1.CHECKSUM_BUFFER_LENGTH);
    headerChecksumBuffer.writeUInt16LE(getHeaderChecksum(header), 0);
    const magicChecksumBuffer = magicChecksum({
        header,
        answer,
        solution,
        title,
        author,
        copyright,
        notes,
        clueList,
    });
    const scrambledChecksumBuffer = new Buffer(constants_1.CHECKSUM_BUFFER_LENGTH);
    if (scrambled) {
        scrambledChecksumBuffer.writeUInt16LE(scrambledChecksum(unscrambledAnswer, header.width, header.height), 0);
    }
    else {
        scrambledChecksumBuffer.fill(0x0);
    }
    const numberOfCluesBuffer = new Buffer(constants_1.NUMBER_OF_CLUES_BUFFER_LENGTH);
    numberOfCluesBuffer.writeUInt16LE(header.numberOfClues, 0);
    const puzzleTypeBuffer = new Buffer(constants_1.PUZZLE_TYPE_BUFFER_LENGTH);
    puzzleTypeBuffer.writeUInt16LE(header.puzzleType, 0);
    const solutionStateBuffer = new Buffer(constants_1.SOLUTION_STATE_BUFFER_LENGTH);
    solutionStateBuffer.writeUInt16LE(header.solutionState, 0);
    return Buffer.concat([
        globalChecksumBuffer,
        iconv_lite_1.default.encode(`ACROSS&DOWN${NULL_BYTE}`, puz_reader_1.default.ENCODING),
        headerChecksumBuffer,
        magicChecksumBuffer,
        iconv_lite_1.default.encode(header.version + NULL_BYTE, puz_reader_1.default.ENCODING),
        // unknown block 1
        new Buffer([0x0, 0x0]),
        scrambledChecksumBuffer,
        // unknown block 2
        new Buffer(constants_1.UNKNOWN2_BYTE_LENGTH).fill(0x0),
        new Buffer([header.width]),
        new Buffer([header.height]),
        numberOfCluesBuffer,
        puzzleTypeBuffer,
        solutionStateBuffer
    ], constants_1.HEADER_BUFFER_LENGTH);
}
function globalChecksum({ header, answer, solution, title, author, copyright, notes, clueList, }, headerChecksum = 0) {
    let checksum = headerChecksum === undefined ? getHeaderChecksum(header) : headerChecksum;
    let buffer = iconv_lite_1.default.encode(answer, puz_reader_1.default.ENCODING);
    checksum = doChecksum(buffer, checksum);
    buffer = iconv_lite_1.default.encode(solution, puz_reader_1.default.ENCODING);
    checksum = doChecksum(buffer, checksum);
    checksum = textChecksum({
        title,
        author,
        copyright,
        clueList,
        notes,
        version: header.version,
    }, checksum);
    return checksum;
}
function textChecksum({ title, author, copyright, clueList, notes, version, }, checksum = 0) {
    if (title) {
        checksum = doChecksum(iconv_lite_1.default.encode(title + NULL_BYTE, puz_reader_1.default.ENCODING), checksum);
    }
    if (author) {
        checksum = doChecksum(iconv_lite_1.default.encode(author + NULL_BYTE, puz_reader_1.default.ENCODING), checksum);
    }
    if (copyright) {
        checksum = doChecksum(iconv_lite_1.default.encode(copyright + NULL_BYTE, puz_reader_1.default.ENCODING), checksum);
    }
    clueList.forEach((clue) => {
        if (clue) {
            checksum = doChecksum(iconv_lite_1.default.encode(clue, puz_reader_1.default.ENCODING), checksum);
        }
    });
    const versionParts = version.split(".").map(Number);
    // Notes only became part of the checksum starting in version 1.3
    // (see https://github.com/alexdej/puzpy/blob/6109ad5a54359262010d01f2e0175d928bd70962/puz.py#L360)
    if (versionParts[0] >= 1 && versionParts[1] >= 3) { // eslint-disable-line no-magic-numbers
        if (notes) {
            checksum = doChecksum(iconv_lite_1.default.encode(notes + NULL_BYTE, puz_reader_1.default.ENCODING), checksum);
        }
    }
    return checksum;
}
function getHeaderChecksum(header, checksum) {
    if (checksum === undefined) {
        checksum = 0;
    }
    const buffer = new Buffer(constants_1.HEADER_CHECKSUM_BYTE_LENGTH);
    buffer.writeUInt8(header.width, 0);
    buffer.writeUInt8(header.height, 1);
    // These "magic numbers" are the successive byte offsets to write at
    /* eslint-disable no-magic-numbers */
    buffer.writeUInt16LE(header.numberOfClues, 2);
    buffer.writeUInt16LE(header.puzzleType, 4);
    buffer.writeUInt16LE(header.solutionState, 6);
    /* eslint-enable no-magic-numbers */
    return doChecksum(buffer, checksum);
}
function flattenSolution(solution) {
    return flatten_1.default(solution).map((entry) => {
        if (entry === null) {
            return constants_1.BLOCK_CELL_VALUE;
        }
        if (entry === "") {
            return "-";
        }
        return entry[0];
    }).join("");
}
function pluckSolutions(grid) {
    return grid.map((row) => row.map((cell) => {
        if (cell.isBlockCell) {
            return constants_1.BLOCK_CELL_VALUE;
        }
        if (cell.solution === null) {
            return " ";
        }
        return cell.solution;
    }));
}
exports.generate = (puzzle, solutionKey) => {
    const numberOfClues = Object.keys(puzzle.clues.across).length + Object.keys(puzzle.clues.down).length;
    const puzzleType = common_1.PuzzleType.Normal;
    let solutionState = common_1.SolutionState.Unlocked;
    const height = puzzle.grid.length;
    const width = puzzle.grid[0].length;
    const notes = puzzle.info.intro || "";
    let answerArray = pluckSolutions(puzzle.grid);
    let unscrambledAnswerArray;
    if (solutionKey) {
        if (Number(solutionKey) < constants_1.MINIMUM_KEY_VALUE ||
            Number(solutionKey) > constants_1.MAXIMUM_KEY_VALUE) {
            throw new Error(`Must specify a solution key that is an integer >= 1000 and <= 9999; was ${solutionKey}`);
        }
        unscrambledAnswerArray = answerArray;
        answerArray = scrambleSolution(answerArray, solutionKey);
        solutionState = common_1.SolutionState.Locked;
    }
    const flattenedAnswerArray = flatten_1.default(answerArray);
    const flattenedUnscrambledAnswerArray = flatten_1.default(unscrambledAnswerArray || answerArray);
    const userSolution = puzzle.userSolution.map((row) => row.map((solution) => {
        if (solution === null) {
            return constants_1.BLOCK_CELL_VALUE;
        }
        if (solution === "") {
            return "-";
        }
        return solution;
    }));
    const userSolutionArray = flatten_1.default(userSolution);
    const clueList = compact_1.default(flatten_1.default(puzzle.grid).map((cell) => cell.clueNumber)).reduce((cluesArray, clueNumber) => {
        if (puzzle.clues.across[clueNumber] !== undefined) {
            cluesArray.push(puzzle.clues.across[clueNumber]);
        }
        if (puzzle.clues.down[clueNumber] !== undefined) {
            cluesArray.push(puzzle.clues.down[clueNumber]);
        }
        return cluesArray;
    }, []);
    const header = {
        width,
        height,
        numberOfClues,
        puzzleType,
        solutionState,
        version: (puzzle.info && puzzle.info.formatExtra && puzzle.info.formatExtra.version) ||
            "1.3",
    };
    const answer = flattenSolution(flattenedAnswerArray);
    const unscrambledAnswer = flattenSolution(flattenedUnscrambledAnswerArray);
    const solution = flattenSolution(userSolution);
    const headerBuffer = writeHeader({
        header,
        unscrambledAnswer,
        answer,
        solution,
        title: puzzle.info.title,
        author: puzzle.info.author,
        copyright: puzzle.info.copyright,
        notes,
        clueList,
        scrambled: Boolean(solutionKey),
    });
    const answerStringBuffer = iconv_lite_1.default.encode(flattenSolution(answerArray), puz_reader_1.default.ENCODING);
    const userSolutionStringBuffer = iconv_lite_1.default.encode(userSolutionArray.map((solution) => solution[0]).join(""), puz_reader_1.default.ENCODING);
    const titleStringBuffer = iconv_lite_1.default.encode(`${puzzle.info.title || ""}${NULL_BYTE}`, puz_reader_1.default.ENCODING);
    const authorStringBuffer = iconv_lite_1.default.encode(`${puzzle.info.author || ""}${NULL_BYTE}`, puz_reader_1.default.ENCODING);
    const copyrightStringBuffer = iconv_lite_1.default.encode(`${puzzle.info.copyright || ""}${NULL_BYTE}`, puz_reader_1.default.ENCODING);
    const cluesStringBuffer = iconv_lite_1.default.encode(`${clueList.join(NULL_BYTE)}${NULL_BYTE}`, puz_reader_1.default.ENCODING);
    const notesStringBuffer = iconv_lite_1.default.encode(`${notes}${NULL_BYTE}`, puz_reader_1.default.ENCODING);
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
        const extensionsBuffer = writeExtensions(flattenedUnscrambledAnswerArray, userSolutionArray, puzzle.info.formatExtra && puzzle.info.formatExtra.extensions &&
            puzzle.info.formatExtra.extensions.timing);
        buffers.push(extensionsBuffer);
        totalBufferLength += extensionsBuffer.length;
    }
    return Buffer.concat(buffers, totalBufferLength);
};
//# sourceMappingURL=generator.js.map