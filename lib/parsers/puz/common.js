"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PuzzleType;
(function (PuzzleType) {
    PuzzleType[PuzzleType["Normal"] = 1] = "Normal";
    PuzzleType[PuzzleType["Diagramless"] = 1025] = "Diagramless";
})(PuzzleType = exports.PuzzleType || (exports.PuzzleType = {}));
var SolutionState;
(function (SolutionState) {
    // solution is available in plaintext
    SolutionState[SolutionState["Unlocked"] = 0] = "Unlocked";
    // solution is locked (scrambled) with a key
    SolutionState[SolutionState["Locked"] = 4] = "Locked";
})(SolutionState = exports.SolutionState || (exports.SolutionState = {}));
//# sourceMappingURL=common.js.map