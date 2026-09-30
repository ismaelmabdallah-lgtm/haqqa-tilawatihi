export type QuestionType =
  | "mcq"
  | "table"
  | "cut_join"
  | "conditional"
  | "ordering"
  | "fill_blanks";

export type Difficulty = "easy" | "medium" | "advanced";

export type CellOption = {
  id: string;
  text: string;
};

export type TableCell = {
  id: string;
  options: CellOption[];
  correctOptionId: string;
  points: number;
};

export type TableQuestionData = {
  columns: {
    id: string;
    title: string;
  }[];

  rows: {
    id: string;
    label: string;
    cells: Record<string, TableCell>;
  }[];
};

export type CutJoinSection = {
  id: string;

  type:
    | "cut"
    | "joined"
    | "disputed";

  title: string;

  textPoints: number;

  surahPoints: number;

  acceptedKeywords: string[];

  correctSurahId: number;
};

export type CutJoinQuestionData = {
  sections: CutJoinSection[];
};

export type ConditionalNodeOption = {
  id: string;
  text: string;
  nextNodeId: string | null;
};

export type ConditionalNode = {
  id: string;

  prompt: string;

  options: {
    id: string;
    text: string;
  }[];

  correctOptionId: string;

  points: number;

  nextByOption: Record<
    string,
    string | null
  >;
};

export type ConditionalQuestionData = {
  startNodeId: string;

  nodes: ConditionalNode[];
};

export type OrderingQuestionData = {
  items: {
    id: string;
    text: string;
  }[];

  correctOrder: string[];

  points: number;

  partialCredit: boolean;
};

export type FillBlank = {
  id: string;

  points: number;

  correctAnswerId: string;
};

export type FillBlanksQuestionData = {
  parts: Array<
    | {
        type: "text";
        value: string;
      }
    | {
        type: "blank";
        blankId: string;
      }
  >;

  answerBank: {
    id: string;
    text: string;
  }[];

  blanks: FillBlank[];

  allowReuse: boolean;
};

export type QuestionData =
  | TableQuestionData
  | CutJoinQuestionData
  | ConditionalQuestionData
  | OrderingQuestionData
  | FillBlanksQuestionData
  | Record<string, never>;

export type PublicQuestion = {
  id: number;

  number: number;

  chapterId: number;

  questionText: string;

  questionType: QuestionType;

  points: number;

  data: unknown;

  options?: {
    key: string;
    text: string;
  }[];
};