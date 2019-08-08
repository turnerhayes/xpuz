import MutableIPUZParser, { IIPUZPuzzle } from "../../parsers/ipuz";
import {toImmutable, toMutable} from "../utils";
import ImmutablePuzzle from "../puzzle";

export default class IPUZParser extends MutableIPUZParser<ImmutablePuzzle> {
	parse(input: string|IIPUZPuzzle) {
		return super.parse(
			input,
			{
				converter: toImmutable,
			}
		);
	}

	generate(puzzle: ImmutablePuzzle): Promise<IIPUZPuzzle> {
		return super.generate(
			puzzle,
			{
				preprocessor: toMutable,
			}
		);
	}
}
