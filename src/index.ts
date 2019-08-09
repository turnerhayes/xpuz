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
export const Parsers = {
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
};

/**
 * Puzzle object constructor
 */
export { Puzzle };
