"use strict";
/**
 * IPUZ file parser.
 *
 * @module xpuz/parsers/ipuz
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const get_1 = __importDefault(require("lodash/get"));
const isObject_1 = __importDefault(require("lodash/isObject"));
const puzzle_1 = __importDefault(require("../puzzle"));
const read_file_1 = __importDefault(require("./read-file"));
const BLOCK_VALUE = "#";
function _checkDimensions(puzzle) {
    const errors = [];
    const maxCellWidth = Math.max(...puzzle.puzzle.map((row) => row.length));
    const numRows = puzzle.puzzle.length;
    if (maxCellWidth > puzzle.dimensions.width) {
        errors.push(`Too many puzzle cells (${maxCellWidth}) for puzzle width (${puzzle.dimensions.width})`);
    }
    if (numRows > puzzle.dimensions.height) {
        errors.push(`Too many puzzle cells (${numRows}) for puzzle height (${puzzle.dimensions.height})`);
    }
    return errors;
}
function _getClueNumber(cell) {
    return isObject_1.default(cell) ?
        cell.cell :
        cell;
}
function _addClue(obj, clue) {
    obj[clue[0]] = clue[1];
    return obj;
}
function _convertPuzzle(ipuz) {
    const puzzle = new puzzle_1.default({
        info: {
            title: ipuz.title,
            author: ipuz.author,
            copyright: ipuz.copyright,
            publisher: ipuz.publisher,
            difficulty: ipuz.difficulty,
            intro: ipuz.intro,
        },
        grid: ipuz.puzzle.map((row) => row.map((cell) => {
            if (cell === BLOCK_VALUE) {
                return {
                    isBlockCell: true,
                };
            }
            return {
                clueNumber: _getClueNumber(cell),
                backgroundShape: get_1.default(cell, "style.shapebg"),
            };
        })),
        clues: {
            across: ipuz.clues.Across.reduce((clues, clue) => _addClue(clues, clue), {}),
            down: ipuz.clues.Down.reduce((clues, clue) => _addClue(clues, clue), {}),
        }
    });
    return puzzle;
}
function _validatePuzzle(puzzle) {
    const errors = [];
    if (!puzzle.dimensions) {
        errors.push("Puzzle is missing 'dimensions' key");
    }
    if (puzzle.puzzle) {
        errors.push(..._checkDimensions(puzzle));
    }
    else {
        errors.push("Puzzle is missing 'puzzle' key");
    }
    return errors.length === 0 ? undefined : errors;
}
async function _parsePuzzle(puzzle) {
    let parsedPuzzle;
    if (typeof puzzle === "string") {
        // path to puzzle
        try {
            const fileContent = await read_file_1.default(puzzle);
            parsedPuzzle = JSON.parse(fileContent.toString());
        }
        catch (ex) {
            throw new Error(`Unable to read IPUZ puzzle from file ${puzzle}: ${ex.message}`);
        }
    }
    else if (isObject_1.default(puzzle)) {
        parsedPuzzle = puzzle;
    }
    else {
        throw new Error("parse() expects either a path string or an object");
    }
    const errors = _validatePuzzle(parsedPuzzle);
    if (errors !== undefined) {
        throw new Error(`Invalid puzzle:\n\t${errors.join("\n\t")}`);
    }
    return _convertPuzzle(parsedPuzzle);
}
/**
 * Parser class for IPUZ-formatted puzzles
 */
class IPUZParser {
    /**
     * Parses a {@link Puzzle} from the input.
     */
    async parse(puzzle, options = {}) {
        const parsed = await _parsePuzzle(puzzle);
        if (options.converter) {
            return options.converter(parsed);
        }
        return parsed;
    }
    async generate(puzzle, options = {}) {
        throw new Error("Not implemented");
    }
}
exports.default = IPUZParser;
//# sourceMappingURL=ipuz.js.map