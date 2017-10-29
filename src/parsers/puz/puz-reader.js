const isString     = require("lodash/isString");
const fs           = require("fs");
const BufferReader = require("buffer-reader");
const iconv        = require("iconv-lite");

const ENCODING = "ISO-8859-1";

const INT16_BYTE_COUNT = 2;

const INT32_BYTE_COUNT = 4;

const DEFAULT_STRING_BUFFER_LENGTH = 20;

class PUZReader {
	static ENCODING = ENCODING

	constructor(puz) {
		let _buffer;

		if (isString(puz)) {
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

		this._bufferReader = new BufferReader(_buffer);

		this._bufferSize = _buffer.length;
	}

	_readValues = (length) => this._bufferReader.nextBuffer(length)

	_seek = (position, relativeTo) => {
		relativeTo = relativeTo || { start: true };

		if (relativeTo.start) {
			this._bufferReader.seek(position);
		}
		else if (relativeTo.current) {
			this._bufferReader.move(position);
		}

		return this;
	}

	_readUInt8 = () => this._readValues(1).readUInt8(0)

	_readUInt16 = () => this._readValues(INT16_BYTE_COUNT).readUInt16LE(0)

	_readUInt32 = () => this._readValues(INT32_BYTE_COUNT).readUInt32LE(0)

	_readString = (length) => {
		let bufferLength = length || DEFAULT_STRING_BUFFER_LENGTH;

		const size = this.size();
		const currentPosition = this.tell();

		if (currentPosition + bufferLength > size) {
			bufferLength = size - currentPosition;
		}

		if (bufferLength === 0) {
			return "";
		}

		const buffer = this._readValues(bufferLength);
		let str = iconv.decode(buffer, ENCODING);

		if (length) {
			return str;
		}

		const nullIndex = str.indexOf("\0");

		if (nullIndex >= 0) {
			const nullOffset = nullIndex - str.length;

			if (nullOffset < 0) {
				this._seek(nullOffset + 1, { current: true });

				str = str.substring(0, nullIndex);
			}
		}
		else {
			str = str + this._readString();
		}

		return str;
	}

	size = () => this._bufferSize

	tell = () => this._bufferReader.tell()
}

module.exports = exports = PUZReader;
