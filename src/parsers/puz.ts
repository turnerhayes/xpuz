import chunk from "lodash/chunk";
import flatten from "lodash/flatten";
import compact from "lodash/compact";
import findKey from "lodash/findKey";
import iconv from "iconv-lite";

import Puzzle from "../puzzle";
import ImmutablePuzzle from "../immutable/puzzle";
import PUZReader from "./puz/puz-reader";
import { IPuzzleConstructorArgs, IPuzzleClues } from "../puzzle-utils";
import { IInputCell, BlockGridCell, GridCell, Grid } from "../Grid";
import {
  PuzzleType,
  SolutionState,
  IHeaderData,
  ExtensionName,
} from "./puz/common";
import {
  transposeGrid,
  restoreSolution,
  scrambleString,
  unscrambleString,
  padStart,
} from "./puz/grid-string-utils";
import {
  HEADER_BUFFER_LENGTH,
  CHECKSUM_BUFFER_LENGTH,
  NUMBER_OF_CLUES_BUFFER_LENGTH,
  PUZZLE_TYPE_BUFFER_LENGTH,
  SOLUTION_STATE_BUFFER_LENGTH,
  HEADER_CHECKSUM_BYTE_LENGTH,
  MAGIC_CHECKSUM_BYTE_LENGTH,
  UNKNOWN1_BYTE_LENGTH,
  UNKNOWN2_BYTE_LENGTH,
  EXTENSION_HEADER_LENGTH,
  EXTENSION_NAME_LENGTH,
  EXTENSION_LENGTH_BUFFER_LENGTH,
  BLOCK_CELL_VALUE,
  BLOCK_CELL_VALUE_REGEX,
  ACROSS_AND_DOWN_STRING,
  MINIMUM_KEY_VALUE,
  MAXIMUM_KEY_VALUE,
} from "./puz/constants";
import { generate } from "./puz/generator";

export type PuzzleContent = string|Buffer|ArrayBufferLike;

interface IExtensionInfo {
	name: ExtensionName;
	checksum: number;
	data: Buffer;
	[key: string]: any,
}

type ExtensionMap = {
	[name: string]: IExtensionInfo,
}

export interface ITimingState {
  elapsed: number;
  running: boolean;
}

export interface ICurrentCellStates {
  PreviouslyIncorrect: boolean,
  CurrentlyIncorrect: boolean,
  AnswerGiven: boolean,
  Circled: boolean,
}

export const enum CellStates {
	PreviouslyIncorrect = 0x10,
	CurrentlyIncorrect = 0x20,
	AnswerGiven = 0x40,
	Circled = 0x80,
}


/**
 * Parser class for PUZ-formatted puzzles.
 *
 * @constructor
 */
class PUZParser<T extends Puzzle|ImmutablePuzzle = Puzzle> {
	/**
	 * Parses a file in .puz format into a {@link Puzzle} object.
	 * 
	 * If the puzzle is not locked and an `options.solutionKey` was specified,
	 * the solutionKey will be ignored.
	 *
	 * @throws if the puzzle is locked and an invalid (or no)
	 * `options.solutionKey` was provided
	 */
	async parse(
		/**
		 * the .puz file to parse, either as a file path or a {@link Buffer} or 
		 * {@link ArrayBuffer} containing the puzzle content
		 */
		path: PuzzleContent,
		options: {
      solutionKey?: string,
      converter?: (puzzle: Puzzle) => T,
    } = {}
	): Promise<T> {
		const puzzleData = await this.getPuzzleData(path, options.solutionKey);
    const puzzle = new Puzzle(puzzleData);

    if (options.converter) {
      return options.converter(puzzle);
    }

    return puzzle as T;
	}

	/**
	 * Given a {@link module:xpuz/puzzle~Puzzle|Puzzle} object, returns a {@link external:Buffer|Buffer}
	 * containing the puzzle in .puz format.
	 *
	 * @throws if `options.scrambled` is true but `options.solutionKey` is not a 4-digit integer
	 *	(between 1000 and 9999, inclusive).
	 */
	generate(
		puzzle: T,
		options: {
			/**
			 * If true, the puzzle's solution will be scrambled
       *
       * @deprecated ignored; will be scrambled if solutionKey is defined and non-empty
			 */
			scrambled?: boolean,
      solutionKey?: string,
		} = {}
	): Buffer  {
    const puzzleObj = puzzle.toJSON();
    
    return generate(puzzleObj, options.solutionKey);
  }

