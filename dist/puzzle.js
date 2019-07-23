"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const reduce_1 = __importDefault(require("lodash/reduce"));
const base_puzzle_1 = __importDefault(require("./base-puzzle"));
/**
 * Represents a puzzle object
 */
class Puzzle extends base_puzzle_1.default {
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
    info, 
    /**
     * Extra, possibly implementation-specific information about the puzzle,
     * such as timer information
     */
    extensions, }) {
        super({
            grid,
            clues,
            userSolution,
            info,
            extensions,
        });
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
            userSolution: this.userSolution.map((row) => row.map((cell) => cell // Values in userSolution are just strings
            )),
            info: Object.assign({}, this.info),
            extensions: JSON.parse(JSON.stringify(this.extensions)),
        });
    }
}
exports.default = Puzzle;
//# sourceMappingURL=puzzle.js.map