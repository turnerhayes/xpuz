"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getWidthAndHeight = (grid, sizeOf, get) => {
    const height = sizeOf(grid);
    let width = 0;
    if (height > 0) {
        // Assume that all rows are the same width
        width = sizeOf(get([0]));
    }
    return { width, height };
};
/**
 * Finds which across and down clues a grid cell is a member of.
 *
 * @return {{across: ?number, down: ?number}} the clue numbers for the clues
 * that contain this cell (one or both of `across` and `down` keys may be
 * populated)
 */
exports.findContainingClues = ({ grid, 
/**
 * The index of the row on which the cell occurs
 */
rowIndex, 
/**
 * The index of the column on which the cell occurs
 */
columnIndex, get, sizeOf, width, height, }) => {
    const containingClues = {};
    if (width === undefined || height === undefined) {
        if (!sizeOf) {
            throw new Error("No width/height specified, and no sizeOf function");
        }
        ({ width, height } = getWidthAndHeight(grid, sizeOf, get));
    }
    const clueNumber = get([
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
        (columnIndex === 0 || get([rowIndex, columnIndex - 1, "isBlockCell"])) &&
            // There is at least one fillable cell to the right
            (columnIndex < width - 1 && !get([rowIndex, columnIndex + 1, "isBlockCell"]))) {
            containingClues.across = clueNumber;
        }
        else if (
        // There is at least one fillable cell below this
        rowIndex < height - 1 && !get([rowIndex + 1, columnIndex, "isBlockCell"])) {
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
            !get([rowIndex, columnIndex + 1, "isBlockCell"])) {
            containingClues.across = clueNumber;
        }
        else {
            for (let i = columnIndex - 1; i >= 0; i--) {
                if (get([rowIndex, i, "isBlockCell"])) {
                    break;
                }
                if (
                // There is at least one fillable cell to the right
                i < width - 1 && !get([rowIndex, i + 1, "isBlockCell"])) {
                    containingClues.across = get([rowIndex, i, "clueNumber"]);
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
            !get([rowIndex + 1, columnIndex, "isBlockCell"])) {
            containingClues.down = clueNumber;
        }
        else {
            for (let i = rowIndex; i >= 0; i--) {
                if (get([i, columnIndex, "isBlockCell"])) {
                    break;
                }
                if (
                // There is at least one fillable cell below it
                i < height - 1 && !get([i + 1, columnIndex, "isBlockCell"])) {
                    containingClues.down = get([i, columnIndex, "clueNumber"]);
                }
            }
        }
    }
    return containingClues;
};
/**
 * Determines whether a cell in the grid is at the start of a down or across clue (or
 * both), and thus should be given a clue number.
 *
 * @return {boolean} whether or not the specified cell should be given a clue number
 */
exports.hasClueNumber = ({ grid, 
/**
 * The index of the row on which the cell occurs
 */
rowIndex, 
/**
 * The index of the column on which the cell occurs
 */
columnIndex, get, sizeOf, width, height, }) => {
    if (get([rowIndex, columnIndex, "isBlockCell"])) {
        return false;
    }
    if (width === undefined || height === undefined) {
        if (!sizeOf) {
            throw new Error("No width/height specified, and no sizeOf function");
        }
        ({ width, height } = getWidthAndHeight(grid, sizeOf, get));
    }
    if ((columnIndex === 0 || get([rowIndex, columnIndex - 1, "isBlockCell"])) &&
        (columnIndex + 1 < width && !get([rowIndex, columnIndex + 1, "isBlockCell"]))) {
        // This cell is adjacent to the puzzle edge or a block cell on the left,
        // and has at least one input cell to its right--this cell starts an across clue
        return true;
    }
    if ((rowIndex === 0 || get([rowIndex - 1, columnIndex, "isBlockCell"])) &&
        (rowIndex + 1 < height && !get([rowIndex + 1, columnIndex, "isBlockCell"]))) {
        // This cell is adjacent to the puzzle edge or a block cell on the top,
        // and has at least one input cell below it--this cell starts a down clue
        return true;
    }
    return false;
};
/**
 * Updates the grid with the correct cell information (clue numbers, etc.)
 */
exports.processGrid = ({ grid, get, set, sizeOf, width, height, processValue, }) => {
    if (width === undefined || height === undefined) {
        ({ width, height } = getWidthAndHeight(grid, sizeOf, get));
    }
    let clueNumber = 0;
    for (let rowIndex = 0; rowIndex < height; rowIndex++) {
        for (let columnIndex = 0; columnIndex < width; columnIndex++) {
            if (get([rowIndex, columnIndex, "isBlockCell"])) {
                grid = set([rowIndex, columnIndex, "clueNumber"], undefined);
                grid = set([rowIndex, columnIndex, "containingClues"], undefined);
                continue;
            }
            const cellClueNumber = exports.hasClueNumber({
                grid,
                rowIndex,
                columnIndex,
                width,
                height,
                get,
                sizeOf,
            }) ?
                ++clueNumber :
                undefined;
            grid = set([rowIndex, columnIndex, "clueNumber"], cellClueNumber);
            let containingClues = exports.findContainingClues({
                grid,
                width,
                height,
                rowIndex,
                columnIndex,
                get,
                sizeOf,
            });
            if (processValue) {
                containingClues = processValue(containingClues);
            }
            grid = set([rowIndex, columnIndex, "containingClues"], containingClues);
        }
    }
    return grid;
};
//# sourceMappingURL=puzzle-utils.js.map