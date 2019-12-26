function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var hashIt = require("hash-it");

var get = require("lodash/get");

var set = require("lodash/set");

var size = require("lodash/size");
/**
 * Provides common functionality for {@link xpuz.ImmutablePuzzle} and {@link xpuz.Puzzle} classes.
 *
 * @mixin
 * @memberof xpuz
 *
 * @return {void}
 */


function PuzzleMixin(_ref) {
  var _Object$definePropert;

  var constructor = _ref.constructor,
      equalityTest = _ref.equalityTest,
      _ref$getter = _ref.getter,
      getter = _ref$getter === void 0 ? get : _ref$getter,
      _ref$setter = _ref.setter,
      setter = _ref$setter === void 0 ? set : _ref$setter,
      _ref$sizeOf = _ref.sizeOf,
      sizeOf = _ref$sizeOf === void 0 ? size : _ref$sizeOf;
  var constructorName = constructor.name;
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

  function findContainingClues(_ref2) {
    var grid = _ref2.grid,
        width = _ref2.width,
        height = _ref2.height,
        rowIndex = _ref2.rowIndex,
        columnIndex = _ref2.columnIndex;
    var containingClues = {};
    var clueNumber = getter(grid, [rowIndex, columnIndex, "clueNumber"]);

    if (clueNumber !== void 0) {
      // This cell is a clue number cell--it defines either
      // its across clue number or its down clue number (or
      // both)
      if ( // This is either at the left edge of the puzzle or
      // is bounded on the left by a block cell. This clue
      // number defines (at least) the cell's across clue number
      (columnIndex === 0 || getter(grid, [rowIndex, columnIndex - 1, "isBlockCell"])) && // There is at least one fillable cell to the right
      columnIndex < width - 1 && !getter(grid, [rowIndex, columnIndex + 1, "isBlockCell"])) {
        containingClues.across = clueNumber;
      } else if ( // There is at least one fillable cell below this
      rowIndex < height - 1 && !getter(grid, [rowIndex + 1, columnIndex, "isBlockCell"])) {
        // At least one cell exists to the left of this cell; this
        // is not an across clue number. It must be a down clue number.
        containingClues.down = clueNumber;
      }
    }

    if (!containingClues.across) {
      // Haven't found the across clue number yet.
      // Look to the left until we find a block cell or the edge of
      // the puzzle
      if ( // At the left edge of the puzzle and there's a clue number
      columnIndex === 0 && clueNumber !== void 0 && // There is at least one fillable cell to the right
      !getter(grid, [rowIndex, columnIndex + 1, "isBlockCell"])) {
        containingClues.across = clueNumber;
      } else {
        for (var i = columnIndex - 1; i >= 0; i--) {
          if (getter(grid, [rowIndex, i, "isBlockCell"])) {
            break;
          }

          if ( // There is at least one fillable cell to the right
          i < width - 1 && !getter(grid, [rowIndex, i + 1, "isBlockCell"])) {
            containingClues.across = getter(grid, [rowIndex, i, "clueNumber"]);
          }
        }
      }
    }

    if (!containingClues.down) {
      // Look at cells in other rows at the same index until we find a
      // cell with a clue number
      if ( // At the top of the puzzle and there is a clue number
      rowIndex === 0 && clueNumber !== void 0 && // There is at least one fillable cell below it
      !getter(grid, [rowIndex + 1, columnIndex, "isBlockCell"])) {
        containingClues.down = clueNumber;
      } else {
        for (var _i = rowIndex; _i >= 0; _i--) {
          if (getter(grid, [_i, columnIndex, "isBlockCell"])) {
            break;
          }

          if ( // There is at least one fillable cell below it
          _i < height - 1 && !getter(grid, [_i + 1, columnIndex, "isBlockCell"])) {
            containingClues.down = getter(grid, [_i, columnIndex, "clueNumber"]);
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


  function hasClueNumber(_ref3) {
    var grid = _ref3.grid,
        width = _ref3.width,
        height = _ref3.height,
        rowIndex = _ref3.rowIndex,
        columnIndex = _ref3.columnIndex;

    if (getter(grid, [rowIndex, columnIndex, "isBlockCell"])) {
      return void 0;
    }

    if ((columnIndex === 0 || getter(grid, [rowIndex, columnIndex - 1, "isBlockCell"])) && columnIndex + 1 < width && !getter(grid, [rowIndex, columnIndex + 1, "isBlockCell"])) {
      // This cell is adjacent to the puzzle edge or a block cell on the left,
      // and has at least one input cell to its right--this cell starts an across clue
      return true;
    }

    if ((rowIndex === 0 || getter(grid, [rowIndex - 1, columnIndex, "isBlockCell"])) && rowIndex + 1 < height && !getter(grid, [rowIndex + 1, columnIndex, "isBlockCell"])) {
      // This cell is adjacent to the puzzle edge or a block cell on the top,
      // and has at least one input cell below it--this cell starts a down clue
      return true;
    }

    return false;
  }

  Object.defineProperties(constructor.prototype, (_Object$definePropert = {
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

        return equalityTest(this.grid, other.grid) && equalityTest(this.clues, other.clues) && equalityTest(this.userSolution, other.userSolution) && equalityTest(this.info, other.info) && equalityTest(this.extensions, other.extensions);
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
    }
  }, _defineProperty(_Object$definePropert, Symbol.toStringTag, {
    configurable: true,
    get: function get() {
      return constructorName;
    }
  }), _defineProperty(_Object$definePropert, "updateGrid", {
    writable: true,
    configurable: true,
    value: function updateGrid() {
      var grid = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.grid;
      return setter(this, ["grid"], constructor.processGrid(grid));
    }
  }), _defineProperty(_Object$definePropert, "updateCell", {
    writable: true,
    configurable: true,
    value: function updateCell(columnIndex, rowIndex, cell) {
      var grid = setter(this.grid, [rowIndex, columnIndex], cell);
      return this.updateGrid(grid);
    }
  }), _Object$definePropert));
  Object.defineProperties(constructor, {
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
        var height = sizeOf(grid);
        var width = sizeOf(getter(grid, [0]));
        var clueNumber = 0;

        for (var rowIndex = 0; rowIndex < height; rowIndex++) {
          for (var columnIndex = 0; columnIndex < width; columnIndex++) {
            if (getter(grid, [rowIndex, columnIndex, "isBlockCell"])) {
              setter(grid, [rowIndex, columnIndex, "clueNumber"], void 0);
              setter(grid, [rowIndex, columnIndex, "containingClues"], void 0);
              continue;
            }

            var args = {
              grid: grid,
              width: width,
              height: height,
              rowIndex: rowIndex,
              columnIndex: columnIndex
            };
            var cellClueNumber = hasClueNumber(args) ? ++clueNumber : void 0;
            setter(grid, [rowIndex, columnIndex, "clueNumber"], cellClueNumber);
            setter(grid, [rowIndex, columnIndex, "containingClues"], findContainingClues(args));
          }
        }

        return grid;
      }
    }
  });
}

exports = module.exports = PuzzleMixin;
//# sourceMappingURL=puzzle-mixin.js.map