"use strict";

var _            = require('lodash');
var Q            = require('q');
var fs           = require('fs');
var BufferReader = require('buffer-reader');
var iconv        = require('iconv-lite');

var ENCODING = 'ISO-8859-1';

function PUZReader(puz) {
	if (!(this instanceof PUZReader)) {
		return new PUZReader(puz);
	}

	var reader = this;

	var _buffer;

	if (_.isString(puz)) {
		// filename
		_buffer = fs.readFileSync(puz);
	}
	else if (puz instanceof Buffer) {
		// Already a buffer
		_buffer = puz;
	}
	else if (puz instanceof ArrayBuffer) {
		// ArrayBuffer--probably from client-side JS
		_buffer = new Buffer(new Uint8Array(puz));
	}

	Object.defineProperties(
		reader,
		{
			_bufferReader: {
				value: new BufferReader(_buffer)
			},

			_bufferSize: {
				value: _buffer.length
			}
		}
	);
}

PUZReader.prototype = Object.create(Object.prototype, {
	_readValues: {
		value: function(length) {
			var reader = this;

			return reader._bufferReader.nextBuffer(length);
		}
	},

	_seek: {
		value: function(position, relativeTo) {
			var reader = this;

			relativeTo = relativeTo || { start: true, };

			if (relativeTo.start) {
				reader._bufferReader.seek(position);
			}
			else if (relativeTo.current) {
				reader._bufferReader.move(position);
			}

			return reader;
		}
	},

	_readUInt8: {
		value: function() {
			return this._readValues(1).readUInt8(0);
		}
	},

	_readUInt16: {
		value: function() {
			return this._readValues(2).readUInt16LE(0);
		}
	},

	_readUInt32: {
		value: function() {
			return this._readValues(4).readUInt32LE(0);
		}
	},

	_readString: {
		value: function(length) {
			var reader = this;
			var bufferLength = length || 20;

			var size = reader.size();
			var currentPosition = reader.tell();

			if (currentPosition + bufferLength > size) {
				bufferLength = size - currentPosition;
			}

			if (bufferLength === 0) {
				return '';
			}

			var buffer = reader._readValues(bufferLength);
			var str = iconv.decode(buffer, ENCODING);

			if (length) {
				return str;
			}

			var nullIndex = str.indexOf('\0');
			var nullOffset;

			if (nullIndex >= 0) {
				nullOffset = nullIndex - str.length;

				if (nullOffset < 0) {
					reader._seek(nullOffset + 1, { current: true });

					str = str.substring(0, nullIndex);
				}
			}
			else {
				str = str + reader._readString();
			}

			return str;
		}
	},

	size: {
		value: function() {
			var reader = this;

			return reader._bufferSize;
		}
	},

	tell: {
		value: function() {
			var reader = this;

			return reader._bufferReader.tell();
		}
	}
});

Object.defineProperties(
	PUZReader,
	{
		ENCODING: {
			value: ENCODING
		}
	}
);

module.exports = exports = PUZReader;
