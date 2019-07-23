/// <reference types="node" />
declare class PUZReader {
    static ENCODING: string;
    private bufferReader;
    private bufferSize;
    constructor(puz: string | Buffer | ArrayBuffer);
    readValues(length: number): Buffer;
    seek(position: number, relativeTo: {
        start: true;
    } | {
        current: true;
    }): this;
    readUInt8(): number;
    readUInt16(): number;
    readUInt32(): number;
    readString(length?: number): string;
    size(): number;
    tell(): number;
}
export default PUZReader;
//# sourceMappingURL=puz-reader.d.ts.map