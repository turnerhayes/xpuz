import ImmutablePuzzle from "../immutable/puzzle";
import Puzzle from "../puzzle";

/**
 * JPZ Parser
 *
 * @description Parses .jpz formatted puzzles (NOT CURRENTLY IMPLEMENTED)
 * @module xpuz/parsers/jpz
 */

function _parsePuzzle(puzzle: string|{}): Promise<Puzzle> {
  throw new Error("JPZ puzzle parser not implemented");
}

/**
 * JPZ parser class
 */
class JPZParser<T extends (Puzzle|ImmutablePuzzle) = Puzzle> {
  /**
   * Parses a {@link module:xpuz/puzzle~Puzzle} from the input
   *
   * @return {Promise<T>} a promise that resolves with the parsed puzzle object
   */
  public async parse(
    path: string,
    options: {
      converter?: (puzzle: Puzzle) => T,
    }
  ): Promise<T> {
    const puzzle = await _parsePuzzle(path);

    if (options.converter) {
      return options.converter(puzzle);
    }

    return puzzle as T;
  }

  public generate(
    puzzle: T,
    options: {
      preprocessor?: (puzzle: T) => Puzzle,
    }
  ): Promise<Buffer> {
    throw new Error("Not implemented");
  }
}

export default JPZParser;
