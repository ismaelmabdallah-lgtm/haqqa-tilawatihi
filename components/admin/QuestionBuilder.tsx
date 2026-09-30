"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CellOption,
  ConditionalNode,
  ConditionalQuestionData,
  CutJoinSection,
  Difficulty,
  FillBlanksQuestionData,
  OrderingQuestionData,
  QuestionType,
  TableCell,
  TableQuestionData,
} from "@/lib/quiz-types";

type Chapter = {
  id: number;
  title: string;
  sort_order?: number;
};

type Question = {
  id: number;
  level_id: number;
  chapter_id: number;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_option: string | null;
  explanation: string | null;
  difficulty: Difficulty;
  is_active: boolean;
  question_type: QuestionType;
  points: number;
  question_data: unknown;
};

type QuestionBuilderProps = {
  levelId: number;
  chapters: Chapter[];
  question?: Question | null;
  onSaved?: () => void;
  onCancel?: () => void;
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "ضع دائرة",
  table: "جدول",
  cut_join: "المقطوع والموصول والتاءات",
  conditional: "سؤال متسلسل / شرطي",
  ordering: "ترتيب",
  fill_blanks: "ملء الفراغات",
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "سهل",
  medium: "متوسط",
  advanced: "متقدم",
};

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function toNumber(value: string, fallback = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

function createEmptyTableData(): TableQuestionData {
  const columnId = makeId("col");
  const rowId = makeId("row");
  const cellId = makeId("cell");

  return {
    columns: [
      {
        id: columnId,
        title: "العمود الأول",
      },
    ],
    rows: [
      {
        id: rowId,
        label: "السؤال الأول",
        cells: {
          [columnId]: {
            id: cellId,
            options: [
              {
                id: makeId("opt"),
                text: "الخيار الأول",
              },
              {
                id: makeId("opt"),
                text: "الخيار الثاني",
              },
            ],
            correctOptionId: "",
            points: 1,
          },
        },
      },
    ],
  };
}

function createEmptyCutJoinData(): {
  sections: CutJoinSection[];
} {
  return {
    sections: [
      {
        id: makeId("section"),
        type: "cut",
        title: "مقطوعة",
        textPoints: 1,
        surahPoints: 1,
        acceptedKeywords: [""],
        correctSurahId: 1,
      },
    ],
  };
}

function createEmptyConditionalData(): ConditionalQuestionData {
  const startId = makeId("node");

  return {
    startNodeId: startId,
    nodes: [
      {
        id: startId,
        prompt: "",
        options: [
          {
            id: makeId("opt"),
            text: "",
          },
          {
            id: makeId("opt"),
            text: "",
          },
        ],
        correctOptionId: "",
        points: 1,
        nextByOption: {},
      },
    ] satisfies ConditionalNode[],
  };
}

function createEmptyOrderingData(): OrderingQuestionData {
  return {
    items: [
      {
        id: makeId("item"),
        text: "",
      },
      {
        id: makeId("item"),
        text: "",
      },
      {
        id: makeId("item"),
        text: "",
      },
    ],
    correctOrder: [],
    points: 1,
    partialCredit: true,
  };
}

function createEmptyFillBlanksData(): FillBlanksQuestionData {
  const blankId = makeId("blank");
  const answerId = makeId("answer");

  return {
    parts: [
      {
        type: "text",
        value: "",
      },
      {
        type: "blank",
        blankId,
      },
      {
        type: "text",
        value: "",
      },
    ],
    answerBank: [
      {
        id: answerId,
        text: "",
      },
    ],
    blanks: [
      {
        id: blankId,
        points: 1,
        correctAnswerId: answerId,
      },
    ],
    allowReuse: false,
  };
}

function normalizeTableData(value: unknown): TableQuestionData {
  if (!value || typeof value !== "object") {
    return createEmptyTableData();
  }

  const data = value as Partial<TableQuestionData>;

  if (!Array.isArray(data.columns) || !Array.isArray(data.rows)) {
    return createEmptyTableData();
  }

  return {
    columns: data.columns.map((column) => ({
      id: String(column.id ?? makeId("col")),
      title: String(column.title ?? ""),
    })),
    rows: data.rows.map((row) => {
      const cells: Record<string, TableCell> = {};

      if (row.cells && typeof row.cells === "object") {
        Object.entries(row.cells).forEach(([columnId, rawCell]) => {
          const cell = rawCell as Partial<TableCell>;

          cells[columnId] = {
            id: String(cell.id ?? makeId("cell")),
            options: Array.isArray(cell.options)
              ? cell.options.map((option) => ({
                  id: String(option.id ?? makeId("opt")),
                  text: String(option.text ?? ""),
                }))
              : [],
            correctOptionId: String(cell.correctOptionId ?? ""),
            points: toNumber(String(cell.points ?? 1)),
          };
        });
      }

      return {
        id: String(row.id ?? makeId("row")),
        label: String(row.label ?? ""),
        cells,
      };
    }),
  };
}

function normalizeCutJoinData(value: unknown): { sections: CutJoinSection[] } {
  if (!value || typeof value !== "object") {
    return createEmptyCutJoinData();
  }

  const data = value as Partial<{
    sections: CutJoinSection[];
  }>;

  if (!Array.isArray(data.sections)) {
    return createEmptyCutJoinData();
  }

  return {
    sections: data.sections.map((section) => ({
      id: String(section.id ?? makeId("section")),
      type:
        section.type === "joined" || section.type === "disputed"
          ? section.type
          : "cut",
      title: String(section.title ?? ""),
      textPoints: toNumber(String(section.textPoints ?? 1)),
      surahPoints: toNumber(String(section.surahPoints ?? 1)),
      acceptedKeywords: Array.isArray(section.acceptedKeywords)
        ? section.acceptedKeywords.map(String)
        : [""],
      correctSurahId: toNumber(String(section.correctSurahId ?? 1), 1),
    })),
  };
}

function normalizeConditionalData(value: unknown) {
  if (!value || typeof value !== "object") {
    return createEmptyConditionalData();
  }

  const data = value as Partial<{
    startNodeId: string;
    nodes: ConditionalNode[];
  }>;

  if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
    return createEmptyConditionalData();
  }

  const nodes: ConditionalNode[] = data.nodes.map((node) => ({
    id: String(node.id ?? makeId("node")),
    prompt: String(node.prompt ?? ""),
    options: Array.isArray(node.options)
      ? node.options.map((option) => ({
          id: String(option.id ?? makeId("opt")),
          text: String(option.text ?? ""),
        }))
      : [],
    correctOptionId: String(node.correctOptionId ?? ""),
    points: toNumber(String(node.points ?? 1)),
    nextByOption: Object.fromEntries(
      Object.entries(node.nextByOption ?? {}).map(([key, value]) => [
        key,
        value === null || value === "" ? null : String(value),
      ])
    ) as Record<string, string | null>,
  }));

  return {
    startNodeId:
      data.startNodeId && nodes.some((node) => node.id === data.startNodeId)
        ? data.startNodeId
        : nodes[0].id,
    nodes,
  };
}

