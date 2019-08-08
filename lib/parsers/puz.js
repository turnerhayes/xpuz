"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chunk_1 = __importDefault(require("lodash/chunk"));
const flatten_1 = __importDefault(require("lodash/flatten"));
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const puzzle_1 = __importDefault(require("../puzzle"));
const puz_reader_1 = __importDefault(require("./puz/puz-reader"));
const common_1 = require("./puz/common");
const grid_string_utils_1 = require("./puz/grid-string-utils");
const constants_1 = require("./puz/constants");
const generator_1 = require("./puz/generator");
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
    async parse(
    /**
     * the .puz file to parse, either as a file path or a {@link Buffer} or
     * {@link ArrayBuffer} containing the puzzle content
     */
    path, options = {}) {
        const puzzleData = await this.getPuzzleData(path, options.solutionKey);
        const puzzle = new puzzle_1.default(puzzleData);
        if (options.converter) {
            return options.converter(puzzle);
        }
        return puzzle;
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
        return generator_1.generate(puzzleObj, options.solutionKey);
    }
    unscrambleSolution({ answer, width, height, key, }) {
        const transposed = grid_string_utils_1.transposeGrid(answer, width, height);
        const data = grid_string_utils_1.restoreSolution(transposed, grid_string_utils_1.unscrambleString(transposed.replace(constants_1.BLOCK_CELL_VALUE_REGEX, ""), key));
        const result = grid_string_utils_1.transposeGrid(data, height, width);
        if (result === answer) {
            throw new Error("Unscrambled solution is the same as the scrambled solution; incorrect key?");
        }
        return result;
    }
    async getPuzzleData(path, solutionKey) {
        const reader = new puz_reader_1.default(path);
        const header = this.readHeader(reader, solutionKey);
        const numberOfCells = header.width * header.height;
        const answer = reader.readString(numberOfCells);
        let unscrambledAnswer = answer;
        if (header.solutionState === common_1.SolutionState.Locked) {
            if (!solutionKey) {
                throw new Error("Attempted to unlock a puzzle without a key");
            }
            unscrambledAnswer = this.unscrambleSolution({
                width: header.width,
                height: header.height,
                answer,
                key: solutionKey,
            });
        }
        const userSolution = reader.readString(numberOfCells);
        const title = reader.readString();
        const author = reader.readString();
        const copyright = reader.readString();
        const clueList = this.readClues(reader, header.numberOfClues);
        const { grid, clues } = this.generateGridAndClues(unscrambledAnswer, clueList, header.width);
        const notes = reader.readString();
        const rawExtensions = this.parseExtensions(reader);
        const extensions = this.processExtensions(rawExtensions, grid);
        return {
            info: {
                author,
                title,
                copyright,
                intro: notes,
                formatExtra: {
                    extensions,
                    version: header.version,
                },
            },
            grid,
            clues,
            userSolution: this.unflattenSolution(userSolution, header.width),
        };
    }
    parseExtensions(reader) {
        let remainingLength = reader.size() - reader.tell();
        const extensions = {};
        while (remainingLength >= constants_1.EXTENSION_HEADER_LENGTH) {
            const name = reader.readString(constants_1.EXTENSION_NAME_LENGTH);
            const length = reader.readUInt16();
            const checksum = reader.readUInt16();
            // Include null byte at end
            const data = reader.readValues(length + 1)
                // Remove null byte at the end
                .slice(0, -1);
            extensions[name] = {
                name,
                data,
                checksum,
            };
            remainingLength = reader.size() - reader.tell();
        }
        return extensions;
    }
    processExtensions(extensions, grid) {
        if (extensions.RTBL) {
            let rebusSolutionsString = iconv_lite_1.default.decode(extensions.RTBL.data, puz_reader_1.default.ENCODING);
            // Strip and ending ";" so that the loop doesn't iterate an extra time
            // with an empty string
            if (rebusSolutionsString[rebusSolutionsString.length - 1] === ";") {
                rebusSolutionsString = rebusSolutionsString.slice(0, -1);
            }
            const rebusSolutions = rebusSolutionsString.split(";").reduce((solutions, solutionPair) => {
                const [numString, solution] = solutionPair
                    .split(":");
                const num = parseInt(numString, 10);
                solutions[num] = solution;
                return solutions;
            }, []);
            if (extensions.GRBS) {
                flatten_1.default(grid).map((cell, index) => {
                    const grbsBoardValue = extensions.GRBS.data.readInt8(index);
                    if (grbsBoardValue === 0) {
                        return;
                    }
                    cell.solution = rebusSolutions[grbsBoardValue - 1];
                });
            }
        }
        if (extensions.RUSR) {
            // TODO: Populate userSolution
            const userRebusEntries = iconv_lite_1.default.decode(extensions.RUSR.data, puz_reader_1.default.ENCODING).split("\0").map((entry) => entry === "" ? null : entry);
        }
        let timing;
        if (extensions.LTIM) {
            const timings = iconv_lite_1.default.decode(extensions.LTIM.data, puz_reader_1.default.ENCODING).split(",");
            timing = {
                elapsed: parseInt(timings[0], 10),
                running: timings[1] === "0"
            };
        }
        let cellStates;
        if (extensions.GEXT) {
            cellStates = Array.from(extensions.GEXT.data).map((b) => {
                return {
                    PreviouslyIncorrect: !!(b & 16 /* PreviouslyIncorrect */),
                    CurrentlyIncorrect: !!(b & 32 /* CurrentlyIncorrect */),
                    AnswerGiven: !!(b & 64 /* AnswerGiven */),
                    Circled: !!(b & 128 /* Circled */)
                };
            });
        }
        return {
            timing,
            cellStates,
        };
    }
    unflattenSolution(solution, width) {
        return chunk_1.default(solution.split(""), width).map((row) => row.map((cell) => cell === "-" ? "" : cell));
    }
    generateGridAndClues(answer, clueList, width) {
        const answers = this.unflattenSolution(answer, width);
        const _isBlockCell = (x, y) => {
            return answers[y][x] === constants_1.BLOCK_CELL_VALUE;
        };
        const clues = {
            across: {},
            down: {}
        };
        const grid = [];
        const height = answers.length;
        let clueCount = 0;
        let clueListIndex = 0;
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                const cell = _isBlockCell(x, y) ?
                    { isBlockCell: true, } :
                    { solution: answers[y][x], };
                if (!cell.isBlockCell) {
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
    readClues(reader, numberOfClues) {
        return [...new Array(numberOfClues)].map(() => {
            return reader.readString();
        });
    }
    readHeader(reader, solutionKey) {
        const globalChecksum = reader.readUInt16();
        reader.seek(constants_1.ACROSS_AND_DOWN_STRING.length, { current: true });
        // TODO: validate checksums
        // header checksum
        reader.readUInt16();
        // magic checksum
        reader.readValues(constants_1.MAGIC_CHECKSUM_BYTE_LENGTH);
        const version = reader.readString();
        // unknown field 1
        reader.readValues(constants_1.UNKNOWN1_BYTE_LENGTH);
        // scrambled checksum
        reader.readUInt16();
        // unknown field 2
        reader.readValues(constants_1.UNKNOWN2_BYTE_LENGTH);
        const width = reader.readUInt8();
        const height = reader.readUInt8();
        const numberOfClues = reader.readUInt16();
        const puzzleType = reader.readUInt16();
        const solutionState = reader.readUInt16();
        if (solutionState === common_1.SolutionState.Locked && !solutionKey) {
            throw new Error("Puzzle solution is locked and no solutionKey option was provided");
        }
        return {
            version,
            width,
            height,
            numberOfClues,
            puzzleType,
            solutionState,
        };
    }
}
exports.default = PUZParser;
//# sourceMappingURL=puz.js.map