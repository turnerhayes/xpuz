"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const buffer_reader_1 = __importDefault(require("buffer-reader"));
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const ENCODING = "ISO-8859-1";
const INT16_BYTE_COUNT = 2;
const INT32_BYTE_COUNT = 4;
const DEFAULT_STRING_BUFFER_LENGTH = 20;
class PUZReader {
    constructor(puz) {
        let buffer;
        if (typeof puz === "string") {
            // filename
            buffer = fs_1.default.readFileSync(puz);
        }
        else if (puz instanceof Buffer) {
            // Already a buffer
            buffer = puz;
        }
        else if (puz instanceof ArrayBuffer) {
            // ArrayBuffer--probably from client-side JS
            buffer = new Buffer(new Uint8Array(puz));
        }
        else {
            throw new Error("Cannot construct PUZReader: unknown argument type");
        }
        this.bufferReader = new buffer_reader_1.default(buffer);
        this.bufferSize = buffer.length;
    }
    readValues(length) {
        return this.bufferReader.nextBuffer(length);
    }
    seek(position, relativeTo) {
        relativeTo = relativeTo || { start: true };
        if (relativeTo.start) {
            this.bufferReader.seek(position);
        }
        else if (relativeTo.current) {
            this.bufferReader.move(position);
        }
        return this;
    }
    readUInt8() {
        return this.readValues(1).readUInt8(0);
    }
    readUInt16() {
        return this.readValues(INT16_BYTE_COUNT).readUInt16LE(0);
    }
    readUInt32() {
        return this.readValues(INT32_BYTE_COUNT).readUInt32LE(0);
    }
    readString(length) {
        let bufferLength = length || DEFAULT_STRING_BUFFER_LENGTH;
        const size = this.size();
        const currentPosition = this.tell();
        if (currentPosition + bufferLength > size) {
            bufferLength = size - currentPosition;
        }
        if (bufferLength === 0) {
            return "";
        }
        const buffer = this.readValues(bufferLength);
        let str = iconv_lite_1.default.decode(buffer, ENCODING);
        if (length) {
            return str;
        }
        const nullIndex = str.indexOf("\0");
        if (nullIndex >= 0) {
            const nullOffset = nullIndex - str.length;
            if (nullOffset < 0) {
                this.seek(nullOffset + 1, { current: true });
                str = str.substring(0, nullIndex);
            }
        }
        else {
            str = str + this.readString();
        }
        return str;
    }
    size() {
        return this.bufferSize;
    }
    tell() {
        return this.bufferReader.tell();
    }
}
PUZReader.ENCODING = ENCODING;
exports.default = PUZReader;
//# sourceMappingURL=puz-reader.js.map