function normalizeOrderingData(value: unknown): OrderingQuestionData {
  if (!value || typeof value !== "object") {
    return createEmptyOrderingData();
  }

  const data = value as Partial<OrderingQuestionData>;

  const items = Array.isArray(data.items)
    ? data.items.map((item) => ({
        id: String(item.id ?? makeId("item")),
        text: String(item.text ?? ""),
      }))
    : [];

  const correctOrder = Array.isArray(data.correctOrder)
    ? data.correctOrder.map(String)
    : items.map((item) => item.id);

  return {
    items,
    correctOrder,
    points: toNumber(String(data.points ?? 1)),
    partialCredit: Boolean(data.partialCredit),
  };
}

function normalizeFillBlanksData(value: unknown): FillBlanksQuestionData {
  if (!value || typeof value !== "object") {
    return createEmptyFillBlanksData();
  }

  const data = value as Partial<FillBlanksQuestionData>;

  const parts = Array.isArray(data.parts)
    ? data.parts.map((part) => {
        if (part.type === "blank") {
          return {
            type: "blank" as const,
            blankId: String(part.blankId ?? makeId("blank")),
          };
        }

        return {
          type: "text" as const,
          value: String(part.value ?? ""),
        };
      })
    : [];

  const answerBank = Array.isArray(data.answerBank)
    ? data.answerBank.map((answer) => ({
        id: String(answer.id ?? makeId("answer")),
        text: String(answer.text ?? ""),
      }))
    : [];

  const blanks = Array.isArray(data.blanks)
    ? data.blanks.map((blank) => ({
        id: String(blank.id ?? makeId("blank")),
        points: toNumber(String(blank.points ?? 1)),
        correctAnswerId: String(blank.correctAnswerId ?? ""),
      }))
    : [];

  return {
    parts,
    answerBank,
    blanks,
    allowReuse: Boolean(data.allowReuse),
  };
}

