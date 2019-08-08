import flatten from "lodash/flatten";
import chunk from "lodash/chunk";
import compact from "lodash/compact";
import findKey from "lodash/findKey";
import iconv from "iconv-lite";

import { IPuzzleJSON } from "../../puzzle-utils";
import { Grid, GridCell, IInputCell } from "../../Grid";
import PUZReader from "./puz-reader";
import {
  PuzzleType,
  SolutionState,
  IHeaderData,
  ExtensionName,
} from "./common";
import {
  transposeGrid,
  restoreSolution,
  padStart,
  scrambleString,
} from "./grid-string-utils";
import {
  BLOCK_CELL_VALUE,
  BLOCK_CELL_VALUE_REGEX,
  CHECKSUM_BUFFER_LENGTH,
  HEADER_CHECKSUM_BYTE_LENGTH,
  EXTENSION_LENGTH_BUFFER_LENGTH,
  EXTENSION_NAME_LENGTH,
  SOLUTION_STATE_BUFFER_LENGTH,
  UNKNOWN1_BYTE_LENGTH,
  UNKNOWN2_BYTE_LENGTH,
  HEADER_BUFFER_LENGTH,
  PUZZLE_TYPE_BUFFER_LENGTH,
  NUMBER_OF_CLUES_BUFFER_LENGTH,
  MINIMUM_KEY_VALUE,
  MAXIMUM_KEY_VALUE,
} from "./constants";

type RebusSolutionMap = {
	[key: number]: {
		solution: string,
		cells: number[],
	},
};

const NULL_BYTE = String.fromCharCode(0);

function writeExtension(extensionBuffer: Buffer, extensionName: ExtensionName): Buffer {
  const lengthBuffer = new Buffer(EXTENSION_LENGTH_BUFFER_LENGTH);
  lengthBuffer.writeUInt16LE(extensionBuffer.length, 0);

  const checksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);
  checksumBuffer.writeUInt16LE(doChecksum(extensionBuffer), 0);

  return Buffer.concat(
    [
      iconv.encode(extensionName, PUZReader.ENCODING),
      lengthBuffer,
      checksumBuffer,
      extensionBuffer,
      new Buffer([0])
    ],
    EXTENSION_NAME_LENGTH + EXTENSION_LENGTH_BUFFER_LENGTH + CHECKSUM_BUFFER_LENGTH + extensionBuffer.length + 1
  );
}

function writeExtensions(
  answerArray: string[],
  userSolutionArray: string[],
  timing?: {
    elapsed: number,
    running: boolean,
  },
): Buffer {
  let solutionKey = 0;

  const rebusSolutions: RebusSolutionMap = flatten(answerArray).reduce(
    (
      solutions: RebusSolutionMap,
      cellSolution: string,
      cellIndex: number
    ) => {
      if (cellSolution && cellSolution.length > 1) {
        const key = findKey(solutions, {solution: cellSolution});

        if (key === undefined) {
          solutions[++solutionKey] = {
            solution: cellSolution,
            cells: [cellIndex]
          };
        }
        else {
          solutions[key as unknown as number].cells.push(cellIndex);
        }
      }

      return solutions;
    },
    {}
  );

  const grbsBuffer = writeExtension(
    new Buffer(
      answerArray.map(
        (cell, index) => {
          const solutionKey = findKey(
            rebusSolutions,
            (solutionInfo) => solutionInfo.cells.includes(index)
          );

          if (solutionKey === undefined) {
            return 0;
          }

          return parseInt(solutionKey, 10) + 1;
        }
      )
    ),
    "GRBS"
  );

  const RTBL_KEY_PADDING_WIDTH = 2;

  const rtblBuffer = writeExtension(
    iconv.encode(
      Object.keys(rebusSolutions).map(
        (key) => `${
          padStart(key, RTBL_KEY_PADDING_WIDTH, " ")
        }:${
          rebusSolutions[key as unknown as number].solution
        };`
      ).join(""),
      PUZReader.ENCODING
    ),
    "RTBL"
  );

  const rusrBuffer = writeExtension(
    iconv.encode(
      userSolutionArray.map(
        (solution) => {
          if (solution.length > 1) {
            return `${solution}${NULL_BYTE}`;
          }

          return NULL_BYTE;
        }
      ).join(""),
      PUZReader.ENCODING
    ),
    "RUSR"
  );

  const buffers = [
    grbsBuffer,
    rtblBuffer,
    rusrBuffer,
  ];

  let totalBufferLength = grbsBuffer.length + rtblBuffer.length + rusrBuffer.length;

  if (timing) {
    const ltimBuffer = writeExtension(
      iconv.encode(
        `${timing.elapsed},${timing.running ? "1" : "0"}`,
        PUZReader.ENCODING
      ),
      "LTIM"
    );
    buffers.push(ltimBuffer);

    totalBufferLength += ltimBuffer.length;
  }

  return Buffer.concat(
    buffers,
    totalBufferLength,
  );
}

