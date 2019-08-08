"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jpz_1 = __importDefault(require("../../parsers/jpz"));
const utils_1 = require("../utils");
class JPZParser extends jpz_1.default {
    parse(path) {
        return super.parse(path, {
            converter: utils_1.toImmutable,
        });
    }
    generate(puzzle) {
        return super.generate(puzzle, {
            preprocessor: utils_1.toMutable,
        });
    }
}
exports.default = JPZParser;
//# sourceMappingURL=jpz.js.map