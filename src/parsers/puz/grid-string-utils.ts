import zip from "lodash/zip";

import {
  ATOZ,
  BLOCK_CELL_VALUE,
  BLOCK_CELL_VALUE_REGEX,
  PUZZLE_KEY_LENGTH,
} from "./constants";

export const padStart = (str: string, length: number, padChar: string): string => {
  return (new Array(length).fill(padChar).join("") + str).substr(-1 * length);
};

const range = (to: number): undefined[] => [...new Array(to)];

export const transposeGrid = (
  gridString: string,
  width: number,
  height: number
): string => {
  // Chunk grid into chunks of size width
  const data = gridString.match(new RegExp(".{1," + width + "}", "g"));

  if (data === null) {
    throw new Error("Grid string invalid");
  }

  return range(width).map(
    (_, columnNumber) => range(height).map(
      // columns become rows, rows become columns
      // tslint:disable-next-line:no-shadowed-variable
      (_, rowNumber) => data[rowNumber][columnNumber]
    ).join("")
  ).join("");
};

export const restoreSolution = (s: string, t: string) => {
  /*
  s is the source string, it can contain '.'
  t is the target, it's smaller than s by the number of '.'s in s

  Each char in s is replaced by the corresponding
  char in t, jumping over '.'s in s.

  >>> restore('ABC.DEF', 'XYZABC')
  'XYZ.ABC'
  */

  const splitTarget = t.split("");

  return s.split("").reduce(
    (arr: string[], c) => {
      if (c === BLOCK_CELL_VALUE) {
        arr.push(c);
      } else {
        arr.push(splitTarget.shift() as string);
      }

      return arr;
    },
    []
  ).join("");
};

export const shift = (str: string, key: string|number[]): string => {
  return str.split("").map(
    (c, index) => {
      let letterIndex = (ATOZ.indexOf(c) + Number(key[index % key.length])) % ATOZ.length;

      if (letterIndex < 0) {
        letterIndex = ATOZ.length + letterIndex;
      }

      return ATOZ[letterIndex];
    }
  ).join("");
};

export const unshift = (str: string, key: string): string => {
  return shift(
    str,
    Array.from(key).map((k) => -k)
  );
};

export const everyOther = (str: string): string => {
  return str.split("").reduce(
    (arr: string[], char: string, index: number) => {
      // eslint-disable-next-line no-magic-numbers
      if (index % 2 === 0) {
        arr.push(char);
      }

      return arr;
    },
    []
  ).join("");
};

export const unshuffle = (str: string): string => {
  return everyOther(str.substring(1)) + everyOther(str);
};

const shuffle = (str: string): string => {
  // eslint-disable-next-line no-magic-numbers
  const mid = Math.floor(str.length / 2);

  return zip(
    str.substring(mid).split(""),
    str.substring(0, mid).split("")
  ).reduce(
    (arr: string[], chars) => {
      if (chars[0] === undefined || chars[1] === undefined) {
        return arr;
      }

      arr.push(chars[0] + chars[1]);

      return arr;
    },
    []
  // eslint-disable-next-line no-magic-numbers
  ).join("") + (str.length % 2 ? str[str.length - 1] : "");
};

export const unscrambleString = (str: string, key: string): string => {
  const len = str.length;

  padStart(key, PUZZLE_KEY_LENGTH, "0").split("").reverse().forEach(
    (k) => {
      str = unshuffle(str);
      str = str.substring(len - Number(k)) + str.substring(0, len - Number(k));
      str = unshift(str, key);
    }
  );

  return str;
};

export const scrambleString = (str: string, key: string): string => {
  /*
  str is the puzzle's solution in column-major order, omitting black squares:
  i.e. if the puzzle is:
    C A T
    # # A
    # # R
  solution is CATAR

  Key is a 4-digit number in the range 1000 <= key <= 9999

  */

  Array.from(padStart(key, PUZZLE_KEY_LENGTH, "0")).forEach(
    (k) => {
      str = shift(str, key);
      str = str.substring(Number(k)) + str.substring(0, Number(k));
      str = shuffle(str);
    }
  );

  return str;
};
