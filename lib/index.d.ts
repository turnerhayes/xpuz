/**
 * XPuz index
 *
 * Exports the public API for the XPuz module
 *
 * @memberof xpuz
 */
import Puzzle from "./puzzle";
import IPUZ from "./parsers/ipuz";
import PUZ from "./parsers/puz";
import JPZ from "./parsers/jpz";
/**
 * Puzzle file parser constructors
 */
export declare const Parsers: {
    /**
     * .ipuz file parser
     */
    IPUZ: typeof IPUZ;
    /**
     * .puz file parser
     */
    PUZ: typeof PUZ;
    /**
     * .jpz file parser
     */
    JPZ: typeof JPZ;
};
/**
 * Puzzle object constructor
 */
export { Puzzle };
//# sourceMappingURL=index.d.ts.map