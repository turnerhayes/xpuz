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

export default {
	/**
	 * Puzzle file parser constructors
	 */
	Parsers: {
		/**
		 * .ipuz file parser
		 */
		IPUZ,
		/**
		 * .puz file parser
		 */
		PUZ,
		/**
		 * .jpz file parser
		 */
		JPZ,
	},

	/**
	 * Puzzle object constructor
	 */
	Puzzle,
};