function scrambleSolution(solutionGrid: string[][], key: string): string[][] {
  const height = solutionGrid.length;
  const width = solutionGrid[0].length;

  let solutionString = flattenSolution(solutionGrid);

  const transposed = transposeGrid(solutionString, width, height);

  const data = restoreSolution(
    transposed,
    scrambleString(transposed.replace(BLOCK_CELL_VALUE_REGEX, ""), key)
  );

  solutionString = transposeGrid(data, height, width);

  return chunk(solutionString.split(""), width);
}

function magicChecksum(
  {
    header,
    answer,
    solution,
    title,
    author,
    copyright,
    notes,
    clueList,
  }: {
    header: IHeaderData,
    answer: string,
    solution: string,
    title: string,
    author: string,
    copyright: string,
    notes: string,
    clueList: string[],
  }
): Buffer {
  const _headerChecksum = getHeaderChecksum(header);
  const answerChecksum = doChecksum(iconv.encode(answer, PUZReader.ENCODING));
  const solutionChecksum = doChecksum(iconv.encode(solution, PUZReader.ENCODING));
  const _textChecksum = textChecksum({
    title,
    author,
    copyright,
    clueList,
    notes,
    version: header.version,
  });

  const MAGIC_CHECKSUM_STRING = "ICHEATED";

  const magicChecksum = new Buffer([
    /* eslint-disable no-magic-numbers */
    MAGIC_CHECKSUM_STRING.charCodeAt(0) ^ (_headerChecksum & 0xFF),
    MAGIC_CHECKSUM_STRING.charCodeAt(1) ^ (answerChecksum & 0xFF),
    MAGIC_CHECKSUM_STRING.charCodeAt(2) ^ (solutionChecksum & 0xFF),
    MAGIC_CHECKSUM_STRING.charCodeAt(3) ^ (_textChecksum & 0xFF),
    MAGIC_CHECKSUM_STRING.charCodeAt(4) ^ ((_headerChecksum & 0xFF00) >> 8),
    MAGIC_CHECKSUM_STRING.charCodeAt(5) ^ ((answerChecksum & 0xFF00) >> 8),
    MAGIC_CHECKSUM_STRING.charCodeAt(6) ^ ((solutionChecksum & 0xFF00) >> 8),
    MAGIC_CHECKSUM_STRING.charCodeAt(7) ^ ((_textChecksum & 0xFF00) >> 8)
    /* eslint-enable no-magic-numbers */
  ]);


  return magicChecksum;
}

function scrambledChecksum(
  answer: string|string[][],
  width: number,
  height: number
): number {
  const transposed = transposeGrid(
    flattenSolution(answer as string[][]),
    width,
    height
  ).replace(BLOCK_CELL_VALUE_REGEX, "");

  return doChecksum(iconv.encode(transposed, PUZReader.ENCODING));
}

