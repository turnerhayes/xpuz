"use strict";

var BaseCell = require('./base-cell');

function BlockCell() {
	if (!(this instanceof BlockCell)) {
		return new BlockCell();
	}
}

BlockCell.prototype = Object.create(BaseCell.prototype, {
	toString: {
		configurable: true,
		value: function() {
			return '[object BlockCell]';
		}
	},

	isBlockCell: {
		value: true
	}
});

exports = module.exports = BlockCell;
