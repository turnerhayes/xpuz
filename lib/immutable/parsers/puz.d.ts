import MutablePUZParser, { PuzzleContent } from "../../parsers/puz";
import ImmutablePuzzle from "../puzzle";
export default class PUZParser extends MutablePUZParser<ImmutablePuzzle> {
    parse(path: PuzzleContent, options?: {
        solutionKey?: string;
    }): Promise<ImmutablePuzzle>;
}
//# sourceMappingURL=puz.d.ts.map