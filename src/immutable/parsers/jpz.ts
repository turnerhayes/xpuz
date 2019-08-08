import MutableJPZParser from "../../parsers/jpz";
import { toImmutable, toMutable } from "../utils";
import ImmutablePuzzle from "../puzzle";

export default class JPZParser extends MutableJPZParser<ImmutablePuzzle> {
	parse(path: string) {
		return super.parse(
			path,
			{
				converter: toImmutable,
			}
		);
	}

	generate(puzzle: ImmutablePuzzle) {
		return super.generate(
			puzzle,
			{
				preprocessor: toMutable,
			}
		);
	}
}
