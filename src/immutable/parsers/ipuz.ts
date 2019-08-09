import MutableIPUZParser, { IIPUZPuzzle } from "../../parsers/ipuz";
import ImmutablePuzzle from "../puzzle";
import {toImmutable, toMutable} from "../utils";

export default class IPUZParser extends MutableIPUZParser<ImmutablePuzzle> {
  public parse(input: string|IIPUZPuzzle) {
    return super.parse(
      input,
      {
        converter: toImmutable,
      }
    );
  }

  public generate(puzzle: ImmutablePuzzle): Promise<IIPUZPuzzle> {
    return super.generate(
      puzzle,
      {
        preprocessor: toMutable,
      }
    );
  }
}