function doChecksum(buffer: Buffer, cksum: number = 0): number {
  for (let i = 0; i < buffer.length; i++) {
    // right-shift one with wrap-around
    const lowbit = cksum & 0x0001;

    cksum = cksum >> 1;

    if (lowbit) {
      // eslint-disable-next-line no-magic-numbers
      cksum = cksum | 0x8000;
    }

    // then add in the data and clear any carried bit past 16
    // eslint-disable-next-line no-magic-numbers
    cksum = (cksum + buffer.readUInt8(i)) & 0xFFFF;
  }

  return cksum;
}

function writeHeader(
  {
    header,
    unscrambledAnswer,
    answer,
    solution,
    title = "",
    author = "",
    copyright = "",
    notes = "",
    clueList,
    scrambled,
  }: {
    header: IHeaderData,
    unscrambledAnswer: string,
    answer: string,
    solution: string,
    title?: string,
    author?: string,
    copyright?: string,
    notes?: string,
    clueList: string[],
    scrambled?: boolean,
  }
): Buffer {
  const globalChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

  globalChecksumBuffer.writeUInt16LE(
    globalChecksum(
      {
        header,
        answer,
        solution,
        title,
        author,
        copyright,
        notes,
        clueList,
      }
    ),
    0
  );

  const headerChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

  headerChecksumBuffer.writeUInt16LE(getHeaderChecksum(header), 0);

  const magicChecksumBuffer = magicChecksum({
    header,
    answer,
    solution,
    title,
    author,
    copyright,
    notes,
    clueList,
  });

  const scrambledChecksumBuffer = new Buffer(CHECKSUM_BUFFER_LENGTH);

  if (scrambled) {
    scrambledChecksumBuffer.writeUInt16LE(
      scrambledChecksum(
        unscrambledAnswer,
        header.width,
        header.height
      ),
      0
    );
  }
  else {
    scrambledChecksumBuffer.fill(0x0);
  }

  const numberOfCluesBuffer = new Buffer(NUMBER_OF_CLUES_BUFFER_LENGTH);

  numberOfCluesBuffer.writeUInt16LE(header.numberOfClues, 0);

  const puzzleTypeBuffer = new Buffer(PUZZLE_TYPE_BUFFER_LENGTH);

  puzzleTypeBuffer.writeUInt16LE(header.puzzleType, 0);

  const solutionStateBuffer = new Buffer(SOLUTION_STATE_BUFFER_LENGTH);

  solutionStateBuffer.writeUInt16LE(header.solutionState, 0);

  return Buffer.concat(
    [
      globalChecksumBuffer,
      iconv.encode(`ACROSS&DOWN${NULL_BYTE}`, PUZReader.ENCODING),
      headerChecksumBuffer,
      magicChecksumBuffer,
      iconv.encode(header.version + NULL_BYTE, PUZReader.ENCODING),
      // unknown block 1
      new Buffer([0x0, 0x0]),
      scrambledChecksumBuffer,
      // unknown block 2
      new Buffer(UNKNOWN2_BYTE_LENGTH).fill(0x0),
      new Buffer([header.width]),
      new Buffer([header.height]),
      numberOfCluesBuffer,
      puzzleTypeBuffer,
      solutionStateBuffer
    ],
    HEADER_BUFFER_LENGTH
  );
}

function globalChecksum(
  {
    header,
    answer,
    solution,
    title,
    author,
    copyright,
    notes,
    clueList,
  }: {
    header: IHeaderData,
    answer: string,
    solution: string,
    title: string,
    author: string,
    copyright: string,
    notes: string,
    clueList: string[],
  },
  headerChecksum = 0
) {
  let checksum = headerChecksum === undefined ? getHeaderChecksum(header) : headerChecksum;

  let buffer = iconv.encode(answer, PUZReader.ENCODING);

  checksum = doChecksum(buffer, checksum);

  buffer = iconv.encode(solution, PUZReader.ENCODING);

  checksum = doChecksum(buffer, checksum);

  checksum = textChecksum(
    {
      title,
      author,
      copyright,
      clueList,
      notes,
      version: header.version,
    },
    checksum
  );

  return checksum;
}

