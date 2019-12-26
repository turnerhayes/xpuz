/**
 * XPuz index
 *
 * Exports the public API for the XPuz module
 *
 * @memberof xpuz
 */
var Puzzle = require("./puzzle");

exports = module.exports = {
  /**
   * Puzzle file parser constructors
   *
   * @type object
   * @property {xpuz/Parsers/ipuz} IPUZ - .ipuz file parser
   * @property {xpuz/Parsers/puz} PUZ - .puz file parser
   * @property {xpuz/Parsers/jpz} JPZ - .jpz file parser
   */
  Parsers: {
    IPUZ: require("./parsers/ipuz"),
    PUZ: require("./parsers/puz"),
    JPZ: require("./parsers/jpz")
  },

  /**
   * Puzzle object constructor
   *
   * @type function
   * @see {@link xpuz.Puzzle}
   */
  Puzzle: Puzzle
};
//# sourceMappingURL=index.js.map