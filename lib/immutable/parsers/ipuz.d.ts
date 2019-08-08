import MutableIPUZParser, { IIPUZPuzzle } from "../../parsers/ipuz";
import ImmutablePuzzle from "../puzzle";
export default class IPUZParser extends MutableIPUZParser<ImmutablePuzzle> {
    parse(input: string | IIPUZPuzzle): Promise<ImmutablePuzzle>;
    generate(puzzle: ImmutablePuzzle): Promise<IIPUZPuzzle>;
}
//# sourceMappingURL=ipuz.d.ts.map