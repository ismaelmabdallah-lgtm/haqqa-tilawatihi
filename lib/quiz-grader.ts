import {
  CutJoinQuestionData,
  FillBlanksQuestionData,
  OrderingQuestionData,
  QuestionType,
  TableQuestionData,
  ConditionalQuestionData,
} from "@/lib/quiz-types";

export type SubmittedAnswer = {
  questionId: number;
  answer: unknown;
};

export type GradeResult = {
  earnedPoints: number;
  maxPoints: number;
  isCorrect: boolean;
  review: Record<string, unknown>;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const clamp = (
  value: number,
  min: number,
  max: number
) =>
  Math.min(
    Math.max(value, min),
    max
  );

export function gradeQuestion(
  question: any,
  submitted: unknown
): GradeResult {
  const type =
    question.question_type as QuestionType;

  const maxPoints = Math.max(
    Number(question.points) || 0,
    0
  );

  /*
   * ==========================================
   * MCQ
   * ==========================================
   */

  if (type === "mcq") {
    const selected =
      typeof submitted === "string"
        ? submitted.toLowerCase()
        : null;

    const correct =
      selected !== null &&
      selected ===
        String(
          question.correct_option
        ).toLowerCase();

    return {
      earnedPoints: correct
        ? maxPoints
        : 0,

      maxPoints,

      isCorrect: correct,

      review: {
        type,

        selectedOption: selected,

        correctOption:
          question.correct_option,

        explanation:
          question.explanation ?? null,
      },
    };
  }

  /*
   * ==========================================
   * TABLE
   * ==========================================
   */

  if (type === "table") {
    const data =
      question.question_data as TableQuestionData;

    const answers =
      submitted &&
      typeof submitted === "object"
        ? (submitted as Record<
            string,
            string
          >)
        : {};

    let earned = 0;

    let total = 0;

    const cells: Record<
      string,
      unknown
    > = {};

    for (const row of data.rows) {
      for (const column of data.columns) {
        const cell =
          row.cells[column.id];

        if (!cell) {
          continue;
        }

        const points = Math.max(
          Number(cell.points) || 0,
          0
        );

        total += points;

        const key =
          `${row.id}:${column.id}`;

        const selected =
          answers[key] ?? null;

        const correct =
          selected ===
          cell.correctOptionId;

        if (correct) {
          earned += points;
        }

        cells[key] = {
          selected,

          correctOptionId:
            cell.correctOptionId,

          earned: correct
            ? points
            : 0,

          points,
        };
      }
    }

    return {
      earnedPoints: clamp(
        earned,
        0,
        total
      ),

      maxPoints: total,

      isCorrect:
        total > 0 &&
        earned === total,

      review: {
        type,
        cells,
      },
    };
  }

  /*
   * ==========================================
   * CUT / JOIN
   * ==========================================
   */

  if (type === "cut_join") {
    const data =
      question.question_data as CutJoinQuestionData;

    const answers =
      submitted &&
      typeof submitted === "object"
        ? (submitted as Record<
            string,
            {
              text?: string;
              surahId?: number | null;
            }
          >)
        : {};

    let earned = 0;

    let total = 0;

    const sections: Record<
      string,
      unknown
    > = {};

    for (const section of data.sections) {
      const textPoints =
        Math.max(
          Number(
            section.textPoints
          ) || 0,
          0
        );

      const surahPoints =
        Math.max(
          Number(
            section.surahPoints
          ) || 0,
          0
        );

      total +=
        textPoints +
        surahPoints;

      const submittedSection =
        answers[section.id] ?? {};

      const text =
        typeof submittedSection.text ===
        "string"
          ? submittedSection.text
          : "";

      const normalizedText =
        normalizeText(text);

      const keywords =
        section.acceptedKeywords
          .map(normalizeText)
          .filter(Boolean);

      const textCorrect =
        keywords.length > 0 &&
        keywords.some(
          (keyword) =>
            normalizedText.includes(
              keyword
            )
        );

      const surahCorrect =
        Number(
          submittedSection.surahId
        ) ===
        Number(
          section.correctSurahId
        );

      if (textCorrect) {
        earned += textPoints;
      }

      if (surahCorrect) {
        earned += surahPoints;
      }

      sections[section.id] = {
        textCorrect,

        surahCorrect,

        earned:
          (textCorrect
            ? textPoints
            : 0) +
          (surahCorrect
            ? surahPoints
            : 0),

        textPoints,

        surahPoints,
      };
    }

    return {
      earnedPoints: clamp(
        earned,
        0,
        total
      ),

      maxPoints: total,

      isCorrect:
        total > 0 &&
        earned === total,

      review: {
        type,
        sections,
      },
    };
  }

  /*
   * ==========================================
   * CONDITIONAL
   * ==========================================
   */

  if (type === "conditional") {
    const data =
      question.question_data as ConditionalQuestionData;

    const answers =
      submitted &&
      typeof submitted === "object"
        ? (submitted as Record<
            string,
            string
          >)
        : {};

    let nodeId:
      | string
      | null =
      data.startNodeId;

    let earned = 0;

    let total = 0;

    const visited: Record<
      string,
      unknown
    > = {};

    const guard =
      new Set<string>();

    while (
      nodeId &&
      !guard.has(nodeId)
    ) {
      guard.add(nodeId);

      const node =
        data.nodes.find(
          (item) =>
            item.id === nodeId
        );

      if (!node) {
        break;
      }

      const points =
        Math.max(
          Number(node.points) || 0,
          0
        );

      total += points;

      const selected =
        answers[node.id] ?? null;

      const correct =
        selected ===
        node.correctOptionId;

      if (correct) {
        earned += points;
      }

      const nextNodeId =
        selected &&
        node.nextByOption
          ? node.nextByOption[
              selected
            ] ?? null
          : null;

      visited[node.id] = {
        selected,

        correctOptionId:
          node.correctOptionId,

        correct,

        earned: correct
          ? points
          : 0,

        points,
      };

      nodeId = nextNodeId;
    }

    return {
      earnedPoints: clamp(
        earned,
        0,
        total
      ),

      maxPoints: total,

      isCorrect:
        total > 0 &&
        earned === total,

      review: {
        type,
        visited,
      },
    };
  }

  /*
   * ==========================================
   * ORDERING
   * ==========================================
   */

  if (type === "ordering") {
    const data =
      question.question_data as OrderingQuestionData;

    const answer =
      Array.isArray(submitted)
        ? submitted.map(String)
        : [];

    const totalPoints =
      Math.max(
        Number(data.points) ||
          maxPoints,
        0
      );

    const expected =
      data.correctOrder;

    let earned = 0;

    if (data.partialCredit) {
      const perItem =
        expected.length > 0
          ? totalPoints /
            expected.length
          : 0;

      expected.forEach(
        (id, index) => {
          if (
            answer[index] === id
          ) {
            earned += perItem;
          }
        }
      );
    } else {
      earned =
        JSON.stringify(
          answer
        ) ===
        JSON.stringify(
          expected
        )
          ? totalPoints
          : 0;
    }

    return {
      earnedPoints: clamp(
        earned,
        0,
        totalPoints
      ),

      maxPoints: totalPoints,

      isCorrect:
        earned === totalPoints,

      review: {
        type,

        submittedOrder:
          answer,

        correctOrder:
          expected,
      },
    };
  }

  /*
   * ==========================================
   * FILL BLANKS
   * ==========================================
   */

  if (type === "fill_blanks") {
    const data =
      question.question_data as FillBlanksQuestionData;

    const answers =
      submitted &&
      typeof submitted === "object"
        ? (submitted as Record<
            string,
            string
          >)
        : {};

    let earned = 0;

    let total = 0;

    const blanks: Record<
      string,
      unknown
    > = {};

    const used =
      new Set<string>();

    for (const blank of data.blanks) {
      const points =
        Math.max(
          Number(blank.points) || 0,
          0
        );

      total += points;

      const selected =
        answers[blank.id] ?? null;

      const correct =
        selected ===
        blank.correctAnswerId;

      let valid = correct;

      if (
        !data.allowReuse &&
        selected
      ) {
        if (
          used.has(selected)
        ) {
          valid = false;
        }

        used.add(selected);
      }

      if (valid) {
        earned += points;
      }

      blanks[blank.id] = {
        selected,

        correctAnswerId:
          blank.correctAnswerId,

        correct: valid,

        earned: valid
          ? points
          : 0,

        points,
      };
    }

    return {
      earnedPoints: clamp(
        earned,
        0,
        total
      ),

      maxPoints: total,

      isCorrect:
        total > 0 &&
        earned === total,

      review: {
        type,
        blanks,
      },
    };
  }

  /*
   * ==========================================
   * UNKNOWN
   * ==========================================
   */

  return {
    earnedPoints: 0,

    maxPoints,

    isCorrect: false,

    review: {
      type: "unknown",
    },
  };
}