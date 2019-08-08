"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ipuz_1 = __importDefault(require("./parsers/ipuz"));
const puz_1 = __importDefault(require("./parsers/puz"));
const jpz_1 = __importDefault(require("./parsers/jpz"));
const puzzle_1 = __importDefault(require("./puzzle"));
exports.Puzzle = puzzle_1.default;
const Utils = __importStar(require("./utils"));
exports.Utils = Utils;
exports.Parsers = {
    IPUZ: ipuz_1.default,
    PUZ: puz_1.default,
    JPZ: jpz_1.default,
};
//# sourceMappingURL=index.js.map