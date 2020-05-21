"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hash_it_1 = __importDefault(require("hash-it"));
const get_1 = __importDefault(require("lodash/get"));
const isEqual_1 = __importDefault(require("lodash/isEqual"));
const reduce_1 = __importDefault(require("lodash/reduce"));
const set_1 = __importDefault(require("lodash/set"));
const size_1 = __importDefault(require("lodash/size"));
const puzzle_utils_1 = require("./puzzle-utils");
/**
 * Represents a puzzle object
 */
class Puzzle {
    constructor({ grid, 
    /**
     * A list of clues for across and down, with each collection having the
     * key as the clue number and the value as the clue text (e.g.
     * `{across: { 3: "some clue" }}`)
     */
    clues, 
    /**
     * The currently filled in guesses of the user stored with this puzzle
     * instance. Two dimensional array with the same dimensions as `grid`,
     * where each cell is either a string or `null` (for block cells)
     */
    userSolution, 
    /**
     * Information about the puzzle
     */
    info, }) {
        this.getInGrid = (path) => {
            return get_1.default(this.grid, path);
        };
        this.setInGrid = (path, value) => {
            return set_1.default(this.grid, path, value);
        };
        this.grid = grid || [];
        this.grid = puzzle_utils_1.processGrid({
            grid: this.grid,
            get: this.getInGrid,
            set: this.setInGrid,
            sizeOf: size_1.default,
        });
        this.clues = clues || {
            across: {},
            down: {},
        };
        info = info || {};
        this.info = {
            title: info.title || "",
            author: info.author || "",
            copyright: info.copyright || "",
            publisher: info.publisher || "",
            difficulty: info.difficulty || "",
            intro: info.intro || "",
            formatExtra: info.formatExtra,
        };
        this.userSolution = userSolution || grid.map((row) => row.map((cell) => cell.isBlockCell ? null : ""));
    }
    findContainingClues({ rowIndex, columnIndex, }) {
        return puzzle_utils_1.findContainingClues({
            grid: this.grid,
            rowIndex,
            columnIndex,
            get: this.getInGrid,
            sizeOf: size_1.default,
        });
    }
    processGrid() {
        return puzzle_utils_1.processGrid({
            grid: this.grid,
            get: this.getInGrid,
            set: this.setInGrid,
            sizeOf: size_1.default,
        });
    }
    updateGrid() {
        this.grid = puzzle_utils_1.processGrid({
            grid: this.grid,
            get: this.getInGrid,
            set: this.setInGrid,
            sizeOf: size_1.default,
        });
    }
    hashCode() {
        return hash_it_1.default(this);
    }
    toJSON() {
        return {
            grid: this.grid,
            clues: this.clues,
            userSolution: this.userSolution,
            info: this.info,
        };
    }
    toString() {
        return "Puzzle";
    }
    /**
     * Returns a deep copy of this puzzle.
     */
    clone() {
        return new Puzzle({
            grid: this.grid.map((row) => row.map((cell) => Object.assign({}, cell) // Clone (shallow) cell object
            )),
            clues: {
                across: reduce_1.default(this.clues.across, (cloned, clue, clueNumber) => {
                    cloned[clueNumber] = clue;
                    return cloned;
                }, {}),
                down: reduce_1.default(this.clues.down, (cloned, clue, clueNumber) => {
                    cloned[clueNumber] = clue;
                    return cloned;
                }, {}),
            },
            userSolution: this.userSolution.map((row) => row.map((cell) => cell)),
            info: Object.assign({}, this.info),
        });
    }
    equals(other) {
        if (!(other instanceof Puzzle)) {
            return false;
        }
        return isEqual_1.default(this.toJSON(), other.toJSON());
    }
}
exports.default = Puzzle;
//# sourceMappingURL=puzzle.js.map