import BufferReader from "buffer-reader";
import fs from "fs";
import iconv from "iconv-lite";
import isString from "lodash/isString";

const ENCODING = "ISO-8859-1";

const INT16_BYTE_COUNT = 2;

const INT32_BYTE_COUNT = 4;

const DEFAULT_STRING_BUFFER_LENGTH = 20;

export default class PUZReader {
  public static ENCODING = ENCODING;

  private bufferReader: BufferReader;

  private bufferSize: number;

  constructor(puz: string|Buffer|ArrayBuffer) {
    let buffer: Buffer;

    if (typeof puz === "string") {
      // filename
      buffer = fs.readFileSync(puz);
    } else if (puz instanceof Buffer) {
      // Already a buffer
      buffer = puz;
    } else if (puz instanceof ArrayBuffer) {
      // ArrayBuffer--probably from client-side JS
      buffer = new Buffer(new Uint8Array(puz));
    } else {
      throw new Error("Cannot construct PUZReader: unknown argument type");
    }

    this.bufferReader = new BufferReader(buffer);

    this.bufferSize = buffer.length;
  }

  public readValues(length: number): Buffer {
    return this.bufferReader.nextBuffer(length);
  }

  public seek(
    position: number,
    relativeTo: {
      start: true,
    } | {
      current: true,
    }
  ): this {
    relativeTo = relativeTo || { start: true };

    if ((relativeTo as {start: true}).start) {
      this.bufferReader.seek(position);
    } else if ((relativeTo as {current: true}).current) {
      this.bufferReader.move(position);
    }

    return this;
  }

  public readUInt8(): number {
    return this.readValues(1).readUInt8(0);
  }

  public readUInt16(): number {
    return this.readValues(INT16_BYTE_COUNT).readUInt16LE(0);
  }

  public readUInt32(): number {
    return this.readValues(INT32_BYTE_COUNT).readUInt32LE(0);
  }

  public readString(length?: number): string {
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
    let str = iconv.decode(buffer, ENCODING);

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
    } else {
      str = str + this.readString();
    }

    return str;
  }

  public size() {
    return this.bufferSize;
  }

  public tell() {
    return this.bufferReader.tell();
  }
}
