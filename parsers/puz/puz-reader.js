"use strict";

var _            = require('lodash');
var Q            = require('q');
var BinaryReader = require('binary-reader');
var BufferReader = require('buffer-reader');
var iconv        = require('iconv-lite');

var ENCODING = 'ISO-8859-1';

function PUZReader(puz) {
	if (!(this instanceof PUZReader)) {
		return new PUZReader(puz);
	}

	var reader = this;

	var deferred = Q.defer();

	var _buffer;

	Object.defineProperties(
		reader,
		{
			deferred: {
				value: deferred
			},

			promise: {
				enumerable: true,
				value: deferred.promise
			}
		}
	);

	if (_.isString(puz)) {
		// filename
		Object.defineProperty(
			reader,
			'_reader',
			{
				value: BinaryReader.open(puz)
					.on("error", function(err) {
						deferred.reject(err);
					}).on("close", function() {
						deferred.resolve();
					})
			}
		);
	}

	if (!reader._reader) {
		if (puz instanceof Buffer) {
			_buffer = puz;
		}
		else if (puz instanceof ArrayBuffer) {
			_buffer = new Buffer(new Uint8Array(puz));
		}

		if (_buffer) {
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
	}
}

PUZReader.prototype = Object.create(Object.prototype, {
	_readValues: {
		value: function(length) {
			var reader = this;
			var deferred = Q.defer();
			var values;

			if (reader._reader) {
				if (reader._reader.isEOF()) {
					deferred.reject('Cannot read past end of file');
				}
				else {
					reader._reader.read(length, function(bytesRead, buffer) {
						if (bytesRead === 0) {
							deferred.reject('0 bytes read');

							return;
						}

						deferred.resolve(buffer);
					});
				}
			}
			else if (reader._bufferReader) {
				deferred.resolve(reader._bufferReader.nextBuffer(length));
			}

			return deferred.promise;
		}
	},

	_seek: {
		value: function(position, relativeTo) {
			var reader = this;
			var deferred = Q.defer();

			relativeTo = relativeTo || { start: true, };

			if (reader._reader) {
				reader._reader.seek(position, relativeTo, function() {
					deferred.resolve();
				});
			}
			else if (reader._bufferReader) {
				if (relativeTo.start) {
					reader._bufferReader.seek(position);
				}
				else if (relativeTo.current) {
					reader._bufferReader.move(position);
				}
				deferred.resolve();
			}

			return deferred.promise;
		}
	},

	_readUInt8: {
		value: function() {
			return this._readValues(1).then(
				function(buffer) {
					return buffer.readUInt8(0);
				}
			);
		}
	},

	_readUInt16: {
		value: function() {
			return this._readValues(2).then(
				function(buffer) {
					return buffer.readUInt16LE(0);
				}
			);
		}
	},

	_readUInt32: {
		value: function() {
			return this._readValues(4).then(
				function(buffer) {
					return buffer.readUInt32LE(0);
				}
			);
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

			return reader._readValues(bufferLength).then(
				function(buffer) {
					var str = iconv.decode(buffer, ENCODING);

					if (length) {
						return str;
					}

					var nullIndex = str.indexOf('\0');
					var nullOffset;

					if (nullIndex >= 0) {
						nullOffset = nullIndex - str.length;

						if (nullOffset < 0) {
							return reader._seek(nullOffset + 1, { current: true }).then(
								function() {
									return str.substring(0, nullIndex);
								}
							);
						}

						return str;
					}

					return reader._readString().then(
						function(nextString) {
							return str + nextString;
						}
					);
				}
			);
		}
	},

	size: {
		value: function() {
			var reader = this;

			if (reader._reader) {
				return reader._reader.size();
			}
			else if (reader._bufferReader) {
				return reader._bufferSize;
			}
		}
	},

	tell: {
		value: function() {
			var reader = this;

			if (reader._reader) {
				return reader._reader.tell();
			}
			else if (reader._bufferReader) {
				return reader._bufferReader.tell();
			}
		}
	},

	close: {
		value: function() {
			var reader = this;

			if (reader._reader) {
				reader._reader.close();
			}
			else if (reader._bufferReader) {
				reader.deferred.resolve();
			}
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
