// 변환 규칙 자체 점검 — 실행: node offline/check.ts
// 원본 docx의 글자 크기가 HTML 단계까지 살아 넘어가는지 확인한다.
// (여기가 깨지면 결과물 글자 크기가 전부 엔진 기본값으로 바뀐다)
import assert from "node:assert";
import {
  extractTableCellStyles,
  applyTableCellStyles,
  extractBodyAligns,
  applyBodyAligns,
  extractParaMargins,
  applyParaMargins,
  extractPageBreakTexts,
  applyPageBreaks,
  applyParaBorders,
  bannerHtml,
  BLANK_LINE,
} from "../src/lib/docxToHwpx";
import { buildPlanHtml } from "../src/lib/hwpExport";
import type { BusinessPlanContent } from "../src/lib/types";

const run = (name: string, fn: () => void) => {
  fn();
  console.log("  ✅", name);
};

// 8pt 런 2개 + 12pt 런 1개 → 대표 크기는 8pt여야 한다
const cellXml =
  `<w:tbl><w:tr><w:tc>` +
  `<w:shd w:fill="EFEFEF"/>` +
  `<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>가</w:t></w:r>` +
  `<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>나</w:t></w:r>` +
  `<w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>다</w:t></w:r>` +
  `</w:tc></w:tr></w:tbl>`;

run("표 셀: 가장 많이 쓰인 글자 크기를 뽑는다", () => {
  const styles = extractTableCellStyles(cellXml);
  assert.strictEqual(styles[0][0][0].fontPt, 8);
  assert.strictEqual(styles[0][0][0].fill, "EFEFEF");
});

