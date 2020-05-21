"use strict";
/**
 * XPuz index
 *
 * Exports the public API for the XPuz module
 *
 * @memberof xpuz
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ipuz_1 = __importDefault(require("./parsers/ipuz"));
const jpz_1 = __importDefault(require("./parsers/jpz"));
const puz_1 = __importDefault(require("./parsers/puz"));
const puzzle_1 = __importDefault(require("./puzzle"));
exports.Puzzle = puzzle_1.default;
/**
 * Puzzle file parser constructors
 */
exports.Parsers = {
    /**
     * .ipuz file parser
     */
    IPUZ: ipuz_1.default,
    /**
     * .puz file parser
     */
    PUZ: puz_1.default,
    /**
     * .jpz file parser
     */
    JPZ: jpz_1.default,
};
//# sourceMappingURL=index.js.map