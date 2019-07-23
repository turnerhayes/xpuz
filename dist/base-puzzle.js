"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hash_it_1 = __importDefault(require("hash-it"));
const isEqual_1 = __importDefault(require("lodash/isEqual"));
const get_1 = __importDefault(require("lodash/get"));
const set_1 = __importDefault(require("lodash/set"));
const size_1 = __importDefault(require("lodash/size"));
class BasePuzzle {
    constructor({ grid, clues, info, userSolution, extensions, }) {
        this.grid = grid || [];
        this.grid = this.processGrid();
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
        };
        this.userSolution = userSolution || grid.map((row) => row.map((cell) => cell.isBlockCell ? null : ""));
        this.extensions = extensions || {};
    }
    get(path) {
        return get_1.default(this.grid, path);
    }
    set(path, value) {
        return set_1.default(this.grid, path, value);
    }
    sizeOf(value) {
        return size_1.default(value);
    }
    get width() {
        return this.sizeOf(this.grid[0]);
    }
    get height() {
        return this.sizeOf(this.grid);
    }
    equals(other) {
        if (!(other instanceof BasePuzzle)) {
            return false;
        }
        return isEqual_1.default(this.grid, other.grid) &&
            isEqual_1.default(this.clues, other.clues) &&
            isEqual_1.default(this.userSolution, other.userSolution) &&
            isEqual_1.default(this.info, other.info) &&
            isEqual_1.default(this.extensions, other.extensions);
    }
    /**
     * Finds which across and down clues a grid cell is a member of.
     *
     * @param {number} args.rowIndex - the index of the row on which the cell occurs
     * @param {number} args.columnIndex - the index of the column on which the cell occurs
     *
     * @return {{across: ?number, down: ?number}} the clue numbers for the clues that contain this cell
     *	(one or both of `across` and `down` keys may be populated)
     */
    findContainingClues({ 
    /**
     * The index of the row on which the cell occurs
     */
    rowIndex, 
    /**
     * The index of the column on which the cell occurs
     */
    columnIndex, }) {
        const containingClues = {};
        const clueNumber = this.get([
            rowIndex,
            columnIndex,
            "clueNumber",
        ]);
        if (clueNumber !== undefined) {
            // This cell is a clue number cell--it defines either
            // its across clue number or its down clue number (or
            // both)
            if (
            // This is either at the left edge of the puzzle or
            // is bounded on the left by a block cell. This clue
            // number defines (at least) the cell's across clue number
            (columnIndex === 0 || this.get([rowIndex, columnIndex - 1, "isBlockCell"])) &&
                // There is at least one fillable cell to the right
                (columnIndex < this.width - 1 && !this.get([rowIndex, columnIndex + 1, "isBlockCell"]))) {
                containingClues.across = clueNumber;
            }
            else if (
            // There is at least one fillable cell below this
            rowIndex < this.height - 1 && !this.get([rowIndex + 1, columnIndex, "isBlockCell"])) {
                // At least one cell exists to the left of this cell; this
                // is not an across clue number. It must be a down clue number.
                containingClues.down = clueNumber;
            }
        }
        if (!containingClues.across) {
            // Haven't found the across clue number yet.
            // Look to the left until we find a block cell or the edge of
            // the puzzle
            if (
            // At the left edge of the puzzle and there's a clue number
            (columnIndex === 0 && clueNumber !== undefined) &&
                // There is at least one fillable cell to the right
                !this.get([rowIndex, columnIndex + 1, "isBlockCell"])) {
                containingClues.across = clueNumber;
            }
            else {
                for (let i = columnIndex - 1; i >= 0; i--) {
                    if (this.get([rowIndex, i, "isBlockCell"])) {
                        break;
                    }
                    if (
                    // There is at least one fillable cell to the right
                    i < this.width - 1 && !this.get([rowIndex, i + 1, "isBlockCell"])) {
                        containingClues.across = this.get([rowIndex, i, "clueNumber"]);
                    }
                }
            }
        }
        if (!containingClues.down) {
            // Look at cells in other rows at the same index until we find a
            // cell with a clue number
            if (
            // At the top of the puzzle and there is a clue number
            (rowIndex === 0 && clueNumber !== undefined) &&
                // There is at least one fillable cell below it
                !this.get([rowIndex + 1, columnIndex, "isBlockCell"])) {
                containingClues.down = clueNumber;
            }
            else {
                for (let i = rowIndex; i >= 0; i--) {
                    if (this.get([i, columnIndex, "isBlockCell"])) {
                        break;
                    }
                    if (
                    // There is at least one fillable cell below it
                    i < this.height - 1 && !this.get([i + 1, columnIndex, "isBlockCell"])) {
                        containingClues.down = this.get([i, columnIndex, "clueNumber"]);
                    }
                }
            }
        }
        return containingClues;
    }
    /**
     * Determines whether a cell in the grid is at the start of a down or across clue (or
     * both), and thus should be given a clue number.
     *
     * @return {boolean} whether or not the specified cell should be given a clue number
     */
    hasClueNumber({ 
    /**
     * The index of the row on which the cell occurs
     */
    rowIndex, 
    /**
     * The index of the column on which the cell occurs
     */
    columnIndex, }) {
        if (this.get([rowIndex, columnIndex, "isBlockCell"])) {
            return undefined;
        }
        if ((columnIndex === 0 || this.get([rowIndex, columnIndex - 1, "isBlockCell"])) &&
            (columnIndex + 1 < this.width && !this.get([rowIndex, columnIndex + 1, "isBlockCell"]))) {
            // This cell is adjacent to the puzzle edge or a block cell on the left,
            // and has at least one input cell to its right--this cell starts an across clue
            return true;
        }
        if ((rowIndex === 0 || this.get([rowIndex - 1, columnIndex, "isBlockCell"])) &&
            (rowIndex + 1 < this.height && !this.get([rowIndex + 1, columnIndex, "isBlockCell"]))) {
            // This cell is adjacent to the puzzle edge or a block cell on the top,
            // and has at least one input cell below it--this cell starts a down clue
            return true;
        }
        return false;
    }
    /**
     * Returns a hash code integer for this object.
     *
     * @return {number} the object's hash code
     */
    hashCode() {
        return hash_it_1.default(this);
    }
    /**
     * Returns this puzzle as a plain Javascript object, suitable for serializing to JSON.
     *
     * @returns {object} object representation of this puzzle object
     */
    toJSON() {
        return {
            grid: this.grid,
            clues: this.clues,
            userSolution: this.userSolution,
            info: this.info,
            extensions: this.extensions,
        };
    }
    /**
     * Updates the cells of the grid to have accurate clue numbering and `containingClues` properties.
      */
    updateGrid(grid = this.grid) {
        return set_1.default(this, ["grid"], this.processGrid());
    }
    /**
     * Sets the value of the specified cell and ensures that all cell information is kept up-to-date.
     *
     * @return {Puzzle|ImmutablePuzzle} the puzzle, with the updated cell information (return type is whatever
     *	type `this` is)
     */
    updateCell(
    /**
     * The column index of the cell to set
     */
    columnIndex, 
    /**
     * The row index of the cell to set
     */
    rowIndex, 
    /**
     * The cell information to set (this replaces the existing cell
     * information)
     */
    cell) {
        const grid = this.set([rowIndex, columnIndex], cell);
        return this.updateGrid();
    }
    /**
     * Updates the grid with the correct cell information (clue numbers, etc.)
     */
    processGrid() {
        let clueNumber = 0;
        for (let rowIndex = 0; rowIndex < this.height; rowIndex++) {
            for (let columnIndex = 0; columnIndex < this.width; columnIndex++) {
                if (this.get([rowIndex, columnIndex, "isBlockCell"])) {
                    this.set([rowIndex, columnIndex, "clueNumber"], undefined);
                    this.set([rowIndex, columnIndex, "containingClues"], undefined);
                    continue;
                }
                const cellClueNumber = this.hasClueNumber({
                    rowIndex,
                    columnIndex,
                }) ?
                    ++clueNumber :
                    undefined;
                this.set([rowIndex, columnIndex, "clueNumber"], cellClueNumber);
                this.set([rowIndex, columnIndex, "containingClues"], this.findContainingClues({
                    rowIndex,
                    columnIndex,
                }));
            }
        }
        return this.grid;
    }
}
exports.default = BasePuzzle;
//# sourceMappingURL=base-puzzle.js.map