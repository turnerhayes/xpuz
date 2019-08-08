/// <reference types="node" />
import MutableJPZParser from "../../parsers/jpz";
import ImmutablePuzzle from "../puzzle";
export default class JPZParser extends MutableJPZParser<ImmutablePuzzle> {
    parse(path: string): Promise<ImmutablePuzzle>;
    generate(puzzle: ImmutablePuzzle): Promise<Buffer>;
}
//# sourceMappingURL=jpz.d.ts.map