function textChecksum(
  {
    title,
    author,
    copyright,
    clueList,
    notes,
    version,
  }: {
    title: string,
    author: string,
    copyright: string,
    clueList: string[],
    notes: string,
    version: string,
  },
  checksum: number = 0
) {
  if (title) {
    checksum = doChecksum(iconv.encode(title + NULL_BYTE, PUZReader.ENCODING), checksum);
  }

  if (author) {
    checksum = doChecksum(iconv.encode(author + NULL_BYTE, PUZReader.ENCODING), checksum);
  }

  if (copyright) {
    checksum = doChecksum(iconv.encode(copyright + NULL_BYTE, PUZReader.ENCODING), checksum);
  }

  clueList.forEach(
    (clue) => {
      if (clue) {
        checksum = doChecksum(iconv.encode(clue, PUZReader.ENCODING), checksum);
      }
    }
  );

  const versionParts = version.split(".").map(Number);
  // Notes only became part of the checksum starting in version 1.3
  // (see https://github.com/alexdej/puzpy/blob/6109ad5a54359262010d01f2e0175d928bd70962/puz.py#L360)
  if (versionParts[0] >= 1 && versionParts[1] >= 3) { // eslint-disable-line no-magic-numbers
    if (notes) {
      checksum = doChecksum(iconv.encode(notes + NULL_BYTE, PUZReader.ENCODING), checksum);
    }
  }

  return checksum;
}

function getHeaderChecksum(header: IHeaderData, checksum?: number) {
  if(checksum === undefined) {
    checksum = 0;
  }

  const buffer = new Buffer(HEADER_CHECKSUM_BYTE_LENGTH);

  buffer.writeUInt8(header.width, 0);
  buffer.writeUInt8(header.height, 1);
  // These "magic numbers" are the successive byte offsets to write at
  /* eslint-disable no-magic-numbers */
  buffer.writeUInt16LE(header.numberOfClues, 2);
  buffer.writeUInt16LE(header.puzzleType, 4);
  buffer.writeUInt16LE(header.solutionState, 6);
  /* eslint-enable no-magic-numbers */

  return doChecksum(buffer, checksum);
}

function flattenSolution(solution: string[]|string[][]): string {
  return flatten(solution).map(
    (entry) => {
      if (entry === null) {
        return BLOCK_CELL_VALUE;
      }

      if (entry === "") {
        return "-";
      }

      return entry[0];
    }
  ).join("");
}

function pluckSolutions(
  grid: Grid
): string[][] {
  return grid.map(
    (row) => row.map(
      (cell) => {
        if (cell.isBlockCell) {
          return BLOCK_CELL_VALUE;
        }

        if (cell.solution === null) {
          return " ";
        }

        return cell.solution!;
      }
    )
  );
}

