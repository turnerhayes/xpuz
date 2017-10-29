"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var isString = require("lodash/isString");
var fs = require("fs");
var BufferReader = require("buffer-reader");
var iconv = require("iconv-lite");

var ENCODING = "ISO-8859-1";

var INT16_BYTE_COUNT = 2;

var INT32_BYTE_COUNT = 4;

var DEFAULT_STRING_BUFFER_LENGTH = 20;

var PUZReader = function PUZReader(puz) {
	var _this = this;

	_classCallCheck(this, PUZReader);

	this._readValues = function (length) {
		return _this._bufferReader.nextBuffer(length);
	};

	this._seek = function (position, relativeTo) {
		relativeTo = relativeTo || { start: true };

		if (relativeTo.start) {
			_this._bufferReader.seek(position);
		} else if (relativeTo.current) {
			_this._bufferReader.move(position);
		}

		return _this;
	};

	this._readUInt8 = function () {
		return _this._readValues(1).readUInt8(0);
	};

	this._readUInt16 = function () {
		return _this._readValues(INT16_BYTE_COUNT).readUInt16LE(0);
	};

	this._readUInt32 = function () {
		return _this._readValues(INT32_BYTE_COUNT).readUInt32LE(0);
	};

	this._readString = function (length) {
		var bufferLength = length || DEFAULT_STRING_BUFFER_LENGTH;

		var size = _this.size();
		var currentPosition = _this.tell();

		if (currentPosition + bufferLength > size) {
			bufferLength = size - currentPosition;
		}

		if (bufferLength === 0) {
			return "";
		}

		var buffer = _this._readValues(bufferLength);
		var str = iconv.decode(buffer, ENCODING);

		if (length) {
			return str;
		}

		var nullIndex = str.indexOf("\0");

		if (nullIndex >= 0) {
			var nullOffset = nullIndex - str.length;

			if (nullOffset < 0) {
				_this._seek(nullOffset + 1, { current: true });

				str = str.substring(0, nullIndex);
			}
		} else {
			str = str + _this._readString();
		}

		return str;
	};

	this.size = function () {
		return _this._bufferSize;
	};

	this.tell = function () {
		return _this._bufferReader.tell();
	};

	var _buffer = void 0;

	if (isString(puz)) {
		// filename
		_buffer = fs.readFileSync(puz);
	} else if (puz instanceof Buffer) {
		// Already a buffer
		_buffer = puz;
	} else if (puz instanceof ArrayBuffer) {
		// ArrayBuffer--probably from client-side JS
		_buffer = new Buffer(new Uint8Array(puz));
	}

	this._bufferReader = new BufferReader(_buffer);

	this._bufferSize = _buffer.length;
};

PUZReader.ENCODING = ENCODING;


module.exports = exports = PUZReader;
//# sourceMappingURL=puz-reader.js.map