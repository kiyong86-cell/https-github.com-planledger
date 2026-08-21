import { postProcessHwpx, ParaMargin, ParaBorder } from "./docxToHwpx";
import { BusinessPlanContent, formatMoney, PlanImage } from "./types";

const IMG_PREFIX = "app-image://";

// 두레줄기 소개자료 팔레트 (docxExport.ts와 동일)
const GREEN = "#2C4A2E";
const GREEN_MID = "#3D6B41";
const LIGHT_GREEN = "#EEF4EF";
const CREAM = "#F5F0E8";
const GOLD = "#B8965A";
const GRAY = "#666666";
const DARK = "#3A3A3A";
const BORDER = "#C9D3CA";

// 글꼴 크기·여백은 Word 내보내기(docxExport.ts)와 같은 값을 쓴다.
// Word는 half-point 단위라 26 = 13pt, 21 = 10.5pt 식으로 절반이 pt다.
const FS_TITLE = "20pt"; // 문서 제목
const FS_SUB = "9pt"; // 제목 아래 유형·날짜 줄
const FS_HEADING = "13pt"; // 섹션 제목
const FS_BODY = "10.5pt"; // 본문
const FS_TH = "10pt"; // 표 머리글
const FS_TD = "9.5pt"; // 표 데이터
const LINE = "1.25"; // 본문 줄 간격 (Word의 line:300 = 1.25줄)

// 문단 여백 (HWPUNIT, 1pt = 100). 변환 엔진이 CSS margin을 버려서 후처리로 넣는다.
const GAP_AFTER_TITLE = 600; // 문서 제목 아래
const GAP_BEFORE_HEADING = 900; // 섹션 제목 위 (섹션 사이가 벌어진다)
const GAP_AFTER_HEADING = 300; // 섹션 제목 아래

// 색상이 있는 셀은 테두리 CSS를 명시하지 않으면 선이 사라진다.
// 그래서 모든 셀(머리글·데이터)에 회색 격자선을 직접 넣어준다.
const CB = `border:1px solid ${BORDER};`;
const TABLE_OPEN = `<table style="border:1px solid ${BORDER}">`;
const TH = `${CB}background-color:${GREEN};color:#FFFFFF;text-align:center;font-size:${FS_TH}`;
// 뒤에 배경색·정렬 등을 이어 붙여 쓰므로 반드시 세미콜론으로 끝나야 한다.
// (없으면 "font-size:9.5ptbackground-color:..." 로 붙어 두 속성이 같이 죽는다)
const TD = `${CB}font-size:${FS_TD};`;

// 변환 엔진이 표의 열 너비를 무시하고 균등 분할하므로,
// Word 내보내기와 같은 비율을 나중에 결과 파일에 직접 넣어준다.
// "09:00-09:30"(11글자, 굵게)이 한 줄에 들어가야 한다. 1400에서는 잘려 두 줄이 됐다.
const TIME_COL = 1800;
const CONTENT_WIDTH = 9026; // A4 - 기본 여백, Word 내보내기와 동일
const BUDGET_COLS = [2200, 2900, 1500, 2426]; // 프로그램명/산출 내역/금액/비고

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 변환 엔진은 <h1>·<h2>의 글자 크기를 18pt·16pt로 고정하고 inline 지정을 무시한다.
// (개요 수준도 부여하지 않으므로 <h2>를 쓸 이유가 없다)
// 그래서 문단으로 만들고 Word 내보내기와 같은 크기를 직접 지정한다.
// 아래 구분선은 CSS로 안 나간다(엔진이 문단 테두리를 버림) → paraBorders로 결과 파일에 직접 넣는다.
function heading(text: string): string {
  return `<p style="color:${GREEN};font-size:${FS_HEADING};line-height:1.6"><strong>${esc(
    text
  )}</strong></p>`;
}

function paragraphsHtml(text: string): string {
  const body = text.trim() || "(작성된 내용 없음)";
  return body
    .split("\n")
    .map(
      (line) =>
        `<p style="color:${DARK};font-size:${FS_BODY};line-height:${LINE}">${esc(
          line
        )}</p>`
    )
    .join("");
}

