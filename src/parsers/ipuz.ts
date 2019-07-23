/**
 * IPUZ file parser.
 *
 * @module xpuz/parsers/ipuz
 */

import readFile from "./read-file";
import get from "lodash/get";
import isObject from "lodash/isObject";
import Puzzle from "../puzzle";
import { ClueMap } from "../base-puzzle";

const BLOCK_VALUE = "#";

export interface IIPUZPuzzle {
	puzzle: [][];
	dimensions: {
		width: number,
		height: number,
	};
	title: string;
	author: string;
	copyright: string;
	publisher: string;
	difficulty: any;
	intro: string;
	clues: {
		Across: [number, string][],
		Down: [number, string][],
	};
}

function _checkDimensions(puzzle: IIPUZPuzzle) {
	const errors = [];

	const maxCellWidth = Math.max(
		...puzzle.puzzle.map(
			(row) => row.length
		)
	);

	const numRows = puzzle.puzzle.length;

	if (maxCellWidth > puzzle.dimensions.width) {
		errors.push(`Too many puzzle cells (${maxCellWidth}) for puzzle width (${puzzle.dimensions.width})`);
	}

	if (numRows > puzzle.dimensions.height) {
		errors.push(`Too many puzzle cells (${numRows}) for puzzle height (${puzzle.dimensions.height})`);
	}

	return errors;
}

function _getClueNumber(cell: {
		cell: number,
	} | number
): number {
	return isObject(cell) ?
		(cell as { cell: number }).cell :
		cell;
}

function _addClue(obj: {[clueNumber: number]: string}, clue: [number, string]) {
	obj[clue[0]] = clue[1];

	return obj;
}

function _convertPuzzle(ipuz: IIPUZPuzzle) {
	const puzzle = new Puzzle({
		info: {
			title: ipuz.title,
			author: ipuz.author,
			copyright: ipuz.copyright,
			publisher: ipuz.publisher,
			difficulty: ipuz.difficulty,
			intro: ipuz.intro,
		},
		grid: ipuz.puzzle.map(
			(row) => row.map(
				(cell) => {
					if (cell === BLOCK_VALUE) {
						return {
							isBlockCell: true,
						};
					}

					return {
						clueNumber: _getClueNumber(cell),
						backgroundShape: get(cell, "style.shapebg"),
					};
				}
			)
		),
		clues: {
			across: ipuz.clues.Across.reduce(
				(clues: {}, clue: [number, string]) => _addClue(
					clues,
					clue
				),
				{}
			),
			down: ipuz.clues.Down.reduce(
				(clues: ClueMap, clue: [number, string]) => _addClue(
					clues,
					clue
				),
				{}
			),
		}
	});

	return puzzle;
}

function _validatePuzzle(puzzle: IIPUZPuzzle): string[]|undefined {
	const errors = [];

	if (!puzzle.dimensions) {
		errors.push("Puzzle is missing 'dimensions' key");
	}

	if (puzzle.puzzle) {
		errors.push(..._checkDimensions(puzzle));
	}
	else {
		errors.push("Puzzle is missing 'puzzle' key");
	}

	return errors.length === 0 ? undefined : errors;
}

async function _parsePuzzle(puzzle: string|IIPUZPuzzle): Promise<Puzzle> {
	let parsedPuzzle: IIPUZPuzzle;

	if (typeof puzzle === "string") {
		// path to puzzle
		try {
			const fileContent = await readFile(puzzle);
			parsedPuzzle = JSON.parse(fileContent.toString()) as IIPUZPuzzle;
		}
		catch (ex) {
			throw new Error(`Unable to read IPUZ puzzle from file ${puzzle}: ${ex.message}`);
		}
	}
	else if (isObject(puzzle)) {
		parsedPuzzle = puzzle;
	}
	else {
		throw new Error("parse() expects either a path string or an object");
	}

	const errors = _validatePuzzle(parsedPuzzle);

	if (errors !== undefined) {
		throw new Error(`Invalid puzzle:\n\t${errors.join("\n\t")}`);
	}

	return _convertPuzzle(parsedPuzzle);
}

/**
 * Parser class for IPUZ-formatted puzzles
 */
class IPUZParser {
	/**
	 * Parses a {@link module:xpuz/puzzle~Puzzle|Puzzle} from the input.
	 */
	parse(puzzle: string|IIPUZPuzzle): Promise<Puzzle> {
		return _parsePuzzle(puzzle);
	}
}

export default IPUZParser;