run("표 셀: font-size CSS로 나간다", () => {
  const html = applyTableCellStyles(
    "<table><tr><td>가나다</td></tr></table>",
    extractTableCellStyles(cellXml)
  );
  assert.match(html, /font-size:8pt/);
  assert.match(html, /background-color:#EFEFEF/);
});

// 정렬은 없고 크기만 있는 문단도 반드시 잡아야 한다 (본문 대부분이 이 경우)
const bodyXml =
  `<w:body>` +
  `<w:p><w:r><w:rPr><w:sz w:val="44"/></w:rPr><w:t>큰 제목</w:t></w:r></w:p>` +
  `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>` +
  `<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>작은 가운데글</w:t></w:r></w:p>` +
  `</w:body>`;

run("본문: 정렬 없이 크기만 있어도 잡는다", () => {
  const aligns = extractBodyAligns(bodyXml);
  assert.strictEqual(aligns.length, 2);
  assert.deepStrictEqual(aligns[0], {
    text: "큰 제목",
    align: undefined,
    pt: 22,
    lineHeight: undefined,
    blanksAfter: 0,
  });
  assert.deepStrictEqual(aligns[1], {
    text: "작은 가운데글",
    align: "center",
    pt: 8,
    lineHeight: undefined,
    blanksAfter: 0,
  });
});

run("본문: 정렬과 크기가 함께 나간다", () => {
  const html = applyBodyAligns(
    "<h1>큰 제목</h1><p>작은 가운데글</p>",
    extractBodyAligns(bodyXml)
  );
  assert.match(html, /<h1 style="font-size:22pt">/);
  assert.match(html, /<p style="text-align:center;font-size:8pt">/);
});

run("본문: 줄간격(w:line auto)을 배수로 넘긴다", () => {
  const xml =
    `<w:body><w:p><w:pPr><w:spacing w:after="160" w:line="360" w:lineRule="auto"/></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>넓은 줄간격</w:t></w:r></w:p></w:body>`;
  const aligns = extractBodyAligns(xml);
  assert.strictEqual(aligns[0].lineHeight, 1.5);
  assert.match(applyBodyAligns("<p>넓은 줄간격</p>", aligns), /line-height:1\.5/);
});

// --- 문단 여백: twip → HWPUNIT (5배), paraPr 복제 ---
const marginXml =
  `<w:body>` +
  `<w:p><w:pPr><w:spacing w:before="80" w:after="280"/></w:pPr><w:r><w:t>여백 문단</w:t></w:r></w:p>` +
  `<w:p><w:r><w:t>여백 없는 문단</w:t></w:r></w:p>` +
  `</w:body>`;

run("문단 여백: 지정된 문단만 twip을 5배로 뽑는다", () => {
  const m = extractParaMargins(marginXml);
  assert.deepStrictEqual(m, [{ text: "여백 문단", prev: 400, next: 1400 }]);
});

const HEADER =
  `<hh:paraProperties itemCnt="1">` +
  `<hh:paraPr id="0" tabPrIDRef="0"><hh:margin><hh:intent value="0"/>` +
  `<hh:left value="0"/><hh:right value="0"/><hh:prev value="0"/><hh:next value="0"/>` +
  `</hh:margin></hh:paraPr></hh:paraProperties>`;
const SECTION =
  `<hp:p id="1" paraPrIDRef="0"><hp:t>여백 문단</hp:t></hp:p>` +
  `<hp:p id="2" paraPrIDRef="0"><hp:t>여백 없는 문단</hp:t></hp:p>`;

run("문단 여백: 스타일을 복제해 해당 문단만 새 id로 옮긴다", () => {
  const { header, section } = applyParaMargins(
    HEADER,
    SECTION,
    extractParaMargins(marginXml)
  );
  // 새 스타일 1개가 추가되고 개수가 갱신된다
  assert.match(header, /itemCnt="2"/);
  assert.match(header, /<hh:paraPr id="1"[\s\S]*<hh:prev value="400"\/>/);
  assert.match(header, /<hh:paraPr id="1"[\s\S]*<hh:next value="1400"\/>/);
  // 원본 스타일은 그대로 (다른 문단이 밀리면 안 된다)
  assert.match(header, /<hh:paraPr id="0"[\s\S]*?<hh:prev value="0"\/>/);
  // 해당 문단만 새 id를 가리킨다
  assert.match(section, /<hp:p id="1" paraPrIDRef="1">/);
  assert.match(section, /<hp:p id="2" paraPrIDRef="0">/);
});

run("문단 여백: 맞는 문단이 없으면 원본을 그대로 돌려준다", () => {
  const r = applyParaMargins(HEADER, SECTION, [
    { text: "없는 글자", prev: 100, next: 100 },
  ]);
  assert.strictEqual(r.header, HEADER);
  assert.strictEqual(r.section, SECTION);
});

// --- 빈 문단 / 페이지 나눔 ---
const blankXml =
  `<w:body>` +
  `<w:p><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>앞 문단</w:t></w:r></w:p>` +
  `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>` +
  `<w:p></w:p>` +
  `<w:p><w:r><w:lastRenderedPageBreak/><w:rPr><w:sz w:val="24"/></w:rPr>` +
  `<w:t>다음 장 제목</w:t></w:r></w:p>` +
  `</w:body>`;

run("빈 문단: 뒤에 붙은 개수를 앞 문단이 기억한다", () => {
  const a = extractBodyAligns(blankXml);
  assert.strictEqual(a[0].text, "앞 문단");
  assert.strictEqual(a[0].blanksAfter, 2);
  assert.strictEqual(a[1].blanksAfter, 0);
});

run("빈 문단: 빈 줄이 HTML로 되살아난다", () => {
  const html = applyBodyAligns(
    "<p>앞 문단</p><p>다음 장 제목</p>",
    extractBodyAligns(blankXml)
  );
  const blank = `<p>${BLANK_LINE}</p>`;
  assert.strictEqual(html.split(blank).length - 1, 2);
  // 빈 줄은 앞 문단 바로 뒤에 와야 한다
  assert.ok(html.indexOf("앞 문단") < html.indexOf(BLANK_LINE));
  assert.ok(html.indexOf(BLANK_LINE) < html.indexOf("다음 장 제목"));
});

run("페이지 나눔: Word가 끊은 자리의 글자를 뽑는다", () => {
  assert.deepStrictEqual(extractPageBreakTexts(blankXml), ["다음 장 제목"]);
});

run("페이지 나눔: 해당 문단만 pageBreak를 켠다", () => {
  const section =
    `<hp:p id="1" paraPrIDRef="0" pageBreak="0"><hp:t>앞 문단</hp:t></hp:p>` +
    `<hp:p id="2" paraPrIDRef="0" pageBreak="0"><hp:t>다음 장 제목</hp:t></hp:p>`;
  const out = applyPageBreaks(section, extractPageBreakTexts(blankXml));
  assert.match(out, /<hp:p id="1"[^>]*pageBreak="0"/);
  assert.match(out, /<hp:p id="2"[^>]*pageBreak="1"/);
});

run("표 안 문단은 본문 규칙에 오염되지 않는다", () => {
  const html = applyBodyAligns("<table><tr><td>큰 제목</td></tr></table>", [
    { text: "큰 제목", pt: 22 },
  ]);
  assert.ok(!html.includes("font-size"), "표 안은 셀 규칙이 담당해야 한다");
});

// --- 문단 구분선 ---
const NO_BORDER =
  `<hh:borderFill id="1" threeD="0"><hh:leftBorder type="NONE" width="0.1 mm" color="#000000"/>` +
  `<hh:bottomBorder type="NONE" width="0.1 mm" color="#000000"/></hh:borderFill>`;
const BORDER_HEADER =
  `<hh:borderFills itemCnt="1">${NO_BORDER}</hh:borderFills>` +
  `<hh:paraProperties itemCnt="1">` +
  `<hh:paraPr id="0" tabPrIDRef="0"><hh:lineSpacing type="PERCENT" value="160"/></hh:paraPr>` +
  `</hh:paraProperties>`;
const BORDER_SECTION =
  `<hp:p id="1" paraPrIDRef="0" pageBreak="0"><hp:t>1. 사업 목적</hp:t></hp:p>` +
  `<hp:p id="2" paraPrIDRef="0" pageBreak="0"><hp:t>본문 내용</hp:t></hp:p>`;

run("구분선: 아래선만 켠 스타일을 새로 만들어 붙인다", () => {
  const { header, section } = applyParaBorders(BORDER_HEADER, BORDER_SECTION, [
    { text: "1. 사업 목적", color: "#B8965A" },
  ]);
  // 아래선만 SOLID, 왼쪽선은 그대로 NONE이어야 한다
  assert.match(header, /<hh:bottomBorder type="SOLID" width="0\.25 mm" color="#B8965A"\/>/);
  assert.match(header, /id="2"[\s\S]*<hh:leftBorder type="NONE"/);
  // 새 문단 스타일이 생기고 개수가 갱신된다
  assert.match(header, /<hh:borderFills itemCnt="2">/);
  assert.match(header, /<hh:paraProperties itemCnt="2">/);
  assert.match(header, /<hh:paraPr id="1"[\s\S]*<hh:border borderFillIDRef="2"[^>]*\/><\/hh:paraPr>/);
  // 해당 문단만 새 스타일을 가리킨다
  assert.match(section, /<hp:p id="1"[^>]*paraPrIDRef="1"/);
  assert.match(section, /<hp:p id="2"[^>]*paraPrIDRef="0"/);
});

run("구분선: 같은 색 여러 문단이 스타일 하나를 나눠 쓴다", () => {
  const twoHeadings =
    `<hp:p id="1" paraPrIDRef="0"><hp:t>1. 가</hp:t></hp:p>` +
    `<hp:p id="2" paraPrIDRef="0"><hp:t>2. 나</hp:t></hp:p>`;
  const { header, section } = applyParaBorders(BORDER_HEADER, twoHeadings, [
    { text: "1. 가", color: "#B8965A" },
    { text: "2. 나", color: "#B8965A" },
  ]);
  assert.strictEqual((header.match(/<hh:border /g) || []).length, 1, "스타일은 1개여야 한다");
  assert.strictEqual((section.match(/paraPrIDRef="1"/g) || []).length, 2, "문단 2개가 가리켜야 한다");
});

run("구분선: 맞는 문단이 없으면 원본을 그대로 돌려준다", () => {
  const r = applyParaBorders(BORDER_HEADER, BORDER_SECTION, [
    { text: "없는 글자", color: "#B8965A" },
  ]);
  assert.strictEqual(r.header, BORDER_HEADER);
  assert.strictEqual(r.section, BORDER_SECTION);
});

// --- 체험판 표시줄 ---
run("체험판 표시: 문서 맨 앞에 들어간다", () => {
  const body = "<html><body><p>본문</p></body></html>";
  const withBanner = body.replace("<body>", `<body>${bannerHtml("[체험판] 안내")}`);
  assert.ok(
    withBanner.indexOf("[체험판] 안내") < withBanner.indexOf("본문"),
    "표시줄이 본문보다 앞에 와야 한다"
  );
  assert.match(withBanner, /color:#B91C1C/);
});

run("체험판 표시: 꺾쇠·앰퍼샌드가 태그로 새지 않는다", () => {
  const html = bannerHtml('<b>주의</b> & "체험"');
  assert.ok(!html.includes("<b>주의</b>"), "태그가 그대로 나가면 안 된다");
  assert.match(html, /&lt;b&gt;주의&lt;\/b&gt; &amp; /);
});

// --- 기획안 한글 내보내기 ---
const planContent: BusinessPlanContent = {
  planType: "external",
  sections: [{ title: "사업 목적", body: "지역 아동의 배움 기회를 넓힌다." }],
  timetable: {
    days: ["12일 (수)"],
    rows: [{ time: "09:00", cells: [{ text: "여는 모임", rowSpan: 1, colSpan: 1, hidden: false }] }],
  },
  budget: {
    total: 3000000,
    currency: "KRW",
    items: [{ name: "강사비", detail: "1회 200,000원", amount: 1200000, note: "" }],
  },
  images: [],
};

run("기획안: 이어붙인 style이 붙어버리지 않는다", () => {
  const { html } = buildPlanHtml("여름 배움터", planContent);
  // "font-size:9.5ptbackground-color:..." 처럼 세미콜론이 빠지면 두 속성이 같이 죽는다
  const glued = html.match(/[\d.]+(?:pt|px)[a-z-]+\s*:/g);
  assert.strictEqual(glued, null, `속성이 붙었다: ${glued?.join(", ")}`);
});

run("기획안: 표 색상이 모두 style에 살아 있다", () => {
  const { html } = buildPlanHtml("여름 배움터", planContent);
  for (const color of ["#2C4A2E", "#EEF4EF", "#F5F0E8"]) {
    assert.ok(
      html.includes(`background-color:${color}`),
      `${color} 배경이 빠졌다`
    );
  }
});

run("기획안: 제목 문단마다 여백 지정이 붙는다", () => {
  const { html, paraMargins } = buildPlanHtml("여름 배움터", planContent);
  // 문서 제목 + 부제목 + 섹션 1개 + 일정표 + 예산안
  assert.strictEqual(paraMargins.length, 5);
  // 여백은 "태그를 걷어낸 글자"로 문단을 찾으므로 검사도 같은 기준으로 한다
  const plain = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  for (const m of paraMargins) {
    assert.ok(plain.includes(m.text), `문단을 못 찾을 글자다: ${m.text}`);
  }
});

run("기획안: 구분선을 제목과 부제목에 건다", () => {
  const { paraBorders } = buildPlanHtml("여름 배움터", planContent);
  // 섹션 1개 + 일정표 + 예산안 = 금색 3개, 부제목 초록 1개
  assert.strictEqual(paraBorders.filter((b) => b.color === "#B8965A").length, 3);
  assert.strictEqual(paraBorders.filter((b) => b.color === "#2C4A2E").length, 1);
});

run("기획안: 부제목 구분선 글자가 실제 문단 글자와 같다", () => {
  const { html, paraBorders } = buildPlanHtml("여름 배움터", planContent);
  const sub = paraBorders.find((b) => b.color === "#2C4A2E")!;
  // HTML에서 태그를 걷어낸 결과 안에 그 글자가 있어야 문단을 찾을 수 있다
  const plain = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  assert.ok(plain.includes(sub.text), `문단을 못 찾을 글자다: ${sub.text}`);
});

console.log("전부 통과");