function timetableHtml(content: BusinessPlanContent): string {
  const t = content.timetable;
  if (!t?.days?.length || !t.rows?.length) return "";

  const header = `<tr><th style="${TH}">시간</th>${t.days
    .map((d) => `<th style="${TH}">${esc(d)}</th>`)
    .join("")}</tr>`;

  const rows = t.rows
    .map((row) => {
      const timeCell = `<td style="${TD}background-color:${LIGHT_GREEN};color:${GREEN_MID};text-align:center"><strong>${esc(
        row.time
      )}</strong></td>`;
      const cells = row.cells
        .map((cell) => {
          if (cell.hidden) return "";
          const merged = cell.rowSpan > 1 || cell.colSpan > 1;
          const attrs = [
            cell.rowSpan > 1 ? `rowspan="${cell.rowSpan}"` : "",
            cell.colSpan > 1 ? `colspan="${cell.colSpan}"` : "",
          ]
            .filter(Boolean)
            .join(" ");
          const bg = merged ? `background-color:#FDFCF7;` : "";
          const lines = (cell.text || "").split("\n").map(esc).join("<br/>");
          return `<td ${attrs} style="${TD}${bg}text-align:center">${lines}</td>`;
        })
        .join("");
      return `<tr>${timeCell}${cells}</tr>`;
    })
    .join("");

  return `${TABLE_OPEN}${header}${rows}</table>`;
}

function budgetHtml(content: BusinessPlanContent): string {
  const cur = content.budget?.currency === "USD" ? "USD" : "KRW";
  const total = Number(content.budget?.total) || 0;
  const items = content.budget?.items ?? [];
  const allocated = items.reduce((sum, i) => sum + Number(i.amount), 0);
  const remaining = total - allocated;

  const header = `<tr><th style="${TH}">프로그램명</th><th style="${TH}">산출 내역</th><th style="${TH}">금액</th><th style="${TH}">비고</th></tr>`;
  const rows = items
    .map((item, i) => {
      const stripe = i % 2 === 1 ? `background-color:${LIGHT_GREEN};` : "";
      return `<tr><td style="${TD}${stripe}">${esc(
        item.name
      )}</td><td style="${TD}${stripe}color:${GRAY}">${esc(
        item.detail
      )}</td><td style="${TD}${stripe}text-align:right">${esc(
        formatMoney(Number(item.amount), cur)
      )}</td><td style="${TD}${stripe}color:${GRAY}">${esc(
        item.note
      )}</td></tr>`;
    })
    .join("");
  const sumRow = items.length
    ? `<tr><td style="${TD}background-color:${CREAM};color:${GREEN}"><strong>합계</strong></td><td style="${TD}background-color:${CREAM}"></td><td style="${TD}background-color:${CREAM};color:${GREEN};text-align:right"><strong>${esc(
        formatMoney(allocated, cur)
      )}</strong></td><td style="${TD}background-color:${CREAM}"></td></tr>`
    : "";
  const table = items.length
    ? `${TABLE_OPEN}${header}${rows}${sumRow}</table>`
    : `<p style="color:${GRAY}">(배정된 프로그램 없음)</p>`;

  const remainColor = remaining < 0 ? "#C0392B" : GREEN_MID;
  const summary = `font-size:11pt`;
  return `<p style="color:${GREEN};${summary}"><strong>총 예산: ${esc(
    formatMoney(total, cur)
  )}</strong></p>${table}<p style="color:${remainColor};${summary}">남은 예산: ${esc(
    formatMoney(remaining, cur)
  )}${remaining < 0 ? " (예산 초과)" : ""}</p>`;
}

async function imagesHtmlAndResolver(images: PlanImage[]): Promise<{
  html: string;
  resolver: (src: string) => { data: Uint8Array; extension: string } | null;
}> {
  const cache = new Map<
    string,
    { data: Uint8Array; extension: string; width: number; height: number }
  >();

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const key = `${IMG_PREFIX}${i}`;
    try {
      const res = await fetch(img.file);
      if (!res.ok) continue;
      const blob = await res.blob();
      const mime = img.file.match(/^data:image\/([a-z]+);/i)?.[1]?.toLowerCase();
      const ext = mime ?? img.file.split(".").pop()?.toLowerCase() ?? "png";
      const bitmap = await createImageBitmap(blob);
      const maxWidth = 480;
      const scale = Math.min(1, maxWidth / bitmap.width);
      cache.set(key, {
        data: new Uint8Array(await blob.arrayBuffer()),
        extension: ext,
        width: Math.round(bitmap.width * scale),
        height: Math.round(bitmap.height * scale),
      });
    } catch {
      // 개별 사진을 못 불러와도 나머지는 계속 진행
    }
  }

  const html = images
    .map((img, i) => {
      const key = `${IMG_PREFIX}${i}`;
      const entry = cache.get(key);
      if (!entry) return "";
      const captionHtml = img.caption
        ? `<p style="color:${GRAY};font-size:${FS_SUB}"><em>${esc(
            img.caption
          )}</em></p>`
        : "";
      return `<p><img src="${key}" width="${entry.width}" height="${entry.height}"/></p>${captionHtml}`;
    })
    .join("");

  const resolver = (src: string) => {
    const entry = cache.get(src);
    if (!entry) return null;
    return { data: entry.data, extension: entry.extension };
  };

  return { html, resolver };
}

