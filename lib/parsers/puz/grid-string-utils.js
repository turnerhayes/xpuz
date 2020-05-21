"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zip_1 = __importDefault(require("lodash/zip"));
const constants_1 = require("./constants");
exports.padStart = (str, length, padChar) => {
    return (new Array(length).fill(padChar).join("") + str).substr(-1 * length);
};
const range = (to) => [...new Array(to)];
exports.transposeGrid = (gridString, width, height) => {
    // Chunk grid into chunks of size width
    const data = gridString.match(new RegExp(".{1," + width + "}", "g"));
    if (data === null) {
        throw new Error("Grid string invalid");
    }
    return range(width).map((_, columnNumber) => range(height).map(
    // columns become rows, rows become columns
    // tslint:disable-next-line:no-shadowed-variable
    (_, rowNumber) => data[rowNumber][columnNumber]).join("")).join("");
};
exports.restoreSolution = (s, t) => {
    /*
    s is the source string, it can contain '.'
    t is the target, it's smaller than s by the number of '.'s in s
  
    Each char in s is replaced by the corresponding
    char in t, jumping over '.'s in s.
  
    >>> restore('ABC.DEF', 'XYZABC')
    'XYZ.ABC'
    */
    const splitTarget = t.split("");
    return s.split("").reduce((arr, c) => {
        if (c === constants_1.BLOCK_CELL_VALUE) {
            arr.push(c);
        }
        else {
            arr.push(splitTarget.shift());
        }
        return arr;
    }, []).join("");
};
exports.shift = (str, key) => {
    return str.split("").map((c, index) => {
        let letterIndex = (constants_1.ATOZ.indexOf(c) + Number(key[index % key.length])) % constants_1.ATOZ.length;
        if (letterIndex < 0) {
            letterIndex = constants_1.ATOZ.length + letterIndex;
        }
        return constants_1.ATOZ[letterIndex];
    }).join("");
};
exports.unshift = (str, key) => {
    return exports.shift(str, Array.from(key).map((k) => -k));
};
exports.everyOther = (str) => {
    return str.split("").reduce((arr, char, index) => {
        // eslint-disable-next-line no-magic-numbers
        if (index % 2 === 0) {
            arr.push(char);
        }
        return arr;
    }, []).join("");
};
exports.unshuffle = (str) => {
    return exports.everyOther(str.substring(1)) + exports.everyOther(str);
};
const shuffle = (str) => {
    // eslint-disable-next-line no-magic-numbers
    const mid = Math.floor(str.length / 2);
    return zip_1.default(str.substring(mid).split(""), str.substring(0, mid).split("")).reduce((arr, chars) => {
        if (chars[0] === undefined || chars[1] === undefined) {
            return arr;
        }
        arr.push(chars[0] + chars[1]);
        return arr;
    }, []
    // eslint-disable-next-line no-magic-numbers
    ).join("") + (str.length % 2 ? str[str.length - 1] : "");
};
exports.unscrambleString = (str, key) => {
    const len = str.length;
    exports.padStart(key, constants_1.PUZZLE_KEY_LENGTH, "0").split("").reverse().forEach((k) => {
        str = exports.unshuffle(str);
        str = str.substring(len - Number(k)) + str.substring(0, len - Number(k));
        str = exports.unshift(str, key);
    });
    return str;
};
exports.scrambleString = (str, key) => {
    /*
    str is the puzzle's solution in column-major order, omitting black squares:
    i.e. if the puzzle is:
      C A T
      # # A
      # # R
    solution is CATAR
  
    Key is a 4-digit number in the range 1000 <= key <= 9999
  
    */
    Array.from(exports.padStart(key, constants_1.PUZZLE_KEY_LENGTH, "0")).forEach((k) => {
        str = exports.shift(str, key);
        str = str.substring(Number(k)) + str.substring(0, Number(k));
        str = shuffle(str);
    });
    return str;
};
//# sourceMappingURL=grid-string-utils.js.map