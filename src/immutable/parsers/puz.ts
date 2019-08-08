import MutablePUZParser, { PuzzleContent } from "../../parsers/puz";
import { toImmutable, toMutable } from "../utils";
import ImmutablePuzzle from "../puzzle";

export default class PUZParser extends MutablePUZParser<ImmutablePuzzle> {
	parse(
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
