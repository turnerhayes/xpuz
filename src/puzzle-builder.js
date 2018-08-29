

const _      = require("lodash");
const Puzzle = require("./puzzle");

function _closeCell(builder) {
	if (!builder._openRow || !builder._cell) {
		return;
	}

	builder._openRow.push(builder._cell);

	delete builder._cell;
}

function _closeRow(builder) {
	if (!builder._openRow) {
		return;
	}

	_closeCell(builder);

	builder._grid.push(builder._openRow);

	delete builder._openRow;
}

function _addCell(builder, options) {
	options = options || {};

	_closeCell(builder);

	builder._cell = {};

	if (options.isBlockCell) {
		builder._cell.isBlockCell = true;
	}

	if (options.solution) {
		builder._cell.solution = options.solution;
	}
}

function PuzzleBuilder() {
	const builder = this;

	builder._grid = [];

	builder._clues = {
		across: {},
		down: {}
	};

	builder._clueArrays = {
		across: [],
		down: [],
	};	
}

PuzzleBuilder.prototype = Object.create(Object.prototype, {
	addRow: {
		configurable: true,
		value: function() {
			const builder = this;

			_closeRow(builder);

			builder._openRow = [];

			return builder;
		}
	},

	addCell: {
		configurable: true,
		value: function() {
			const builder = this;
			
			if (!builder._openRow) {
				throw new Error("`addCell` called without an open row");
			}

			_addCell(builder);

			return builder;
		}
	},

	solution: {
		configurable: true,
		value: function(solutionLetter) {
			const builder = this;

			if (!builder._cell) {
				throw new Error("`solution` called without a cell");
			}

			builder._cell.solution = solutionLetter;

			return builder;
		}
	},

	addBlockCell: {
		configurable: true,
		value: function() {
			const builder = this;
			
			if (!builder._openRow) {
				throw new Error("`addBlockCell` called without an open row");
			}

			_addCell(builder, {
				isBlockCell: true
			});

			return builder;
		}
	},

	addAcrossClues: {
		configurable: true,
		value: function(clues) {
			const builder = this;

			_.each(
				clues,
				function(clueText, clueNumber) {
					builder._clues.across[clueNumber] = clueText;
				}
			);

			return builder;
		}
	},

	addAcrossClue: {
		configurable: true,
		value: function(clueNumber, clueText) {
			const builder = this;

			const clues = {};

			clues[clueNumber] = clueText;

			return builder.addAcrossClues(clues);
		}
	},

	addDownClues: {
		configurable: true,
		value: function(clues) {
			const builder = this;

			_.each(
				clues,
				function(clueText, clueNumber) {
					builder._clues.down[clueNumber] = clueText;
				}
			);

			return builder;
		}
	},

	addDownClue: {
		configurable: true,
		value: function(clueNumber, clueText) {
			const builder = this;

			const clues = {};

			clues[clueNumber] = clueText;

			return builder.addDownClues(clues);
		}
	},

	build: {
		configurable: true,
		value: function() {
			const builder = this;

			_closeRow(builder);

			let maxRowLength = 0;

			_.each(
				builder._grid,
				function(row) {
					if (row.length > maxRowLength) {
						maxRowLength = row.length;
					}
				}
			);

			_.each(
				builder._grid,
				function(row) {
					if (row.length < maxRowLength) {
						builder._openRow = row;

						builder.addBlocks(maxRowLength - row.length + 1);
					}
				}
			);

			return new Puzzle({
				grid: builder._grid,
				clues: builder._clues
			});
		}
	},
	toString: {
		configurable: true,
		value: function() {
			return "[object PuzzleBuilder]";
		}
	},
});

exports = module.exports = PuzzleBuilder;
