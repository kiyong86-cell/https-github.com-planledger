import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  AlignmentType,
  HeadingLevel,
} from "docx";
import { BusinessPlanContent, PlanImage, Timetable } from "./types";

// 두레줄기 소개자료 문서에서 가져온 색상 팔레트
const GREEN = "2C4A2E"; // 진한 녹색 (제목, 표 머리)
const GREEN_MID = "3D6B41"; // 중간 녹색 (시간열 등 보조 머리)
const LIGHT_GREEN = "EEF4EF"; // 연녹색 (줄무늬 배경)
const CREAM = "F5F0E8"; // 크림색 (합계 행)
const GOLD = "B8965A"; // 금색 (포인트 선)
const GRAY = "666666"; // 회색 (보조 텍스트)
const DARK = "3A3A3A"; // 본문 텍스트
const BORDER = "C9D3CA"; // 표 테두리

const CONTENT_WIDTH = 9026; // A4 - 기본 여백(1인치x2), DXA 단위

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
const TABLE_BORDERS = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
  insideHorizontal: thinBorder,
  insideVertical: thinBorder,
};
const CELL_MARGINS = { top: 100, bottom: 100, left: 140, right: 140 };

function headerCell(text: string, width: number, fill = GREEN): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill },
    verticalAlign: VerticalAlign.CENTER,
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: text || "-", bold: true, color: "FFFFFF", size: 20 }),
        ],
      }),
    ],
  });
}

function bodyCell(
  text: string,
  width: number,
  options: {
    fill?: string;
    bold?: boolean;
    color?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    rowSpan?: number;
    columnSpan?: number;
  } = {}
): TableCell {
  const lines = (text.trim() || "-").split("\n");
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: options.fill
      ? { type: ShadingType.CLEAR, fill: options.fill }
      : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: CELL_MARGINS,
    rowSpan: options.rowSpan,
    columnSpan: options.columnSpan,
    children: lines.map(
      (line) =>
        new Paragraph({
          alignment: options.align ?? AlignmentType.CENTER,
          children: [
            new TextRun({
              text: line,
              size: 19,
              bold: options.bold,
              color: options.color ?? DARK,
            }),
          ],
        })
    ),
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 },
    },
    children: [new TextRun({ text, bold: true, size: 26, color: GREEN })],
  });
}

function timetableTable(timetable: Timetable): Table {
  const timeWidth = 1500;
  const dayWidth = Math.floor(
    (CONTENT_WIDTH - timeWidth) / Math.max(1, timetable.days.length)
  );
  const columnWidths = [
    timeWidth,
    ...timetable.days.map(() => dayWidth),
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("시간", timeWidth),
      ...timetable.days.map((day) => headerCell(day, dayWidth)),
    ],
  });

  const bodyRows = timetable.rows.map(
    (row) =>
      new TableRow({
        children: [
          bodyCell(row.time, timeWidth, {
            fill: LIGHT_GREEN,
            bold: true,
            color: GREEN_MID,
          }),
          // 병합에 덮여 숨겨진 셀은 docx에서 아예 내보내지 않는다
          ...row.cells
            .map((cell, ci) =>
              cell.hidden
                ? null
                : bodyCell(cell.text, dayWidth * cell.colSpan, {
                    rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
                    columnSpan: cell.colSpan > 1 ? cell.colSpan : undefined,
                    fill:
                      cell.rowSpan > 1 || cell.colSpan > 1
                        ? "FDFCF7"
                        : undefined,
                  })
            )
            .filter((c): c is TableCell => c !== null),
        ],
      })
  );

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths,
    borders: TABLE_BORDERS,
    rows: [headerRow, ...bodyRows],
  });
}

function budgetTable(content: BusinessPlanContent): Table {
  const widths = [2200, 2900, 1500, 2426]; // 프로그램명 / 산출 내역 / 금액 / 비고
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("프로그램명", widths[0]),
      headerCell("산출 내역", widths[1]),
      headerCell("금액 (원)", widths[2]),
      headerCell("비고", widths[3]),
    ],
  });

  const itemRows = content.budget.items.map(
    (item, i) =>
      new TableRow({
        children: [
          bodyCell(item.name, widths[0], {
            align: AlignmentType.LEFT,
            fill: i % 2 === 1 ? LIGHT_GREEN : undefined,
          }),
          bodyCell(item.detail, widths[1], {
            align: AlignmentType.LEFT,
            color: GRAY,
            fill: i % 2 === 1 ? LIGHT_GREEN : undefined,
          }),
          bodyCell(
            Number(item.amount).toLocaleString("ko-KR"),
            widths[2],
            {
              align: AlignmentType.RIGHT,
              fill: i % 2 === 1 ? LIGHT_GREEN : undefined,
            }
          ),
          bodyCell(item.note, widths[3], {
            align: AlignmentType.LEFT,
            color: GRAY,
            fill: i % 2 === 1 ? LIGHT_GREEN : undefined,
          }),
        ],
      })
  );

  const allocated = content.budget.items.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const sumRow = new TableRow({
    children: [
      bodyCell("합계", widths[0], { fill: CREAM, bold: true, color: GREEN }),
      bodyCell("", widths[1], { fill: CREAM }),
      bodyCell(allocated.toLocaleString("ko-KR"), widths[2], {
        fill: CREAM,
        bold: true,
        color: GREEN,
        align: AlignmentType.RIGHT,
      }),
      bodyCell("", widths[3], { fill: CREAM }),
    ],
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    borders: TABLE_BORDERS,
    rows: [headerRow, ...itemRows, sumRow],
  });
}

