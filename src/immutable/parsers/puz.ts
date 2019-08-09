import MutablePUZParser, { PuzzleContent } from "../../parsers/puz";
import ImmutablePuzzle from "../puzzle";
import { toImmutable, toMutable } from "../utils";

export default class PUZParser extends MutablePUZParser<ImmutablePuzzle> {
  public parse(
    path: PuzzleContent,
    options: {
      solutionKey?: string,
    } = {}
  ) {
    return super.parse(
      path,
      {
        ...options,
        converter: toImmutable,
      }
    );
  }
}
