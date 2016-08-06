"use strict";

/**
 * XPuz index
 *
 * @description Exports the public API for the XPuz module
 * @module xpuz/index
 */

exports = module.exports = {
	IPUZ: require('./parsers/ipuz'),
	PUZ: require('./parsers/puz'),
	JPZ: require('./parsers/jpz'),
	Puzzle: require('./lib/puzzle'),
};
