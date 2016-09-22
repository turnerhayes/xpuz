"use strict";

/**
 * XPuz index
 *
 * @description Exports the public API for the XPuz module
 * @module xpuz/index
 */

exports = module.exports = {
	/**
	 * Puzzle file parser constructors
	 *
	 * @type object
	 * @property {function} IPUZ - .ipuz file parser
	 * @property {function} PUZ - .puz file parser
	 * @property {function} JPZ - .jpz file parser
	 */
	Parsers: {
		IPUZ: require('./parsers/ipuz'),
		PUZ: require('./parsers/puz'),
		JPZ: require('./parsers/jpz')
	},

	/**
	 * Puzzle object constructor
	 *
	 * @type function
	 */
	Puzzle: require('./lib/puzzle'),
};
