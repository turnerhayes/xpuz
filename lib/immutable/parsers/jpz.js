var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === void 0) { var parent = Object.getPrototypeOf(object); if (parent === null) { return void 0; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === void 0) { return void 0; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MutableJPZParser = require("../../parsers/jpz");
var Utils = require("../utils");

var JPZParser = function (_MutableJPZParser) {
	_inherits(JPZParser, _MutableJPZParser);

	function JPZParser() {
		_classCallCheck(this, JPZParser);

		return _possibleConstructorReturn(this, (JPZParser.__proto__ || Object.getPrototypeOf(JPZParser)).apply(this, arguments));
	}

	_createClass(JPZParser, [{
		key: "parse",
		value: function parse() {
			var _get2;

			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}

			return (_get2 = _get(JPZParser.prototype.__proto__ || Object.getPrototypeOf(JPZParser.prototype), "parse", this)).call.apply(_get2, [this].concat(args)).then(Utils.toImmutable);
		}
	}, {
		key: "generate",
		value: function generate(puzzle) {
			return _get(JPZParser.prototype.__proto__ || Object.getPrototypeOf(JPZParser.prototype), "generate", this).call(this, Utils.toMutable(puzzle));
		}
	}]);

	return JPZParser;
}(MutableJPZParser);

module.exports = JPZParser;
//# sourceMappingURL=jpz.js.map