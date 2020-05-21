/// <reference types="node" />
import ImmutablePuzzle from "../immutable/puzzle";
import Puzzle from "../puzzle";
/**
 * JPZ parser class
 */
declare class JPZParser<T extends (Puzzle | ImmutablePuzzle) = Puzzle> {
    /**
     * Parses a {@link module:xpuz/puzzle~Puzzle} from the input
     *
     * @return {Promise<T>} a promise that resolves with the parsed puzzle object
     */
    parse(path: string, options: {
        converter?: (puzzle: Puzzle) => T;
    }): Promise<T>;
    generate(puzzle: T, options: {
        preprocessor?: (puzzle: T) => Puzzle;
    }): Promise<Buffer>;
}
export default JPZParser;
//# sourceMappingURL=jpz.d.ts.map