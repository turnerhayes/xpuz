"use strict";

var BaseCell = require('./base-cell');

function CrosswordCell(definition) {
	if (!(this instanceof CrosswordCell)) {
		return new CrosswordCell(definition);
	}

	var cell = this;

	Object.defineProperties(cell, {
		_definition: {
			value: definition || {}
		}
	});
}

CrosswordCell.prototype = Object.create(BaseCell.prototype, {
	clueNumber: {
		enumerable: true,
		get: function() {
			return this._definition.clueNumber;
		}
	},

	containingClues: {
		enumerable: true,
		get: function() {
			return this._definition.containingClues;
		}
	},

	backgroundShape: {
		enumerable: true,
		get: function() {
			return this._definition.backgroundShape;
		}
	},

	toString: {
		configurable: true,
		value: function() {
			return '[object CrosswordCell]';
		}
	}
});

exports = module.exports = CrosswordCell;
