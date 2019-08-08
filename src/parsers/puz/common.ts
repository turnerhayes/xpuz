export enum PuzzleType {
  Normal = 0x0001,
	Diagramless = 0x0401,
}

export enum SolutionState {
  // solution is available in plaintext
	Unlocked = 0x0000,
	// solution is locked (scrambled) with a key
	Locked = 0x0004,
}

export interface IHeaderData {
  version: string;
  width: number;
  height: number;
  numberOfClues: number;
  puzzleType: PuzzleType;
  solutionState: SolutionState;
}

export type ExtensionName = "GRBS"|"RTBL"|"LTIM"|"GEXT"|"RUSR";
