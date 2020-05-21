"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const immutable_1 = require("immutable");
const puzzle_utils_1 = require("../puzzle-utils");
const infoSchema = {
    title: "",
    author: "",
    publisher: "",
    copyright: "",
    difficulty: "",
    intro: "",
    formatExtra: undefined,
};
const DIRECTIONS = ["across", "down"];
class PuzzleInfo extends immutable_1.Record(infoSchema, "PuzzleInfo") {
}
exports.PuzzleInfo = PuzzleInfo;
const schema = {
    grid: immutable_1.List(),
    clues: immutable_1.Map({
        across: immutable_1.OrderedMap(),
        down: immutable_1.OrderedMap(),
    }),
    userSolution: immutable_1.List(),
    info: new PuzzleInfo(),
};
const immutableProcessGrid = (grid) => {
    return grid.withMutations((gridWithMutations) => puzzle_utils_1.processGrid({
        grid: gridWithMutations,
        get: gridWithMutations.getIn.bind(gridWithMutations),
        set: gridWithMutations.setIn.bind(gridWithMutations),
        sizeOf: (items) => items.size,
        width: grid.size,
        height: grid.get(0, immutable_1.List()).size,
        processValue: immutable_1.fromJS,
    }));
};
/**
 * Represents an immutable version of {@link xpuz.Puzzle|Puzzle}.
 *
 * @extends Record
 * @memberof xpuz
 *
 * @mixes xpuz.PuzzleMixin
 */
class ImmutablePuzzle extends immutable_1.Record(schema, "ImmutablePuzzle") {
    /**
     * @param args.grid - the grid for the puzzle
     * @param args.clues - the
     * puzzle clues
     * @param  [args.userSolution] - the guesses that the user has entered for
     * this puzzle, as a two-dimensional array of array of strings with the same
     * dimensions as the `grid` where each cell is either a string with the
     * user's input or `null` if it corresponds to a block cell in the grid
     * @param [args.info] - information about the puzzle
     */
    constructor({ grid, clues, userSolution, info, }) {
        if (!(info instanceof PuzzleInfo)) {
            info = new PuzzleInfo(info);
        }
        grid = grid ? immutableProcessGrid(immutable_1.fromJS(grid)) : immutable_1.List();
        const args = {
            info: info,
            grid,
            userSolution: userSolution ?
                immutable_1.fromJS(userSolution) :
                grid.map((row) => row.map((cell) => cell.isBlockCell ? null : "")),
        };
        if (clues) {
            args.clues = immutable_1.Map.isMap(clues) ?
                clues :
                immutable_1.Map(DIRECTIONS.map((direction) => [
                    direction,
                    immutable_1.OrderedMap(Object.keys(clues[direction]).sort((a, b) => Number(a) - Number(b)).map((clueNumber) => [Number(clueNumber), clues[direction][clueNumber]]))
                ]));
        }
        super(args);
    }
    processGrid() {
        return immutableProcessGrid(this.grid);
    }
    updateGrid() {
        return this.set("grid", this.processGrid());
    }
    updateCell(column, row, cell) {
        return this.setIn(["grid", row, column], immutable_1.fromJS(cell)).updateGrid();
    }
    toJSON() {
        return this.toJS();
    }
    toString() {
        return "ImmutablePuzzle";
    }
}
exports.default = ImmutablePuzzle;
//# sourceMappingURL=puzzle.js.map