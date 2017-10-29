const hashIt = require("hash-it");
const get    = require("lodash/get");
const set    = require("lodash/set");
const size   = require("lodash/size");

/**
 * Provides common functionality for {@link xpuz.ImmutablePuzzle} and {@link xpuz.Puzzle} classes.
 *
 * @mixin
 * @memberof xpuz
 *
 * @return {void}
 */
function PuzzleMixin({ constructor, equalityTest, getter = get, setter = set, sizeOf = size }) {
	const constructorName = constructor.name;

	/**
	 * Finds which across and down clues a grid cell is a member of.
	 *
	 * @private
	 *
	 * @param {object} args - the function arguments
	 * @param {Types.Grid|Types.ImmutableGrid} args.grid - the grid containing the cell
	 * @param {number} args.width - the width of the grid (this is here just so that it doesn't have
	 *	to calculate it every time this is called)
	 * @param {number} args.height - the height of the grid (this is here just so that it doesn't have
	 *	to calculate it every time this is called)
	 * @param {number} args.rowIndex - the index of the row on which the cell occurs
	 * @param {number} args.columnIndex - the index of the column on which the cell occurs
	 *
	 * @return {{across: ?number, down: ?number}} the clue numbers for the clues that contain this cell
	 *	(one or both of `across` and `down` keys may be populated)
	 */
	function findContainingClues({ grid, width, height, rowIndex, columnIndex }) {
		const containingClues = {};

		const clueNumber = getter(grid, [rowIndex, columnIndex, "clueNumber"]);

		if (clueNumber !== undefined) {
			// This cell is a clue number cell--it defines either
			// its across clue number or its down clue number (or
			// both)

			if (
				// This is either at the left edge of the puzzle or
				// is bounded on the left by a block cell. This clue
				// number defines (at least) the cell's across clue number
				(columnIndex === 0 || getter(grid, [rowIndex, columnIndex - 1, "isBlockCell"])) &&
				// There is at least one fillable cell to the right
				(columnIndex < width - 1 && !getter(grid, [rowIndex, columnIndex + 1, "isBlockCell"]))
			) {
				containingClues.across = clueNumber;
			}
			else if (
				// There is at least one fillable cell below this
				rowIndex < height - 1 && !getter(grid, [rowIndex + 1, columnIndex, "isBlockCell"])
			){
				// At least one cell exists to the left of this cell; this
				// is not an across clue number. It must be a down clue number.
				containingClues.down = clueNumber;
			}
		}

		if (!containingClues.across) {
			// Haven't found the across clue number yet.
			// Look to the left until we find a block cell or the edge of
			// the puzzle
			if (
				// At the left edge of the puzzle and there's a clue number
				(columnIndex === 0 && clueNumber !== undefined) &&
				// There is at least one fillable cell to the right
				!getter(grid, [rowIndex, columnIndex + 1, "isBlockCell"])
			) {
				containingClues.across = clueNumber;
			}
			else {
				for (let i = columnIndex; i >= 0; i--) {
					if (getter(grid, [rowIndex, i, "isBlockCell"])) {
						break;
					}

					if (
						// There is at least one fillable cell to the right
						i < width - 1 && !getter(grid, [rowIndex, i + 1, "isBlockCell"])
					) {
						containingClues.across = getter(grid, [rowIndex, i, "clueNumber"]);
					}
				}
			}
		}

		if (!containingClues.down) {
			// Look at cells in other rows at the same index until we find a
			// cell with a clue number
			if (
				// At the top of the puzzle and there is a clue number
				(rowIndex === 0 && clueNumber !== undefined) &&
				// There is at least one fillable cell below it
				!getter(grid, [rowIndex + 1, columnIndex, "isBlockCell"])
			) {
				containingClues.down = clueNumber;
			}
			else {
				for (let i = rowIndex; i >= 0; i--) {
					if (getter(grid, [i, columnIndex, "isBlockCell"])) {
						break;
					}
					
					if (
						// There is at least one fillable cell below it
						i < height - 1 && !getter(grid, [i + 1, columnIndex, "isBlockCell"])
					) {
						containingClues.down = getter(grid, [i, columnIndex, "clueNumber"]);
					}
				}
			}
		}

		return containingClues;
	}

	/**
	 * Determines whether a cell in the grid is at the start of a down or across clue (or
	 * both), and thus should be given a clue number.
	 *
	 * @private
	 *
	 * @param {object} args - the function arguments
	 * @param {Types.Grid|Types.ImmutableGrid} args.grid - the grid containing the cell
	 * @param {number} args.width - the width of the grid (this is here just so that it doesn't have
	 *	to calculate it every time this is called)
	 * @param {number} args.height - the height of the grid (this is here just so that it doesn't have
	 *	to calculate it every time this is called)
	 * @param {number} args.rowIndex - the index of the row on which the cell occurs
	 * @param {number} args.columnIndex - the index of the column on which the cell occurs
	 *
	 * @return {boolean} whether or not the specified cell should be given a clue number
	 */
	function hasClueNumber({ grid, width, height, rowIndex, columnIndex }) {
		if (getter(grid, [rowIndex, columnIndex, "isBlockCell"])) {
			return undefined;
		}

		if (
			(columnIndex === 0 || getter(grid, [rowIndex, columnIndex - 1, "isBlockCell"])) &&
			(columnIndex + 1 < width && !getter(grid, [rowIndex, columnIndex + 1, "isBlockCell"]))
		) {
			// This cell is adjacent to the puzzle edge or a block cell on the left,
			// and has at least one input cell to its right--this cell starts an across clue
			return true;
		}

		if (
			(rowIndex === 0 || getter(grid, [rowIndex - 1, columnIndex, "isBlockCell"])) &&
			(rowIndex + 1 < height && !getter(grid, [rowIndex + 1, columnIndex, "isBlockCell"]))
		) {
			// This cell is adjacent to the puzzle edge or a block cell on the top,
			// and has at least one input cell below it--this cell starts a down clue
			return true;
		}

		return false;
	}

	Object.defineProperties(
		constructor.prototype,
		{
			/**
			 * Determines whether this object is equivalent to another object
			 *
			 * @method
			 * @instance
			 * @memberof xpuz.PuzzleMixin
			 *
			 * @param {*} other - the object to compare against
			 *
			 * @return {boolean} whether or not the other object is equal to this
			 */
			equals: {
				writable: true,
				configurable: true,
				value: function equals(other) {
					if (!(other instanceof constructor)) {
						return false;
					}

					return equalityTest(this.grid, other.grid) &&
						equalityTest(this.clues, other.clues) &&
						equalityTest(this.userSolution, other.userSolution) &&
						equalityTest(this.info, other.info) &&
						equalityTest(this.extensions, other.extensions);
				}
			},

			/**
			 * Returns a hash code integer for this object.
			 *
			 * @method
			 * @instance
			 * @memberof xpuz.PuzzleMixin
			 *
			 * @return {number} the object's hash code
			 */
			hashCode: {
				writable: true,
				configurable: true,
				value: function hashCode() {
					return hashIt(this);
				}
			},

			/**
			 * Returns a string representation of this object.
			 *
			 * @method
			 * @instance
			 * @memberof xpuz.PuzzleMixin
			 *
			 * @return {string} string representation of this object
			 */
			toString: {
				writable: true,
				configurable: true,
				value: function toString() {
					return constructorName;
				}
			},

			/**
			 * Returns a string representation of this object.
			 *
			 * @member {string} @@toStringTag
			 * @instance
			 * @readonly
			 * @memberof xpuz.PuzzleMixin
			 *
			 * @return {string} string representation of this object
			 */
			[Symbol.toStringTag]: {
				configurable: true,
				get() {
					return constructorName;
				}
			},

			/**
			 * Updates the cells of the grid to have accurate clue numbering and `containingClues` properties.
			 *
			 * @method
			 * @instance
			 * @memberof xpuz.PuzzleMixin
			 *
			 * @param {Types.Grid|Types.ImmutableGrid} [grid=this.grid] - the grid to update and set as the puzzle's grid
			 *
			 * @return {Puzzle|ImmutablePuzzle} the puzzle, with the updated cell information (return type is whatever
			 *	type `this` is)
			 */
			updateGrid: {
				writable: true,
				configurable: true,
				value: function updateGrid(grid = this.grid) {
					return setter(this, ["grid"], constructor.processGrid(grid));
				}
			},

			/**
			 * Sets the value of the specified cell and ensures that all cell information is kept up-to-date.
			 *
			 * @method
			 * @instance
			 * @memberof xpuz.PuzzleMixin
			 *
			 * @param {number} columnIndex - the column index of the cell to set
			 * @param {number} rowIndex - the row index of the cell to set
			 * @param {Types.GridCell|external:Immutable.Map<Types.GridCell>} - the cell information to set (this
			 *	replaces the existing cell information)
			 *
			 * @return {Puzzle|ImmutablePuzzle} the puzzle, with the updated cell information (return type is whatever
			 *	type `this` is)
			 */
			updateCell: {
				writable: true,
				configurable: true,
				value: function updateCell(columnIndex, rowIndex, cell) {
					const grid = setter(this.grid, [rowIndex, columnIndex], cell);

					return this.updateGrid(grid);
				}
			},
		}
	);

	Object.defineProperties(
		constructor,
		{
			/**
			 * Updates the specified grid with the correct cell information (clue numbers, etc.)
			 *
			 * @function
			 * @memberof xpuz.PuzzleMixin
			 *
			 * @param {Types.Grid|Types.ImmutableGrid} grid - the
			 *	grid to update
			 *
			 * @return {Puzzle|ImmutablePuzzle} the puzzle, with the updated cell information (return type is whatever
			 *	type `grid` is)
			 */
			processGrid: {
				writable: true,
				enumerable: true,
				value: function processGrid(grid) {
					const height = sizeOf(grid);
					const width = sizeOf(getter(grid, [0]));
					let clueNumber = 0;

					for (let rowIndex = 0; rowIndex < height; rowIndex++) {
						for (let columnIndex = 0; columnIndex < width; columnIndex++) {
							if (getter(grid, [rowIndex, columnIndex, "isBlockCell"])) {
								continue;
							}

							const args = {
								grid,
								width,
								height,
								rowIndex,
								columnIndex,
							};

							const cellClueNumber = hasClueNumber(args) ?
								++clueNumber :
								undefined;

							setter(grid, [rowIndex, columnIndex, "clueNumber"], cellClueNumber);

							setter(grid, [rowIndex, columnIndex, "containingClues"], findContainingClues(args));

						}
					}

					return grid;
				}
			}
		}
	);
}

exports = module.exports = PuzzleMixin;
