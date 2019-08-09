import MutableJPZParser from "../../parsers/jpz";
import ImmutablePuzzle from "../puzzle";
import { toImmutable, toMutable } from "../utils";

export default class JPZParser extends MutableJPZParser<ImmutablePuzzle> {
  public parse(path: string) {
    return super.parse(
      path,
      {
        converter: toImmutable,
      }
    );
  }

  public generate(puzzle: ImmutablePuzzle) {
    return super.generate(
      puzzle,
      {
        preprocessor: toMutable,
      }
    );
  }
}
