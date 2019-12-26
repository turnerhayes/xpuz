var Puzzle = require("./puzzle");

var Utils = require("./utils");

module.exports = {
  Puzzle: Puzzle,

  /**
   * Puzzle file parser constructors
   *
   * @type object
   * @property {xpuz/Immutable/Parsers/ipuz} IPUZ - .ipuz file parser
   * @property {xpuz/Immutable/Parsers/puz} PUZ - .puz file parser
   * @property {xpuz/Immutable/Parsers/jpz} JPZ - .jpz file parser
   */
  Parsers: {
    IPUZ: require("./parsers/ipuz"),
    PUZ: require("./parsers/puz"),
    JPZ: require("./parsers/jpz")
  },
  Utils: Utils
};
//# sourceMappingURL=index.js.map