export const generate = (puzzle: IPuzzleJSON, solutionKey?: string): Buffer => {
		const numberOfClues = Object.keys(puzzle.clues.across).length + Object.keys(puzzle.clues.down).length;
		const puzzleType = PuzzleType.Normal;
		let solutionState = SolutionState.Unlocked;

		const height = puzzle.grid.length;
		const width = puzzle.grid[0].length;

    const notes = puzzle.info.intro || "";
    
    let answerArray = pluckSolutions(puzzle.grid);
    let unscrambledAnswerArray: string[][]|undefined;

		if (solutionKey) {
			if (
				Number(solutionKey) < MINIMUM_KEY_VALUE ||
				Number(solutionKey) > MAXIMUM_KEY_VALUE
			) {
				throw new Error(`Must specify a solution key that is an integer >= 1000 and <= 9999; was ${solutionKey}`);
			}

			unscrambledAnswerArray = answerArray;
			answerArray = scrambleSolution(answerArray, solutionKey);

			solutionState = SolutionState.Locked;
		}
		const flattenedAnswerArray = flatten(answerArray);
    const flattenedUnscrambledAnswerArray = flatten(unscrambledAnswerArray || answerArray);

		const userSolution = puzzle.userSolution.map(
			(row) => row.map(
				(solution) => {
					if (solution === null) {
						return BLOCK_CELL_VALUE;
					}

					if (solution === "") {
						return "-";
					}

					return solution;
				}
			)
		);

    const userSolutionArray = flatten(userSolution);

		const clueList = compact(flatten(puzzle.grid).map(
			(cell: GridCell) => (cell as IInputCell).clueNumber
		)).reduce(
			(cluesArray: string[], clueNumber: number) => {
				if (puzzle.clues.across[clueNumber] !== undefined) {
					cluesArray.push(puzzle.clues.across[clueNumber]);
				}

				if (puzzle.clues.down[clueNumber] !== undefined) {
					cluesArray.push(puzzle.clues.down[clueNumber]);
				}

				return cluesArray;
			},
			[]
    );

		const header = {
      width,
      height,
      numberOfClues,
      puzzleType,
      solutionState,
      version: (puzzle.info && puzzle.info.formatExtra && puzzle.info.formatExtra.version) ||
        "1.3",
		};

		const answer = flattenSolution(flattenedAnswerArray);
		const unscrambledAnswer = flattenSolution(flattenedUnscrambledAnswerArray);
		const solution = flattenSolution(userSolution);


		const headerBuffer = writeHeader({
			header,
			unscrambledAnswer,
			answer,
			solution,
			title: puzzle.info.title,
			author: puzzle.info.author,
			copyright: puzzle.info.copyright,
			notes,
			clueList,
			scrambled: Boolean(solutionKey),
		});

		const answerStringBuffer = iconv.encode(
			flattenSolution(answerArray),
			PUZReader.ENCODING
		);

		const userSolutionStringBuffer = iconv.encode(
			userSolutionArray.map(
				(solution) => solution[0]
			).join(""),
			PUZReader.ENCODING
		);

		const titleStringBuffer = iconv.encode(`${puzzle.info.title || ""}${NULL_BYTE}`, PUZReader.ENCODING);
		const authorStringBuffer = iconv.encode(`${puzzle.info.author || ""}${NULL_BYTE}`, PUZReader.ENCODING);
		const copyrightStringBuffer = iconv.encode(`${puzzle.info.copyright || ""}${NULL_BYTE}`, PUZReader.ENCODING);

		const cluesStringBuffer = iconv.encode(`${clueList.join(NULL_BYTE)}${NULL_BYTE}`, PUZReader.ENCODING);

		const notesStringBuffer = iconv.encode(`${notes}${NULL_BYTE}`, PUZReader.ENCODING);

		const buffers = [
			headerBuffer,
			answerStringBuffer,
			userSolutionStringBuffer,
			titleStringBuffer,
			authorStringBuffer,
			copyrightStringBuffer,
			cluesStringBuffer,
			notesStringBuffer,
		];

		let totalBufferLength = headerBuffer.length + answerStringBuffer.length +
			userSolutionStringBuffer.length + titleStringBuffer.length +
			authorStringBuffer.length + copyrightStringBuffer.length +
			cluesStringBuffer.length + notesStringBuffer.length;

		if (
			flattenedUnscrambledAnswerArray.some((solution) => solution.length > 1)
		) {
			const extensionsBuffer = writeExtensions(
				flattenedUnscrambledAnswerArray,
				userSolutionArray,
        puzzle.info.formatExtra && puzzle.info.formatExtra.extensions &&
          puzzle.info.formatExtra.extensions.timing,
			);

			buffers.push(extensionsBuffer);

			totalBufferLength += extensionsBuffer.length;
		}

		return Buffer.concat(buffers, totalBufferLength);
};