  private unscrambleSolution(
    {
      answer,
      width,
      height,
      key,
    }: {
      answer: string,
      width: number,
      height: number,
      key: string,
    },
  ): string {
    const transposed = transposeGrid(
      answer,
      width,
      height
    );

    const data = restoreSolution(
      transposed,
      unscrambleString(
        transposed.replace(BLOCK_CELL_VALUE_REGEX, ""),
        key
      )
    );

    const result = transposeGrid(
      data,
      height,
      width
    );

    if (result === answer) {
      throw new Error("Unscrambled solution is the same as the scrambled solution; incorrect key?");
    }

    return result;
  }
  
  private async getPuzzleData(
    path: PuzzleContent,
    solutionKey?: string
  ): Promise<IPuzzleConstructorArgs> {
    const reader = new PUZReader(path);

    const header = this.readHeader(reader, solutionKey);

    const numberOfCells = header.width * header.height;

    const answer = reader.readString(numberOfCells);

    let unscrambledAnswer = answer;

    if (header.solutionState === SolutionState.Locked) {
      if (!solutionKey) {
        throw new Error("Attempted to unlock a puzzle without a key");
      }

      unscrambledAnswer = this.unscrambleSolution(
        {
          width: header.width,
          height: header.height,
          answer,
          key: solutionKey,
        },
      );
    }

    const userSolution = reader.readString(numberOfCells);

    const title = reader.readString();

    const author = reader.readString();

    const copyright = reader.readString();

    const clueList = this.readClues(reader, header.numberOfClues);

    const { grid, clues } = this.generateGridAndClues(
      unscrambledAnswer,
      clueList,
      header.width
    );

    const notes = reader.readString();

    const rawExtensions = this.parseExtensions(reader);

    const extensions: {
      timing?: ITimingState,
      cellStates?: ICurrentCellStates[],
    } = this.processExtensions(rawExtensions, grid);

    return {
      info: {
        author,
        title,
        copyright,
        intro: notes,
        formatExtra: {
          extensions,
          version: header.version,
        },
      },
      grid,
      clues,
      userSolution: this.unflattenSolution(userSolution, header.width),
    };
  }

  private parseExtensions(reader: PUZReader) {
    let remainingLength = reader.size() - reader.tell();

    const extensions: ExtensionMap = {};

    while (remainingLength >= EXTENSION_HEADER_LENGTH) {
      const name = reader.readString(
        EXTENSION_NAME_LENGTH
      ) as ExtensionName;

      const length = reader.readUInt16();

      const checksum = reader.readUInt16();

      // Include null byte at end
      const data = reader.readValues(length + 1)
        // Remove null byte at the end
        .slice(0, -1);

      extensions[name] = {
        name,
        data,
        checksum,
      };

      remainingLength = reader.size() - reader.tell();
    }

    return extensions;
  }

  private processExtensions(extensions: ExtensionMap, grid: Grid) {
    if (extensions.RTBL) {
      let rebusSolutionsString = iconv.decode(
        extensions.RTBL.data,
        PUZReader.ENCODING
      );

      // Strip and ending ";" so that the loop doesn't iterate an extra time
      // with an empty string
      if (rebusSolutionsString[rebusSolutionsString.length - 1] === ";") {
        rebusSolutionsString = rebusSolutionsString.slice(0, -1);
      }

      const rebusSolutions = rebusSolutionsString.split(";").reduce(
        (solutions: string[], solutionPair: string) => {
          const [numString, solution]: [string, string] = solutionPair
            .split(":") as [string, string];

          const num = parseInt(numString, 10);

          solutions[num] = solution;

          return solutions;
        },
        []
      );

      if (extensions.GRBS) {
        flatten(grid).map(
          (cell, index) => {
            const grbsBoardValue = extensions.GRBS.data.readInt8(index);
            if (grbsBoardValue === 0) {
              return;
            }
  
            (cell as IInputCell).solution = rebusSolutions![
              grbsBoardValue - 1
            ];
          }
        );
      }
    }

    if (extensions.RUSR) {
      // TODO: Populate userSolution
      const userRebusEntries = iconv.decode(
        extensions.RUSR.data as Buffer,
        PUZReader.ENCODING
      ).split("\0").map(
        (entry) => entry === "" ? null : entry
      );
    }

    let timing: {
      elapsed: number,
      running: boolean,
    }|undefined;

    if (extensions.LTIM) {
      const timings = iconv.decode(
        extensions.LTIM.data as Buffer,
        PUZReader.ENCODING
      ).split(",");

      timing = {
        elapsed: parseInt(timings[0], 10),
        running: timings[1] === "0"
      };
    }

    let cellStates: ICurrentCellStates[]|undefined;

    if (extensions.GEXT) {
      cellStates = Array.from(extensions.GEXT.data).map(
        (b) => {
          return {
            PreviouslyIncorrect: !!(b & CellStates.PreviouslyIncorrect),
            CurrentlyIncorrect: !!(b & CellStates.CurrentlyIncorrect),
            AnswerGiven: !!(b & CellStates.AnswerGiven),
            Circled: !!(b & CellStates.Circled)
          };
        }
      );
    }

    return {
      timing,
      cellStates,
    };
  }