export function buildPlanDocument(
  title: string,
  content: BusinessPlanContent,
  imageParas: Paragraph[]
): Document {
  const planTypeLabel =
    content.planType === "internal" ? "내부 기획안" : "외부 기획안";
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: title || "기획안", bold: true, size: 40, color: GREEN }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 8 },
      },
      children: [
        new TextRun({ text: planTypeLabel, size: 18, color: GOLD, bold: true }),
        new TextRun({ text: `  ·  ${dateStr}`, size: 18, color: GRAY }),
      ],
    }),
  ];

  content.sections.forEach((section, i) => {
    children.push(sectionHeading(`${i + 1}. ${section.title || "제목 없음"}`));
    const text = section.body.trim() || "(작성된 내용 없음)";
    for (const line of text.split("\n")) {
      children.push(
        new Paragraph({
          spacing: { after: 80, line: 300 },
          children: [new TextRun({ text: line, size: 21, color: DARK })],
        })
      );
    }
  });

  let sectionNumber = content.sections.length;

  const hasTimetable =
    content.timetable?.days?.length > 0 && content.timetable?.rows?.length > 0;
  if (hasTimetable) {
    sectionNumber += 1;
    children.push(sectionHeading(`${sectionNumber}. 일정표`));
    children.push(timetableTable(content.timetable));
  }

  sectionNumber += 1;
  children.push(sectionHeading(`${sectionNumber}. 예산안`));

  const total = Number(content.budget?.total) || 0;
  const allocated = (content.budget?.items ?? []).reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );
  const remaining = total - allocated;

  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `총 예산: ${total.toLocaleString("ko-KR")}원`,
          bold: true,
          size: 22,
          color: GREEN,
        }),
      ],
    })
  );

  if (content.budget?.items?.length) {
    children.push(budgetTable(content));
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: `남은 예산: ${remaining.toLocaleString("ko-KR")}원`,
            bold: true,
            size: 20,
            color: remaining < 0 ? "C0392B" : GREEN_MID,
          }),
          ...(remaining < 0
            ? [
                new TextRun({
                  text: "  (예산 초과)",
                  size: 18,
                  color: "C0392B",
                }),
              ]
            : []),
        ],
      })
    );
  } else {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "(배정된 프로그램 없음)", size: 19, color: GRAY }),
        ],
      })
    );
  }

  if (imageParas.length > 0) {
    sectionNumber += 1;
    children.push(sectionHeading(`${sectionNumber}. 사진 첨부`));
    children.push(...imageParas);
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: {
              ascii: "Malgun Gothic",
              eastAsia: "Malgun Gothic",
              hAnsi: "Malgun Gothic",
            },
          },
        },
      },
    },
    sections: [{ children }],
  });
}

const DOCX_IMAGE_TYPES: Record<string, "png" | "jpg" | "gif" | "bmp"> = {
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
  gif: "gif",
  bmp: "bmp",
};

async function imageParagraphs(images: PlanImage[]): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];

  for (const img of images) {
    const ext = img.file.split(".").pop()?.toLowerCase() ?? "";
    const type = DOCX_IMAGE_TYPES[ext];

    try {
      const res = await fetch(`/api/uploads/${img.file}`);
      if (!res.ok) continue;
      const blob = await res.blob();

      if (!type) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: `(첨부 사진: ${img.caption || img.file} — 이 형식은 Word에 넣을 수 없어 생략됨)`,
                italics: true,
                size: 18,
                color: GRAY,
              }),
            ],
          })
        );
        continue;
      }

      const bitmap = await createImageBitmap(blob);
      const maxWidth = 550;
      const scale = Math.min(1, maxWidth / bitmap.width);

      paragraphs.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new ImageRun({
              type,
              data: await blob.arrayBuffer(),
              transformation: {
                width: Math.round(bitmap.width * scale),
                height: Math.round(bitmap.height * scale),
              },
            }),
          ],
        })
      );

      if (img.caption) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: img.caption,
                italics: true,
                size: 18,
                color: GRAY,
              }),
            ],
          })
        );
      }
    } catch {
      // 개별 사진을 불러오지 못해도 나머지 내보내기는 계속 진행
    }
  }

  return paragraphs;
}

export async function exportBusinessPlanToDocx(
  title: string,
  content: BusinessPlanContent
) {
  const imageParas = content.images?.length
    ? await imageParagraphs(content.images)
    : [];

  const doc = buildPlanDocument(title, content, imageParas);

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title || "기획안"}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
