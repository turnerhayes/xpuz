import Puzzle from "../puzzle";
/**
 * JPZ parser class
 */
declare class JPZParser {
    /**
     * Parses a {@link module:xpuz/puzzle~Puzzle} from the input
     *
     * @param {string|object} puzzle - the source to parse the puzzle from; if a string,
     *	it is assumed to be a file path, if an object, it defines a Puzzle object
     *
     * @return {external:Promise<module:xpuz/puzzle~Puzzle>} a promise that resolves with
     *	the parsed puzzle object
     */
    parse(puzzle: any): Promise<Puzzle>;
}
export default JPZParser;
//# sourceMappingURL=jpz.d.ts.map