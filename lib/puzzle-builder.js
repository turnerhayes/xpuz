"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const each_1 = __importDefault(require("lodash/each"));
const puzzle_1 = __importDefault(require("./puzzle"));
class PuzzleBuilder {
    constructor() {
        this.grid = [];
        this.clues = {
            across: {},
            down: {},
        };
        this.clueArrays = {
            across: [],
            down: [],
        };
    }
    addRow() {
        this.closeRow();
        this.openRow = [];
        return this;
    }
    addCell() {
        if (!this.openRow) {
            throw new Error("`addCell` called without an open row");
        }
        return this._addCell();
    }
    solution(solutionLetter) {
        if (!this.cell) {
            throw new Error("`solution` called without a cell");
        }
        this.cell.solution = solutionLetter;
        return this;
    }
    addBlockCell() {
        if (!this.openRow) {
            throw new Error("`addBlockCell` called without an open row");
        }
        return this._addCell({
            isBlockCell: true
        });
    }
    addAcrossClues(clues) {
        each_1.default(clues, (clueText, clueNumber) => {
            this.clues.across[clueNumber] = clueText;
        });
        return this;
    }
    addAcrossClue(clueNumber, clueText) {
        const clues = {};
        clues[clueNumber] = clueText;
        return this.addAcrossClues(clues);
    }
    addDownClues(clues) {
        each_1.default(clues, (clueText, clueNumber) => {
            this.clues.down[clueNumber] = clueText;
        });
        return this;
    }
    addDownClue(clueNumber, clueText) {
        const clues = {};
        clues[clueNumber] = clueText;
        return this.addDownClues(clues);
    }
    build() {
        this.closeRow();
        let maxRowLength = 0;
        each_1.default(this.grid, (row) => {
            if (row.length > maxRowLength) {
                maxRowLength = row.length;
            }
        });
        each_1.default(this.grid, (row) => {
            if (row.length < maxRowLength) {
                this.openRow = row;
                this.addBlocks(maxRowLength - row.length + 1);
            }
        });
        return new puzzle_1.default({
            grid: this.grid,
            clues: this.clues
        });
    }
    toString() {
        return "[object PuzzleBuilder]";
    }
    _addCell(options = {}) {
        this.closeCell();
        this.cell = options.isBlockCell ?
            { isBlockCell: true } :
            {};
        if (options.solution) {
            this.cell.solution = options.solution;
        }
        return this;
    }
    addBlocks(count) {
        for (let i = 0; i < count; i++) {
            this.addBlockCell();
        }
        return this;
    }
    closeRow() {
        if (!this.openRow) {
            return this;
        }
        this.closeCell();
        this.grid.push(this.openRow);
        this.openRow = undefined;
        return this;
    }
    closeCell() {
        if (!this.openRow || !this.cell) {
            return this;
        }
        this.openRow.push(this.cell);
        this.cell = undefined;
        return this;
    }
}
exports.default = PuzzleBuilder;
//# sourceMappingURL=puzzle-builder.js.map