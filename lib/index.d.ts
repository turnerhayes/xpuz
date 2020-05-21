/**
 * XPuz index
 *
 * Exports the public API for the XPuz module
 *
 * @memberof xpuz
 */
import IPUZ from "./parsers/ipuz";
import JPZ from "./parsers/jpz";
import PUZ from "./parsers/puz";
import Puzzle from "./puzzle";
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