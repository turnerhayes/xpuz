"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puz_1 = __importDefault(require("../../parsers/puz"));
const utils_1 = require("../utils");
class PUZParser extends puz_1.default {
    parse(path, options = {}) {
        return super.parse(path, {
            ...options,
            converter: utils_1.toImmutable,
        });
    }
}
exports.default = PUZParser;
//# sourceMappingURL=puz.js.map