export default function QuestionBuilder({
  levelId,
  chapters,
  question,
  onSaved,
  onCancel,
}: QuestionBuilderProps) {
  const [questionType, setQuestionType] =
    useState<QuestionType>("mcq");

  const [chapterId, setChapterId] = useState(
    chapters[0]?.id ? String(chapters[0].id) : ""
  );

  const [questionText, setQuestionText] = useState("");
  const [difficulty, setDifficulty] =
    useState<Difficulty>("medium");

  const [points, setPoints] = useState("1");
  const [explanation, setExplanation] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState("a");

  const [tableData, setTableData] =
    useState<TableQuestionData>(createEmptyTableData());

  const [cutJoinData, setCutJoinData] = useState<{
    sections: CutJoinSection[];
  }>(createEmptyCutJoinData());

  const [conditionalData, setConditionalData] = useState(
    createEmptyConditionalData()
  );

  const [orderingData, setOrderingData] =
    useState<OrderingQuestionData>(createEmptyOrderingData());

  const [fillBlanksData, setFillBlanksData] =
    useState<FillBlanksQuestionData>(
      createEmptyFillBlanksData()
    );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEditing = Boolean(question?.id);

  useEffect(() => {
    if (!question) {
      setQuestionType("mcq");
      setChapterId(
        chapters[0]?.id ? String(chapters[0].id) : ""
      );
      setQuestionText("");
      setDifficulty("medium");
      setPoints("1");
      setExplanation("");
      setIsActive(true);
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setCorrectOption("a");
      setTableData(createEmptyTableData());
      setCutJoinData(createEmptyCutJoinData());
      setConditionalData(createEmptyConditionalData());
      setOrderingData(createEmptyOrderingData());
      setFillBlanksData(createEmptyFillBlanksData());
      return;
    }

    setQuestionType(question.question_type ?? "mcq");
    setChapterId(String(question.chapter_id));
    setQuestionText(question.question_text ?? "");
    setDifficulty(question.difficulty ?? "medium");
    setPoints(String(question.points ?? 1));
    setExplanation(question.explanation ?? "");
    setIsActive(question.is_active ?? true);

    setOptionA(question.option_a ?? "");
    setOptionB(question.option_b ?? "");
    setOptionC(question.option_c ?? "");
    setOptionD(question.option_d ?? "");
    setCorrectOption(question.correct_option ?? "a");

    setTableData(normalizeTableData(question.question_data));
    setCutJoinData(
      normalizeCutJoinData(question.question_data)
    );
    setConditionalData(
      normalizeConditionalData(question.question_data)
    );
    setOrderingData(
      normalizeOrderingData(question.question_data)
    );
    setFillBlanksData(
      normalizeFillBlanksData(question.question_data)
    );
  }, [question, chapters]);

  const totalTablePoints = useMemo(() => {
    return tableData.rows.reduce((total, row) => {
      return (
        total +
        tableData.columns.reduce((rowTotal, column) => {
          const cell = row.cells[column.id];

          return rowTotal + (cell?.points ?? 0);
        }, 0)
      );
    }, 0);
  }, [tableData]);

  const totalCutJoinPoints = useMemo(() => {
    return cutJoinData.sections.reduce(
      (total, section) =>
        total +
        section.textPoints +
        section.surahPoints,
      0
    );
  }, [cutJoinData]);

  const totalConditionalPoints = useMemo(() => {
    return conditionalData.nodes.reduce(
      (total, node) => total + node.points,
      0
    );
  }, [conditionalData]);

  const totalFillBlankPoints = useMemo(() => {
    return fillBlanksData.blanks.reduce(
      (total, blank) => total + blank.points,
      0
    );
  }, [fillBlanksData]);

  function resetMessages() {
    setError("");
    setSuccess("");
  }

  function changeQuestionType(type: QuestionType) {
    resetMessages();
    setQuestionType(type);

    if (type === "table") {
      setPoints(String(totalTablePoints || 1));
    } else if (type === "cut_join") {
      setPoints(String(totalCutJoinPoints || 1));
    } else if (type === "conditional") {
      setPoints(String(totalConditionalPoints || 1));
    } else if (type === "ordering") {
      setPoints(String(orderingData.points || 1));
    } else if (type === "fill_blanks") {
      setPoints(String(totalFillBlankPoints || 1));
    } else {
      setPoints("1");
    }
  }

  function addTableColumn() {
    const columnId = makeId("col");

    setTableData((current) => ({
      ...current,
      columns: [
        ...current.columns,
        {
          id: columnId,
          title: `العمود ${current.columns.length + 1}`,
        },
      ],
      rows: current.rows.map((row) => ({
        ...row,
        cells: {
          ...row.cells,
          [columnId]: {
            id: makeId("cell"),
            options: [
              {
                id: makeId("opt"),
                text: "الخيار الأول",
              },
              {
                id: makeId("opt"),
                text: "الخيار الثاني",
              },
            ],
            correctOptionId: "",
            points: 1,
          },
        },
      })),
    }));
  }

  function removeTableColumn(columnId: string) {
    setTableData((current) => {
      if (current.columns.length <= 1) {
        return current;
      }

      return {
        ...current,
        columns: current.columns.filter(
          (column) => column.id !== columnId
        ),
        rows: current.rows.map((row) => {
          const cells = { ...row.cells };
          delete cells[columnId];

          return {
            ...row,
            cells,
          };
        }),
      };
    });
  }

  function updateTableColumnTitle(
    columnId: string,
    title: string
  ) {
    setTableData((current) => ({
      ...current,
      columns: current.columns.map((column) =>
        column.id === columnId
          ? {
              ...column,
              title,
            }
          : column
      ),
    }));
  }

  function addTableRow() {
    setTableData((current) => {
      const rowId = makeId("row");

      const cells: Record<string, TableCell> = {};

      current.columns.forEach((column) => {
        cells[column.id] = {
          id: makeId("cell"),
          options: [
            {
              id: makeId("opt"),
              text: "الخيار الأول",
            },
            {
              id: makeId("opt"),
              text: "الخيار الثاني",
            },
          ],
          correctOptionId: "",
          points: 1,
        };
      });

      return {
        ...current,
        rows: [
          ...current.rows,
          {
            id: rowId,
            label: `السؤال ${current.rows.length + 1}`,
            cells,
          },
        ],
      };
    });
  }

  function removeTableRow(rowId: string) {
    setTableData((current) => {
      if (current.rows.length <= 1) {
        return current;
      }

      return {
        ...current,
        rows: current.rows.filter(
          (row) => row.id !== rowId
        ),
      };
    });
  }

  function updateTableRowLabel(
    rowId: string,
    label: string
  ) {
    setTableData((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              label,
            }
          : row
      ),
    }));
  }

  function updateTableCell(
    rowId: string,
    columnId: string,
    updater: (cell: TableCell) => TableCell
  ) {
    setTableData((current) => ({
      ...current,
      rows: current.rows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const existingCell = row.cells[columnId];

        if (!existingCell) {
          return row;
        }

        return {
          ...row,
          cells: {
            ...row.cells,
            [columnId]: updater(existingCell),
          },
        };
      }),
    }));
  }

  function addTableCellOption(
    rowId: string,
    columnId: string
  ) {
    updateTableCell(rowId, columnId, (cell) => ({
      ...cell,
      options: [
        ...cell.options,
        {
          id: makeId("opt"),
          text: "",
        },
      ],
    }));
  }

  function updateTableCellOption(
    rowId: string,
    columnId: string,
    optionId: string,
    text: string
  ) {
    updateTableCell(rowId, columnId, (cell) => ({
      ...cell,
      options: cell.options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              text,
            }
          : option
      ),
    }));
  }

  function removeTableCellOption(
    rowId: string,
    columnId: string,
    optionId: string
  ) {
    updateTableCell(rowId, columnId, (cell) => {
      if (cell.options.length <= 2) {
        return cell;
      }

      const options = cell.options.filter(
        (option) => option.id !== optionId
      );

      return {
        ...cell,
        options,
        correctOptionId:
          cell.correctOptionId === optionId
            ? ""
            : cell.correctOptionId,
      };
    });
  }

  function updateTableCellCorrectOption(
    rowId: string,
    columnId: string,
    optionId: string
  ) {
    updateTableCell(rowId, columnId, (cell) => ({
      ...cell,
      correctOptionId: optionId,
    }));
  }

  function updateTableCellPoints(
    rowId: string,
    columnId: string,
    value: string
  ) {
    updateTableCell(rowId, columnId, (cell) => ({
      ...cell,
      points: toNumber(value, 1),
    }));
  }

  function addCutJoinSection() {
    setCutJoinData((current) => ({
      sections: [
        ...current.sections,
        {
          id: makeId("section"),
          type: "cut",
          title: `قسم ${current.sections.length + 1}`,
          textPoints: 1,
          surahPoints: 1,
          acceptedKeywords: [""],
          correctSurahId: 1,
        },
      ],
    }));
  }

  function removeCutJoinSection(id: string) {
    setCutJoinData((current) => {
      if (current.sections.length <= 1) {
        return current;
      }

      return {
        sections: current.sections.filter(
          (section) => section.id !== id
        ),
      };
    });
  }

  function updateCutJoinSection(
    id: string,
    patch: Partial<CutJoinSection>
  ) {
    setCutJoinData((current) => ({
      sections: current.sections.map((section) =>
        section.id === id
          ? {
              ...section,
              ...patch,
            }
          : section
      ),
    }));
  }

  function addCutJoinKeyword(id: string) {
    setCutJoinData((current) => ({
      sections: current.sections.map((section) =>
        section.id === id
          ? {
              ...section,
              acceptedKeywords: [
                ...section.acceptedKeywords,
                "",
              ],
            }
          : section
      ),
    }));
  }

  function updateCutJoinKeyword(
    id: string,
    keywordIndex: number,
    value: string
  ) {
    setCutJoinData((current) => ({
      sections: current.sections.map((section) => {
        if (section.id !== id) {
          return section;
        }

        const acceptedKeywords = [
          ...section.acceptedKeywords,
        ];

        acceptedKeywords[keywordIndex] = value;

        return {
          ...section,
          acceptedKeywords,
        };
      }),
    }));
  }

  function removeCutJoinKeyword(
    id: string,
    keywordIndex: number
  ) {
    setCutJoinData((current) => ({
      sections: current.sections.map((section) => {
        if (section.id !== id) {
          return section;
        }

        if (section.acceptedKeywords.length <= 1) {
          return section;
        }

        return {
          ...section,
          acceptedKeywords:
            section.acceptedKeywords.filter(
              (_, index) => index !== keywordIndex
            ),
        };
      }),
    }));
  }

  function addConditionalNode() {
    setConditionalData((current) => {
      const nodeId = makeId("node");

      return {
        ...current,
        nodes: [
          ...current.nodes,
          {
            id: nodeId,
            prompt: "",
            options: [
              {
                id: makeId("opt"),
                text: "",
              },
              {
                id: makeId("opt"),
                text: "",
              },
            ],
            correctOptionId: "",
            points: 1,
            nextByOption: {},
          },
        ],
      };
    });
  }

  function removeConditionalNode(nodeId: string) {
    setConditionalData((current) => {
      if (current.nodes.length <= 1) {
        return current;
      }

      const nodes = current.nodes.filter(
        (node) => node.id !== nodeId
      );

      return {
        startNodeId:
          current.startNodeId === nodeId
            ? nodes[0].id
            : current.startNodeId,
        nodes: nodes.map((node) => ({
          ...node,
          nextByOption: Object.fromEntries(
            Object.entries(node.nextByOption).map(
              ([optionId, nextNodeId]) => [
                optionId,
                nextNodeId === nodeId
                  ? null
                  : nextNodeId,
              ]
            )
          ),
        })),
      };
    });
  }

  function updateConditionalNode(
    nodeId: string,
    patch: Partial<ConditionalNode>
  ) {
    setConditionalData((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              ...patch,
            }
          : node
      ),
    }));
  }

  function addConditionalOption(nodeId: string) {
    setConditionalData((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              options: [
                ...node.options,
                {
                  id: makeId("opt"),
                  text: "",
                },
              ],
            }
          : node
      ),
    }));
  }

  function removeConditionalOption(
    nodeId: string,
    optionId: string
  ) {
    setConditionalData((current) => ({
      ...current,
      nodes: current.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        if (node.options.length <= 2) {
          return node;
        }

        const options = node.options.filter(
          (option) => option.id !== optionId
        );

        const nextByOption = {
          ...node.nextByOption,
        };

        delete nextByOption[optionId];

        return {
          ...node,
          options,
          correctOptionId:
            node.correctOptionId === optionId
              ? ""
              : node.correctOptionId,
          nextByOption,
        };
      }),
    }));
  }

  function updateConditionalOption(
    nodeId: string,
    optionId: string,
    text: string
  ) {
    setConditionalData((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              options: node.options.map((option) =>
                option.id === optionId
                  ? {
                      ...option,
                      text,
                    }
                  : option
              ),
            }
          : node
      ),
    }));
  }

  function updateConditionalNext(
    nodeId: string,
    optionId: string,
    nextNodeId: string
  ) {
    setConditionalData((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              nextByOption: {
                ...node.nextByOption,
                [optionId]:
                  nextNodeId === "" ? null : nextNodeId,
              },
            }
          : node
      ),
    }));
  }

  function addOrderingItem() {
    setOrderingData((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: makeId("item"),
          text: "",
        },
      ],
      correctOrder: [
        ...current.correctOrder,
        current.items.length > 0
          ? current.items[current.items.length - 1]?.id
          : "",
      ].filter(Boolean),
    }));
  }

  function removeOrderingItem(id: string) {
    setOrderingData((current) => ({
      ...current,
      items: current.items.filter(
        (item) => item.id !== id
      ),
      correctOrder: current.correctOrder.filter(
        (itemId) => itemId !== id
      ),
    }));
  }

  function updateOrderingItem(
    id: string,
    text: string
  ) {
    setOrderingData((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id
          ? {
              ...item,
              text,
            }
          : item
      ),
    }));
  }

  function moveOrderingItem(
    index: number,
    direction: -1 | 1
  ) {
    setOrderingData((current) => {
      const nextIndex = index + direction;

      if (
        nextIndex < 0 ||
        nextIndex >= current.items.length
      ) {
        return current;
      }

      const items = [...current.items];

      [items[index], items[nextIndex]] = [
        items[nextIndex],
        items[index],
      ];

      return {
        ...current,
        items,
        correctOrder: items.map((item) => item.id),
      };
    });
  }

  function addFillBlank() {
    setFillBlanksData((current) => {
      const blankId = makeId("blank");
      const answerId = makeId("answer");

      return {
        ...current,
        parts: [
          ...current.parts,
          {
            type: "blank",
            blankId,
          },
        ],
        answerBank: [
          ...current.answerBank,
          {
            id: answerId,
            text: "",
          },
        ],
        blanks: [
          ...current.blanks,
          {
            id: blankId,
            points: 1,
            correctAnswerId: answerId,
          },
        ],
      };
    });
  }

  function addFillBlankText() {
    setFillBlanksData((current) => ({
      ...current,
      parts: [
        ...current.parts,
        {
          type: "text",
          value: "",
        },
      ],
    }));
  }

  function removeFillBlank(blankId: string) {
    setFillBlanksData((current) => {
      const blank = current.blanks.find(
        (item) => item.id === blankId
      );

      return {
        ...current,
        parts: current.parts.filter(
          (part) =>
            part.type !== "blank" ||
            part.blankId !== blankId
        ),
        blanks: current.blanks.filter(
          (item) => item.id !== blankId
        ),
        answerBank: blank
          ? current.answerBank.filter(
              (answer) =>
                answer.id !== blank.correctAnswerId
            )
          : current.answerBank,
      };
    });
  }

  function updateFillBlankPoints(
    blankId: string,
    pointsValue: string
  ) {
    setFillBlanksData((current) => ({
      ...current,
      blanks: current.blanks.map((blank) =>
        blank.id === blankId
          ? {
              ...blank,
              points: toNumber(pointsValue, 1),
            }
          : blank
      ),
    }));
  }

  function updateFillBlankCorrectAnswer(
    blankId: string,
    answerId: string
  ) {
    setFillBlanksData((current) => ({
      ...current,
      blanks: current.blanks.map((blank) =>
        blank.id === blankId
          ? {
              ...blank,
              correctAnswerId: answerId,
            }
          : blank
      ),
    }));
  }

  function updateFillBlankTextPart(
    index: number,
    value: string
  ) {
    setFillBlanksData((current) => ({
      ...current,
      parts: current.parts.map((part, partIndex) =>
        partIndex === index &&
        part.type === "text"
          ? {
              ...part,
              value,
            }
          : part
      ),
    }));
  }

  function addAnswerBankOption() {
    setFillBlanksData((current) => ({
      ...current,
      answerBank: [
        ...current.answerBank,
        {
          id: makeId("answer"),
          text: "",
        },
      ],
    }));
  }

  function removeAnswerBankOption(id: string) {
    setFillBlanksData((current) => ({
      ...current,
      answerBank: current.answerBank.filter(
        (answer) => answer.id !== id
      ),
      blanks: current.blanks.map((blank) =>
        blank.correctAnswerId === id
          ? {
              ...blank,
              correctAnswerId: "",
            }
          : blank
      ),
    }));
  }

  function updateAnswerBankOption(
    id: string,
    text: string
  ) {
    setFillBlanksData((current) => ({
      ...current,
      answerBank: current.answerBank.map((answer) =>
        answer.id === id
          ? {
              ...answer,
              text,
            }
          : answer
      ),
    }));
  }

  function buildQuestionData() {
    switch (questionType) {
      case "table":
        return tableData;

      case "cut_join":
        return cutJoinData;

      case "conditional":
        return conditionalData;

      case "ordering":
        return orderingData;

      case "fill_blanks":
        return fillBlanksData;

      case "mcq":
      default:
        return {};
    }
  }

  function getCalculatedPoints() {
    switch (questionType) {
      case "table":
        return totalTablePoints;

      case "cut_join":
        return totalCutJoinPoints;

      case "conditional":
        return totalConditionalPoints;

      case "ordering":
        return orderingData.points;

      case "fill_blanks":
        return totalFillBlankPoints;

      case "mcq":
      default:
        return toNumber(points, 1);
    }
  }

  function validateQuestion() {
    if (!chapterId) {
      return "اختر الباب أولًا.";
    }

    if (!questionText.trim()) {
      return "اكتب نص السؤال.";
    }

    if (questionType === "mcq") {
      if (
        !optionA.trim() ||
        !optionB.trim() ||
        !optionC.trim() ||
        !optionD.trim()
      ) {
        return "يجب تعبئة الخيارات الأربعة.";
      }

      if (
        !["a", "b", "c", "d"].includes(
          correctOption
        )
      ) {
        return "حدد الإجابة الصحيحة.";
      }
    }

    if (questionType === "table") {
      if (tableData.columns.length === 0) {
        return "أضف عمودًا واحدًا على الأقل.";
      }

      if (tableData.rows.length === 0) {
        return "أضف صفًا واحدًا على الأقل.";
      }

      for (const row of tableData.rows) {
        for (const column of tableData.columns) {
          const cell = row.cells[column.id];

          if (!cell) {
            return "هناك خلية غير مكتملة في الجدول.";
          }

          if (cell.options.length < 2) {
            return "كل خلية يجب أن تحتوي على خيارين على الأقل.";
          }

          if (!cell.correctOptionId) {
            return "حدد الإجابة الصحيحة لكل خلية.";
          }

          if (cell.points <= 0) {
            return "يجب أن تكون نقاط كل خلية أكبر من صفر.";
          }
        }
      }
    }

    if (questionType === "cut_join") {
      if (cutJoinData.sections.length === 0) {
        return "أضف قسمًا واحدًا على الأقل.";
      }

      for (const section of cutJoinData.sections) {
        const keywords = section.acceptedKeywords
          .map((keyword) => keyword.trim())
          .filter(Boolean);

        if (keywords.length === 0) {
          return `أضف كلمة مقبولة واحدة على الأقل للقسم: ${section.title}`;
        }

        if (section.correctSurahId <= 0) {
          return `حدد السورة الصحيحة للقسم: ${section.title}`;
        }

        if (
          section.textPoints <= 0 ||
          section.surahPoints <= 0
        ) {
          return `النقاط للقسم "${section.title}" يجب أن تكون أكبر من صفر.`;
        }
      }
    }

    if (questionType === "conditional") {
      if (conditionalData.nodes.length === 0) {
        return "أضف مرحلة واحدة على الأقل.";
      }

      for (const node of conditionalData.nodes) {
        if (!node.prompt.trim()) {
          return "كل مرحلة يجب أن تحتوي على نص السؤال.";
        }

        if (node.options.length < 2) {
          return "كل مرحلة يجب أن تحتوي على خيارين على الأقل.";
        }

        if (!node.correctOptionId) {
          return "حدد الإجابة الصحيحة لكل مرحلة.";
        }

        if (node.points <= 0) {
          return "نقاط كل مرحلة يجب أن تكون أكبر من صفر.";
        }
      }
    }

    if (questionType === "ordering") {
      if (orderingData.items.length < 2) {
        return "أضف عنصرين على الأقل لسؤال الترتيب.";
      }

      if (
        orderingData.items.some(
          (item) => !item.text.trim()
        )
      ) {
        return "أكمل نصوص جميع عناصر الترتيب.";
      }

      if (orderingData.points <= 0) {
        return "نقاط سؤال الترتيب يجب أن تكون أكبر من صفر.";
      }
    }

    if (questionType === "fill_blanks") {
      if (fillBlanksData.blanks.length === 0) {
        return "أضف فراغًا واحدًا على الأقل.";
      }

      if (fillBlanksData.answerBank.length === 0) {
        return "أضف خيارات إلى بنك الإجابات.";
      }

      for (const blank of fillBlanksData.blanks) {
        if (!blank.correctAnswerId) {
          return "حدد الإجابة الصحيحة لكل فراغ.";
        }

        if (blank.points <= 0) {
          return "نقاط كل فراغ يجب أن تكون أكبر من صفر.";
        }
      }
    }

    const calculatedPoints = getCalculatedPoints();

    if (!Number.isFinite(calculatedPoints) || calculatedPoints <= 0) {
      return "يجب أن يكون مجموع نقاط السؤال أكبر من صفر.";
    }

    return "";
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    resetMessages();

    const validationError = validateQuestion();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const calculatedPoints = getCalculatedPoints();

      const payload = {
        id: question?.id,
        levelId,
        chapterId: Number(chapterId),
        questionText: questionText.trim(),
        questionType,
        points: calculatedPoints,
        difficulty,
        explanation: explanation.trim() || null,
        isActive,
        optionA:
          questionType === "mcq"
            ? optionA.trim()
            : null,
        optionB:
          questionType === "mcq"
            ? optionB.trim()
            : null,
        optionC:
          questionType === "mcq"
            ? optionC.trim()
            : null,
        optionD:
          questionType === "mcq"
            ? optionD.trim()
            : null,
        correctOption:
          questionType === "mcq"
            ? correctOption
            : null,
        questionData: buildQuestionData(),
      };

      const response = await fetch(
        "/api/admin/questions",
        {
          method: question?.id ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "تعذر حفظ السؤال."
        );
      }

      setSuccess(
        question?.id
          ? "تم تحديث السؤال بنجاح."
          : "تم إضافة السؤال بنجاح."
      );

      if (!question?.id) {
        setQuestionText("");
        setExplanation("");
        setOptionA("");
        setOptionB("");
        setOptionC("");
        setOptionD("");
        setCorrectOption("a");
        setQuestionType("mcq");
        setPoints("1");
        setTableData(createEmptyTableData());
        setCutJoinData(createEmptyCutJoinData());
        setConditionalData(
          createEmptyConditionalData()
        );
        setOrderingData(
          createEmptyOrderingData()
        );
        setFillBlanksData(
          createEmptyFillBlanksData()
        );
      }

      onSaved?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ غير متوقع."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            {isEditing
              ? "تعديل السؤال"
              : "إضافة سؤال جديد"}
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            اختر نوع السؤال، وستظهر لك الحقول الخاصة به تلقائيًا.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              نوع السؤال
            </label>

            <select
              value={questionType}
              onChange={(event) =>
                changeQuestionType(
                  event.target.value as QuestionType
                )
              }
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
            >
              {(
                Object.keys(
                  QUESTION_TYPE_LABELS
                ) as QuestionType[]
              ).map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {QUESTION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              الباب
            </label>

            <select
              value={chapterId}
              onChange={(event) =>
                setChapterId(event.target.value)
              }
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
            >
              <option value="">
                اختر الباب
              </option>

              {chapters.map((chapter) => (
                <option
                  key={chapter.id}
                  value={chapter.id}
                >
                  {chapter.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              الصعوبة
            </label>

            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(
                  event.target.value as Difficulty
                )
              }
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
            >
              {(
                Object.keys(
                  DIFFICULTY_LABELS
                ) as Difficulty[]
              ).map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {DIFFICULTY_LABELS[item]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              النقاط
            </label>

            <input
              type="number"
              min="0.25"
              step="0.25"
              value={points}
              onChange={(event) =>
                setPoints(event.target.value)
              }
              disabled={questionType !== "mcq"}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 outline-none disabled:bg-slate-50 focus:border-[var(--primary)]"
            />

            {questionType !== "mcq" && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                يتم حساب النقاط تلقائيًا من أجزاء السؤال.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold">
            نص السؤال الرئيسي
          </label>

          <textarea
            value={questionText}
            onChange={(event) =>
              setQuestionText(event.target.value)
            }
            rows={4}
            placeholder="اكتب نص السؤال..."
            className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
          />
        </div>
      </div>

      {questionType === "mcq" && (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold">
            خيارات سؤال ضع دائرة
          </h3>

          <div className="space-y-3">
            {[
              {
                key: "a",
                label: "أ",
                value: optionA,
                setter: setOptionA,
              },
              {
                key: "b",
                label: "ب",
                value: optionB,
                setter: setOptionB,
              },
              {
                key: "c",
                label: "ج",
                value: optionC,
                setter: setOptionC,
              },
              {
                key: "d",
                label: "د",
                value: optionD,
                setter: setOptionD,
              },
            ].map((option) => (
              <div
                key={option.key}
                className="grid gap-2 md:grid-cols-[auto_1fr]"
              >
                <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3">
                  <input
                    type="radio"
                    name="correct-option"
                    checked={
                      correctOption ===
                      option.key
                    }
                    onChange={() =>
                      setCorrectOption(
                        option.key
                      )
                    }
                  />

                  <span className="font-bold">
                    {option.label}
                  </span>
                </label>

                <input
                  value={option.value}
                  onChange={(event) =>
                    option.setter(
                      event.target.value
                    )
                  }
                  placeholder={`الخيار ${option.label}`}
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {questionType === "table" && (
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">
                إعداد سؤال الجدول
              </h3>

              <p className="mt-1 text-sm text-[var(--muted)]">
                يمكنك تحديد عدد الأعمدة والصفوف، ولكل خلية خياراتها وإجابتها ونقاطها الخاصة.
              </p>
            </div>

            <div className="rounded-xl bg-[var(--primary-light)] px-4 py-2 text-sm font-bold text-[var(--primary-dark)]">
              مجموع النقاط:{" "}
              {totalTablePoints}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addTableColumn}
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
            >
              + إضافة عمود
            </button>

            <button
              type="button"
              onClick={addTableRow}
              className="rounded-xl bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-white"
            >
              + إضافة صف
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-[1000px] w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-[var(--border)] p-3 text-right">
                    الصف
                  </th>

                  {tableData.columns.map(
                    (column) => (
                      <th
                        key={column.id}
                        className="border border-[var(--border)] p-3"
                      >
                        <div className="space-y-2">
                          <input
                            value={column.title}
                            onChange={(event) =>
                              updateTableColumnTitle(
                                column.id,
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removeTableColumn(
                                column.id
                              )
                            }
                            className="text-xs font-semibold text-red-600"
                          >
                            حذف العمود
                          </button>
                        </div>
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {tableData.rows.map(
                  (row) => (
                    <tr key={row.id}>
                      <td className="w-44 border border-[var(--border)] p-3 align-top">
                        <input
                          value={row.label}
                          onChange={(event) =>
                            updateTableRowLabel(
                              row.id,
                              event.target.value
                            )
                          }
                          className="mb-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeTableRow(
                              row.id
                            )
                          }
                          className="text-xs font-semibold text-red-600"
                        >
                          حذف الصف
                        </button>
                      </td>

                      {tableData.columns.map(
                        (column) => {
                          const cell =
                            row.cells[
                              column.id
                            ];

                          if (!cell) {
                            return (
                              <td
                                key={column.id}
                                className="border border-[var(--border)] p-3"
                              >
                                خلية غير موجودة
                              </td>
                            );
                          }

                          return (
                            <td
                              key={column.id}
                              className="min-w-[280px] border border-[var(--border)] p-3 align-top"
                            >
                              <div className="space-y-3">
                                <div>
                                  <div className="mb-2 text-xs font-bold text-[var(--muted)]">
                                    الخيارات
                                  </div>

                                  <div className="space-y-2">
                                    {cell.options.map(
                                      (
                                        option,
                                        optionIndex
                                      ) => (
                                        <div
                                          key={
                                            option.id
                                          }
                                          className="flex gap-2"
                                        >
                                          <input
                                            value={
                                              option.text
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              updateTableCellOption(
                                                row.id,
                                                column.id,
                                                option.id,
                                                event
                                                  .target
                                                  .value
                                              )
                                            }
                                            placeholder={`الخيار ${
                                              optionIndex +
                                              1
                                            }`}
                                            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                                          />

                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeTableCellOption(
                                                row.id,
                                                column.id,
                                                option.id
                                              )
                                            }
                                            className="rounded-lg px-2 text-red-600"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      )
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      addTableCellOption(
                                        row.id,
                                        column.id
                                      )
                                    }
                                    className="mt-2 text-xs font-semibold text-[var(--primary)]"
                                  >
                                    + إضافة خيار
                                  </button>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                                    الإجابة الصحيحة
                                  </label>

                                  <select
                                    value={
                                      cell.correctOptionId
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateTableCellCorrectOption(
                                        row.id,
                                        column.id,
                                        event.target
                                          .value
                                      )
                                    }
                                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                                  >
                                    <option value="">
                                      اختر الإجابة
                                    </option>

                                    {cell.options.map(
                                      (
                                        option
                                      ) => (
                                        <option
                                          key={
                                            option.id
                                          }
                                          value={
                                            option.id
                                          }
                                        >
                                          {option.text ||
                                            "خيار بدون نص"}
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                                    نقاط الخلية
                                  </label>

                                  <input
                                    type="number"
                                    min="0.25"
                                    step="0.25"
                                    value={
                                      cell.points
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateTableCellPoints(
                                        row.id,
                                        column.id,
                                        event.target
                                          .value
                                      )
                                    }
                                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        }
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {questionType === "cut_join" && (
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">
                إعداد المقطوع والموصول والتاءات
              </h3>

              <p className="mt-1 text-sm text-[var(--muted)]">
                لكل قسم يحدد المعلم نوعه والكلمات المقبولة والسورة الصحيحة ونقاط كل جزء.
              </p>
            </div>

            <div className="rounded-xl bg-[var(--primary-light)] px-4 py-2 text-sm font-bold text-[var(--primary-dark)]">
              مجموع النقاط:{" "}
              {totalCutJoinPoints}
            </div>
          </div>

          <button
            type="button"
            onClick={addCutJoinSection}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            + إضافة قسم
          </button>

          <div className="space-y-4">
            {cutJoinData.sections.map(
              (section, index) => (
                <div
                  key={section.id}
                  className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h4 className="font-bold">
                      القسم {index + 1}
                    </h4>

                    <button
                      type="button"
                      onClick={() =>
                        removeCutJoinSection(
                          section.id
                        )
                      }
                      className="text-sm font-semibold text-red-600"
                    >
                      حذف القسم
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold">
                        اسم القسم
                      </label>

                      <input
                        value={section.title}
                        onChange={(event) =>
                          updateCutJoinSection(
                            section.id,
                            {
                              title:
                                event.target.value,
                            }
                          )
                        }
                        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold">
                        النوع
                      </label>

                      <select
                        value={section.type}
                        onChange={(event) =>
                          updateCutJoinSection(
                            section.id,
                            {
                              type:
                                event.target.value as CutJoinSection["type"],
                            }
                          )
                        }
                        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                      >
                        <option value="cut">
                          مقطوعة
                        </option>
                        <option value="joined">
                          موصولة
                        </option>
                        <option value="disputed">
                          مختلف فيها
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold">
                        نقاط الإجابة النصية
                      </label>

                      <input
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={
                          section.textPoints
                        }
                        onChange={(event) =>
                          updateCutJoinSection(
                            section.id,
                            {
                              textPoints:
                                toNumber(
                                  event.target
                                    .value,
                                  1
                                ),
                            }
                          )
                        }
                        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold">
                        نقاط السورة
                      </label>

                      <input
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={
                          section.surahPoints
                        }
                        onChange={(event) =>
                          updateCutJoinSection(
                            section.id,
                            {
                              surahPoints:
                                toNumber(
                                  event.target
                                    .value,
                                  1
                                ),
                            }
                          )
                        }
                        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold">
                        رقم السورة الصحيحة
                      </label>

                      <input
                        type="number"
                        min="1"
                        max="114"
                        value={
                          section.correctSurahId
                        }
                        onChange={(event) =>
                          updateCutJoinSection(
                            section.id,
                            {
                              correctSurahId:
                                toNumber(
                                  event.target
                                    .value,
                                  1
                                ),
                            }
                          )
                        }
                        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                      />

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        استخدم رقم السورة من 1 إلى 114.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label className="text-sm font-semibold">
                        الكلمات المقبولة
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          addCutJoinKeyword(
                            section.id
                          )
                        }
                        className="text-xs font-semibold text-[var(--primary)]"
                      >
                        + كلمة مقبولة
                      </button>
                    </div>

                    <div className="space-y-2">
                      {section.acceptedKeywords.map(
                        (
                          keyword,
                          keywordIndex
                        ) => (
                          <div
                            key={`${section.id}-${keywordIndex}`}
                            className="flex gap-2"
                          >
                            <input
                              value={keyword}
                              onChange={(event) =>
                                updateCutJoinKeyword(
                                  section.id,
                                  keywordIndex,
                                  event.target.value
                                )
                              }
                              placeholder="اكتب كلمة أو عبارة مقبولة"
                              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeCutJoinKeyword(
                                  section.id,
                                  keywordIndex
                                )
                              }
                              className="rounded-xl px-3 text-red-600"
                            >
                              حذف
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {questionType === "conditional" && (
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">
                السؤال المتسلسل / الشرطي
              </h3>

              <p className="mt-1 text-sm text-[var(--muted)]">
                كل مرحلة لها خيارات، ويمكن ربط كل خيار بمرحلة تالية مختلفة.
              </p>
            </div>

            <div className="rounded-xl bg-[var(--primary-light)] px-4 py-2 text-sm font-bold text-[var(--primary-dark)]">
              مجموع نقاط جميع المراحل:{" "}
              {totalConditionalPoints}
            </div>
          </div>

          <button
            type="button"
            onClick={addConditionalNode}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            + إضافة مرحلة
          </button>

          <div className="space-y-4">
            {conditionalData.nodes.map(
              (node, nodeIndex) => (
                <div
                  key={node.id}
                  className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="font-bold">
                      المرحلة {nodeIndex + 1}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="conditional-start-node"
                          checked={
                            conditionalData.startNodeId ===
                            node.id
                          }
                          onChange={() =>
                            setConditionalData(
                              (current) => ({
                                ...current,
                                startNodeId:
                                  node.id,
                              })
                            )
                          }
                        />

                        البداية
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          removeConditionalNode(
                            node.id
                          )
                        }
                        className="text-sm font-semibold text-red-600"
                      >
                        حذف المرحلة
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                    <div>
                      <label className="mb-1 block text-sm font-semibold">
                        نص المرحلة
                      </label>

                      <textarea
                        value={node.prompt}
                        onChange={(event) =>
                          updateConditionalNode(
                            node.id,
                            {
                              prompt:
                                event.target
                                  .value,
                            }
                          )
                        }
                        rows={3}
                        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold">
                        النقاط
                      </label>

                      <input
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={node.points}
                        onChange={(event) =>
                          updateConditionalNode(
                            node.id,
                            {
                              points:
                                toNumber(
                                  event.target
                                    .value,
                                  1
                                ),
                            }
                          )
                        }
                        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-bold">
                        الخيارات
                      </h4>

                      <button
                        type="button"
                        onClick={() =>
                          addConditionalOption(
                            node.id
                          )
                        }
                        className="text-xs font-semibold text-[var(--primary)]"
                      >
                        + إضافة خيار
                      </button>
                    </div>

                    <div className="space-y-3">
                      {node.options.map(
                        (
                          option,
                          optionIndex
                        ) => (
                          <div
                            key={option.id}
                            className="rounded-xl border border-[var(--border)] bg-white p-3"
                          >
                            <div className="grid gap-2 md:grid-cols-[auto_1fr_auto]">
                              <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3">
                                <input
                                  type="radio"
                                  name={`correct-${node.id}`}
                                  checked={
                                    node.correctOptionId ===
                                    option.id
                                  }
                                  onChange={() =>
                                    updateConditionalNode(
                                      node.id,
                                      {
                                        correctOptionId:
                                          option.id,
                                      }
                                    )
                                  }
                                />

                                <span className="text-sm font-bold">
                                  صحيح
                                </span>
                              </label>

                              <input
                                value={
                                  option.text
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateConditionalOption(
                                    node.id,
                                    option.id,
                                    event.target
                                      .value
                                  )
                                }
                                placeholder={`الخيار ${
                                  optionIndex +
                                  1
                                }`}
                                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeConditionalOption(
                                    node.id,
                                    option.id
                                  )
                                }
                                className="rounded-lg px-3 text-red-600"
                              >
                                حذف
                              </button>
                            </div>

                            <div className="mt-3">
                              <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">
                                بعد اختيار هذا الخيار انتقل إلى
                              </label>

                              <select
                                value={
                                  node.nextByOption[
                                    option.id
                                  ] ?? ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateConditionalNext(
                                    node.id,
                                    option.id,
                                    event.target
                                      .value
                                  )
                                }
                                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                              >
                                <option value="">
                                  نهاية المسار
                                </option>

                                {conditionalData.nodes
                                  .filter(
                                    (
                                      targetNode
                                    ) =>
                                      targetNode.id !==
                                      node.id
                                  )
                                  .map(
                                    (
                                      targetNode,
                                      targetIndex
                                    ) => (
                                      <option
                                        key={
                                          targetNode.id
                                        }
                                        value={
                                          targetNode.id
                                        }
                                      >
                                        المرحلة{" "}
                                        {conditionalData.nodes.findIndex(
                                          (
                                            item
                                          ) =>
                                            item.id ===
                                            targetNode.id
                                        ) + 1}
                                        {" — "}
                                        {targetNode.prompt ||
                                          `مرحلة ${
                                            targetIndex +
                                            1
                                          }`}
                                      </option>
                                    )
                                  )}
                              </select>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {questionType === "ordering" && (
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">
                سؤال الترتيب
              </h3>

              <p className="mt-1 text-sm text-[var(--muted)]">
                ترتيب العناصر الظاهر هنا هو الترتيب الصحيح الذي سيعتمد عليه التصحيح.
              </p>
            </div>

            <div className="rounded-xl bg-[var(--primary-light)] px-4 py-2 text-sm font-bold text-[var(--primary-dark)]">
              النقاط:{" "}
              {orderingData.points}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div />

            <div>
              <label className="mb-1 block text-sm font-semibold">
                مجموع النقاط
              </label>

              <input
                type="number"
                min="0.25"
                step="0.25"
                value={orderingData.points}
                onChange={(event) =>
                  setOrderingData(
                    (current) => ({
                      ...current,
                      points: toNumber(
                        event.target.value,
                        1
                      ),
                    })
                  )
                }
                className="w-full rounded-xl border border-[var(--border)] px-3 py-2"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-slate-50 p-3 text-sm">
            <input
              type="checkbox"
              checked={
                orderingData.partialCredit
              }
              onChange={(event) =>
                setOrderingData(
                  (current) => ({
                    ...current,
                    partialCredit:
                      event.target.checked,
                  })
                )
              }
            />

            السماح بالدرجة الجزئية حسب عدد العناصر الموضوعة في أماكنها الصحيحة
          </label>

          <div className="space-y-2">
            {orderingData.items.map(
              (item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-slate-50 p-3"
                >
                  <div className="w-8 text-center font-bold text-[var(--muted)]">
                    {index + 1}
                  </div>

                  <input
                    value={item.text}
                    onChange={(event) =>
                      updateOrderingItem(
                        item.id,
                        event.target.value
                      )
                    }
                    placeholder={`العنصر ${
                      index + 1
                    }`}
                    className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2"
                  />

                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() =>
                      moveOrderingItem(
                        index,
                        -1
                      )
                    }
                    className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 disabled:opacity-40"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    disabled={
                      index ===
                      orderingData.items
                        .length -
                        1
                    }
                    onClick={() =>
                      moveOrderingItem(
                        index,
                        1
                      )
                    }
                    className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 disabled:opacity-40"
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      removeOrderingItem(
                        item.id
                      )
                    }
                    className="rounded-lg px-2 text-red-600"
                  >
                    حذف
                  </button>
                </div>
              )
            )}
          </div>

          <button
            type="button"
            onClick={addOrderingItem}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            + إضافة عنصر
          </button>
        </div>
      )}

      {questionType === "fill_blanks" && (
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">
                سؤال ملء الفراغات
              </h3>

              <p className="mt-1 text-sm text-[var(--muted)]">
                أنشئ نص السؤال وأضف الفراغات وبنك الإجابات وحدد الإجابة الصحيحة لكل فراغ.
              </p>
            </div>

            <div className="rounded-xl bg-[var(--primary-light)] px-4 py-2 text-sm font-bold text-[var(--primary-dark)]">
              مجموع النقاط:{" "}
              {totalFillBlankPoints}
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-slate-50 p-3 text-sm">
            <input
              type="checkbox"
              checked={
                fillBlanksData.allowReuse
              }
              onChange={(event) =>
                setFillBlanksData(
                  (current) => ({
                    ...current,
                    allowReuse:
                      event.target.checked,
                  })
                )
              }
            />

            السماح باستخدام نفس الخيار أكثر من مرة
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-bold">
                تركيب نص السؤال
              </h4>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={
                    addFillBlankText
                  }
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold"
                >
                  + نص
                </button>

                <button
                  type="button"
                  onClick={addFillBlank}
                  className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white"
                >
                  + فراغ
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {fillBlanksData.parts.map(
                (part, index) => {
                  if (
                    part.type === "blank"
                  ) {
                    const blank =
                      fillBlanksData.blanks.find(
                        (item) =>
                          item.id ===
                          part.blankId
                      );

                    return (
                      <div
                        key={`${part.blankId}-${index}`}
                        className="rounded-xl border-2 border-dashed border-[var(--gold)] bg-amber-50 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">
                            فراغ
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeFillBlank(
                                part.blankId
                              )
                            }
                            className="text-sm font-semibold text-red-600"
                          >
                            حذف
                          </button>
                        </div>

                        {blank && (
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-semibold">
                                الإجابة الصحيحة
                              </label>

                              <select
                                value={
                                  blank.correctAnswerId
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateFillBlankCorrectAnswer(
                                    blank.id,
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                              >
                                <option value="">
                                  اختر الإجابة
                                </option>

                                {fillBlanksData.answerBank.map(
                                  (
                                    answer
                                  ) => (
                                    <option
                                      key={
                                        answer.id
                                      }
                                      value={
                                        answer.id
                                      }
                                    >
                                      {answer.text ||
                                        "خيار بدون نص"}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold">
                                نقاط الفراغ
                              </label>

                              <input
                                type="number"
                                min="0.25"
                                step="0.25"
                                value={
                                  blank.points
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateFillBlankPoints(
                                    blank.id,
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`text-${index}`}
                      className="rounded-xl border border-[var(--border)] bg-slate-50 p-3"
                    >
                      <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">
                        جزء نصي
                      </label>

                      <textarea
                        value={part.value}
                        onChange={(event) =>
                          updateFillBlankTextPart(
                            index,
                            event.target
                              .value
                          )
                        }
                        rows={2}
                        placeholder="اكتب النص الذي يسبق أو يلي الفراغ..."
                        className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-bold">
                بنك الإجابات
              </h4>

              <button
                type="button"
                onClick={
                  addAnswerBankOption
                }
                className="text-sm font-semibold text-[var(--primary)]"
              >
                + إضافة خيار
              </button>
            </div>

            <div className="space-y-2">
              {fillBlanksData.answerBank.map(
                (answer, index) => (
                  <div
                    key={answer.id}
                    className="flex gap-2"
                  >
                    <div className="flex w-8 items-center justify-center font-bold text-[var(--muted)]">
                      {index + 1}
                    </div>

                    <input
                      value={answer.text}
                      onChange={(event) =>
                        updateAnswerBankOption(
                          answer.id,
                          event.target.value
                        )
                      }
                      placeholder={`الخيار ${
                        index + 1
                      }`}
                      className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeAnswerBankOption(
                          answer.id
                        )
                      }
                      className="rounded-lg px-3 text-red-600"
                    >
                      حذف
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <div className="mb-2">
          <label className="mb-2 block text-sm font-semibold">
            شرح الإجابة
          </label>

          <textarea
            value={explanation}
            onChange={(event) =>
              setExplanation(
                event.target.value
              )
            }
            rows={4}
            placeholder="شرح يظهر للطالب بعد تسليم الاختبار..."
            className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--primary)]"
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) =>
              setIsActive(
                event.target.checked
              )
            }
          />

          السؤال نشط ويُستخدم في الاختبارات
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 font-semibold disabled:opacity-50"
          >
            إلغاء
          </button>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "جارٍ الحفظ..."
            : isEditing
            ? "حفظ التعديلات"
            : "إضافة السؤال"}
        </button>
      </div>
    </form>
  );
}