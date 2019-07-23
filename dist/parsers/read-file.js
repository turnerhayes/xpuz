"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
// fs is stubbed out for browser builds
exports.default = fs_1.default.readFile ?
    (path, options) => new Promise((resolve, reject) => fs_1.default.readFile(path, options, (err, data) => {
        if (err) {
            return reject(err);
        }
        return resolve(data);
    })) : () => Promise.resolve("");
//# sourceMappingURL=read-file.js.map