/**
 * 기획안 HTML과 후처리에 필요한 값들을 만든다.
 * (내보내기 함수는 브라우저 전용이라 이 부분만 떼어 두면 node에서 점검할 수 있다)
 */
export function buildPlanHtml(
  title: string,
  content: BusinessPlanContent,
  imagesHtml = ""
): {
  html: string;
  grids: number[][];
  paraMargins: ParaMargin[];
  paraBorders: ParaBorder[];
} {
  const planTypeLabel =
    content.planType === "internal" ? "내부 기획안" : "외부 기획안";
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // 변환 엔진이 CSS margin을 버리므로 문단 여백은 결과 파일에 직접 넣는다.
  // 글자로 문단을 찾는 방식이라, 여기서 만든 글자와 아래 HTML의 글자가 같아야 한다.
  const paraMargins: ParaMargin[] = [];
  const paraBorders: ParaBorder[] = [];
  const gap = (text: string, prev: number, next: number) => {
    if (text.trim()) paraMargins.push({ text: text.trim(), prev, next });
  };
  // 섹션 제목: 위아래 여백 + 금색 구분선
  const headingMeta = (text: string) => {
    gap(text, GAP_BEFORE_HEADING, GAP_AFTER_HEADING);
    if (text.trim()) paraBorders.push({ text: text.trim(), color: GOLD });
  };

  let sectionNumber = 0;
  const sectionsHtml = content.sections
    .map((section) => {
      sectionNumber += 1;
      const headText = `${sectionNumber}. ${section.title || "제목 없음"}`;
      headingMeta(headText);
      return `${heading(headText)}${paragraphsHtml(section.body)}`;
    })
    .join("");

  const hasTimetable =
    content.timetable?.days?.length > 0 && content.timetable?.rows?.length > 0;
  let timetableSection = "";
  if (hasTimetable) {
    sectionNumber += 1;
    const headText = `${sectionNumber}. 일정표`;
    headingMeta(headText);
    timetableSection = `${heading(headText)}${timetableHtml(content)}`;
  }

  sectionNumber += 1;
  const budgetHead = `${sectionNumber}. 예산안`;
  headingMeta(budgetHead);
  const budgetSection = `${heading(budgetHead)}${budgetHtml(content)}`;

  let imagesSection = "";
  if (imagesHtml) {
    sectionNumber += 1;
    const headText = `${sectionNumber}. 사진 첨부`;
    headingMeta(headText);
    imagesSection = `${heading(headText)}${imagesHtml}`;
  }

  const titleText = title || "기획안";
  gap(titleText, 0, GAP_AFTER_TITLE);

  // 제목 아래 유형·날짜 줄에는 조금 굵은 초록 구분선을 깐다.
  // 글자로 문단을 찾으므로 아래 HTML에서 태그를 걷어낸 결과와 같아야 한다.
  const subLine = `${planTypeLabel} · ${dateStr}`;
  paraBorders.push({ text: subLine, color: GREEN, widthMm: "0.4 mm" });
  gap(subLine, 0, GAP_AFTER_TITLE);

  const html = `<html><body>
<p style="color:${GREEN};font-size:${FS_TITLE};line-height:1.3"><strong>${esc(titleText)}</strong></p>
<p style="color:${GOLD};font-size:${FS_SUB}"><strong>${esc(planTypeLabel)}</strong> · <span style="color:${GRAY}">${esc(dateStr)}</span></p>
${sectionsHtml}
${timetableSection}
${budgetSection}
${imagesSection}
</body></html>`;

  // 표가 나오는 순서대로 열 너비 비율을 모은다.
  const grids: number[][] = [];
  if (hasTimetable) {
    const dayW = Math.floor(
      (CONTENT_WIDTH - TIME_COL) / Math.max(1, content.timetable.days.length)
    );
    grids.push([TIME_COL, ...content.timetable.days.map(() => dayW)]);
  }
  if (content.budget?.items?.length) grids.push(BUDGET_COLS);

  return { html, grids, paraMargins, paraBorders };
}

export async function exportBusinessPlanToHwpx(
  title: string,
  content: BusinessPlanContent
) {
  const { html: imagesHtml, resolver } = content.images?.length
    ? await imagesHtmlAndResolver(content.images)
    : { html: "", resolver: () => null };

  const { html, grids, paraMargins, paraBorders } = buildPlanHtml(
    title,
    content,
    imagesHtml
  );

  const { htmlToHwpx } = await import("hwp-convert");
  const raw: Uint8Array = await htmlToHwpx(html, {
    title: title || "기획안",
    creator: "기획안 관리",
    imageResolver: resolver,
  });

  const bytes = await postProcessHwpx(raw, { grids, paraMargins, paraBorders });

  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/hwp+zip",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title || "기획안"}.hwpx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
