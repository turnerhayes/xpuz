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
declare const _default: {
    /**
     * Puzzle file parser constructors
     */
    Parsers: {
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
    Puzzle: typeof Puzzle;
};
export default _default;
//# sourceMappingURL=index.d.ts.map