  private unflattenSolution(solution: string, width: number): string[][] {
    return chunk(
      solution.split(""),
      width
    ).map(
      (row) => row.map(
        (cell) => cell === "-" ? "" : cell
      )
    );
  }

  private generateGridAndClues(
    answer: string,
    clueList: string[],
    width: number,
  ): {
    grid: Grid,
    clues: IPuzzleClues,
  } {
    const answers = this.unflattenSolution(answer, width);

    const _isBlockCell = (x: number, y: number) => {
      return answers[y][x] === BLOCK_CELL_VALUE;
    };

    const clues: IPuzzleClues = {
      across: {},
      down: {}
    };

    const grid: Grid = [];

    const height = answers.length;

    let clueCount = 0;

    let clueListIndex = 0;

    for (let y = 0; y < height; y++) {
      const row: GridCell[] = [];

      for (let x = 0; x < width; x++) {
        const cell: GridCell = _isBlockCell(x, y) ?
          { isBlockCell: true, } :
          { solution: answers[y][x], };

        if (!cell.isBlockCell) {
          let down = false, across = false;
  
          if (
            (
              x === 0 ||
              _isBlockCell(x - 1, y)
            ) && (
              x + 1 < width &&
              !_isBlockCell(x + 1, y)
            )
          ) {
            across = true;
          }
  
          if (
            (
              y === 0 ||
              _isBlockCell(x, y - 1)
            ) && (
              y + 1 < height &&
              !_isBlockCell(x, y + 1)
            )
          ) {
            down = true;
          }
  
          if (across || down) {
            (cell as IInputCell).clueNumber = ++clueCount;
          }
  
          if (across) {
            clues.across[clueCount] = clueList[clueListIndex++];
          }
  
          if (down) {
            clues.down[clueCount] = clueList[clueListIndex++];
          }          
        }

        row.push(cell);
      }

      grid.push(row);
    }

    return {
      grid,
      clues,
    };
  }

  private readClues(reader: PUZReader, numberOfClues: number) {
    return [...new Array(numberOfClues)].map(
      () => {
        return reader.readString();
      }
    );
  }

  private readHeader(reader: PUZReader, solutionKey?: string): IHeaderData {
    const globalChecksum = reader.readUInt16();

    reader.seek(ACROSS_AND_DOWN_STRING.length, { current: true });

    // TODO: validate checksums
    // header checksum
    reader.readUInt16();

    // magic checksum
    reader.readValues(MAGIC_CHECKSUM_BYTE_LENGTH);

    const version = reader.readString();

    // unknown field 1
    reader.readValues(UNKNOWN1_BYTE_LENGTH);

    // scrambled checksum
    reader.readUInt16();

    // unknown field 2
    reader.readValues(UNKNOWN2_BYTE_LENGTH);

    const width = reader.readUInt8();

    const height = reader.readUInt8();

    const numberOfClues = reader.readUInt16();

    const puzzleType = reader.readUInt16() as PuzzleType;

    const solutionState = reader.readUInt16() as SolutionState;

    if (solutionState === SolutionState.Locked && !solutionKey) {
      throw new Error("Puzzle solution is locked and no solutionKey option was provided");
    }

    return {
      version,
      width,
      height,
      numberOfClues,
      puzzleType,
      solutionState,
    };
  }
}

export default PUZParser;
