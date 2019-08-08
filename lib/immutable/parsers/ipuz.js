"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ipuz_1 = __importDefault(require("../../parsers/ipuz"));
const utils_1 = require("../utils");
class IPUZParser extends ipuz_1.default {
    parse(input) {
        return super.parse(input, {
            converter: utils_1.toImmutable,
        });
    }
    generate(puzzle) {
        return super.generate(puzzle, {
            preprocessor: utils_1.toMutable,
        });
    }
}
exports.default = IPUZParser;
//# sourceMappingURL=ipuz.js.map