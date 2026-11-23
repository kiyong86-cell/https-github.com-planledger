// Word→한글 변환 스트레스 점검 — 실행: npm run stress:convert
// 실제 Word가 만드는 까다로운 구조(병합 셀, 중첩 표, 셀 안 여러 문단)를 docx로 만들어
// 변환기를 통째로 돌린 뒤, 표 구조와 글자가 살아남았는지 센다.
import { writeFileSync } from "node:fs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  AlignmentType,
  VerticalMergeType,
} from "docx";
import { convertDocxToHwpx } from "../src/lib/docxToHwpx";

const cell = (text: string, opts: Record<string, unknown> = {}) =>
  new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
    ...opts,
  });

// 1) 가로·세로 병합이 섞인 표 (Word 문서에서 가장 흔한 형태)
const merged = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [3000, 2000, 2000, 3000],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "머리글 가로병합", bold: true, size: 20 })],
            }),
          ],
          columnSpan: 4,
          shading: { type: ShadingType.CLEAR, fill: "D9E2F3" },
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph("세로병합")],
          verticalMerge: VerticalMergeType.RESTART,
        }),
        cell("A1"),
        cell("B1"),
        cell("C1"),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("")], verticalMerge: VerticalMergeType.CONTINUE }),
        cell("A2"),
        new TableCell({ children: [new Paragraph("B2+C2")], columnSpan: 2 }),
      ],
    }),
  ],
});

// 2) 셀 안에 표가 또 들어간 표 (비정형 서식 문서에서 자주 나옴)
const inner = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [new TableRow({ children: [cell("속표-가"), cell("속표-나")] })],
});
const nested = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [4000, 6000],
  rows: [
    new TableRow({
      children: [
        cell("바깥-왼쪽"),
        new TableCell({ children: [new Paragraph("바깥-오른쪽"), inner] }),
      ],
    }),
    new TableRow({ children: [cell("아래-왼쪽"), cell("아래-오른쪽")] }),
  ],
});

// 3) 중첩 표 뒤에 오는 평범한 표 — 앞의 표 때문에 서식이 밀리는지 확인
const after = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [5000, 5000],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph("색칠-왼쪽")],
          shading: { type: ShadingType.CLEAR, fill: "FFF2CC" },
        }),
        cell("민-오른쪽"),
      ],
    }),
  ],
});

// 4) 한 셀에 문단 여러 개 (줄바꿈으로 풀려야 함)
const multi = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [5000, 5000],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph("첫째 줄"), new Paragraph("둘째 줄"), new Paragraph("셋째 줄")],
        }),
        cell("옆칸"),
      ],
    }),
  ],
});

// 5) 세로병합 아래 행에 색칠 — 이어짐 셀을 잘못 세면 색이 한 칸 밀린다
const shifted = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: [3000, 3000, 4000],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph("세로")],
          verticalMerge: VerticalMergeType.RESTART,
        }),
        cell("윗-가운데"),
        cell("윗-오른쪽"),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("")], verticalMerge: VerticalMergeType.CONTINUE }),
        new TableCell({
          children: [new Paragraph("초록칸")],
          shading: { type: ShadingType.CLEAR, fill: "C6E0B4" },
        }),
        new TableCell({
          children: [new Paragraph("분홍칸")],
          shading: { type: ShadingType.CLEAR, fill: "F8CBAD" },
        }),
      ],
    }),
  ],
});

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({ children: [new TextRun({ text: "변환 스트레스 점검", bold: true, size: 36 })] }),
        new Paragraph("① 병합 섞인 표"),
        merged,
        new Paragraph("② 중첩 표"),
        nested,
        new Paragraph("③ 중첩 표 뒤의 표"),
        after,
        new Paragraph("④ 셀 안 여러 문단"),
        multi,
        new Paragraph("⑤ 세로병합 아래 색칠"),
        shifted,
        new Paragraph("끝 문단"),
      ],
    },
  ],
});

const buf = await Packer.toBuffer(doc);
writeFileSync("node_modules/.cache/stress.docx", buf);

const file = new File([buf], "stress.docx", {
  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});
const { blob } = await convertDocxToHwpx(file);
const bytes = new Uint8Array(await blob.arrayBuffer());
writeFileSync("node_modules/.cache/stress.hwpx", bytes);

const JSZip = (await import("jszip")).default;
const zip = await JSZip.loadAsync(bytes);
const section = await zip.file("Contents/section0.xml")!.async("string");

// 결과 표 구조 요약
const tbls = [...section.matchAll(/<hp:tbl\b[^>]*>/g)].map((m) => ({
  rowCnt: m[0].match(/rowCnt="(\d+)"/)?.[1],
  colCnt: m[0].match(/colCnt="(\d+)"/)?.[1],
}));
console.log("결과 표 개수:", tbls.length);
tbls.forEach((t, i) => console.log(`  표${i + 1}: ${t.rowCnt}행 × ${t.colCnt}열`));

const text = [...section.matchAll(/<hp:t>([\s\S]*?)<\/hp:t>/g)].map((m) => m[1]).join("");
const want = [
  "머리글 가로병합",
  "세로병합",
  "A1",
  "B1",
  "C1",
  "A2",
  "B2+C2",
  "바깥-왼쪽",
  "바깥-오른쪽",
  "속표-가",
  "속표-나",
  "아래-왼쪽",
  "아래-오른쪽",
  "색칠-왼쪽",
  "민-오른쪽",
  "첫째 줄",
  "둘째 줄",
  "셋째 줄",
  "옆칸",
  "세로",
  "윗-가운데",
  "윗-오른쪽",
  "초록칸",
  "분홍칸",
  "끝 문단",
];
const missing = want.filter((w) => !text.includes(w));
console.log("사라진 글자:", missing.length ? missing.join(", ") : "없음");


// 색 자체가 결과 파일에 들어갔는지 (어느 칸에 들어갔는지는 offline/check.ts가 본다)
{
  const header = await zip.file("Contents/header.xml")!.async("string");
  const colors = [...header.matchAll(/faceColor="#?([0-9A-Fa-f]{6})"/g)]
    .map((m) => m[1].toUpperCase())
    .filter((c) => c !== "000000" && c !== "FFFFFF");
  console.log("살아남은 셀 색:", [...new Set(colors)].join(", ") || "(없음)");
}

// 셀 너비 합이 표 너비와 맞는지 (틀어지면 한글에서 표가 어그러진다)
for (const [i, tbl] of [...section.matchAll(/<hp:tbl\b[\s\S]*?<\/hp:tbl>/g)].entries()) {
  const total = Number(tbl[0].match(/<hp:sz width="(\d+)"/)?.[1] ?? 0);
  const firstRow = tbl[0].match(/<hp:tr>[\s\S]*?<\/hp:tr>/)?.[0] ?? "";
  const widths = [...firstRow.matchAll(/<hp:cellSz width="(\d+)"/g)].map((m) => Number(m[1]));
  const sum = widths.reduce((a, b) => a + b, 0);
  console.log(
    `  표${i + 1} 너비: 표 ${total} / 첫 행 셀 합 ${sum}` +
      (total && sum && Math.abs(total - sum) > 2 ? "  ← 어긋남" : "")
  );
}
