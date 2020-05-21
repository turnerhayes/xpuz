"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puzzle_1 = __importDefault(require("../puzzle"));
const puzzle_2 = __importDefault(require("./puzzle"));
exports.toImmutable = (puzzle) => {
    return new puzzle_2.default({
        grid: puzzle.grid,
        clues: puzzle.clues,
        userSolution: puzzle.userSolution,
        info: puzzle.info,
    });
};
exports.toMutable = (immutablePuzzle) => {
    return new puzzle_1.default({
        grid: immutablePuzzle.grid.toJS(),
        clues: immutablePuzzle.clues.toJS(),
        userSolution: immutablePuzzle.userSolution.toJS(),
        info: immutablePuzzle.info.toJS(),
    });
};
//# sourceMappingURL=utils.js.map