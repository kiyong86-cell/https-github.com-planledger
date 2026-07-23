import { BusinessPlanContent, PlanImage } from "./types";

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

// 색상이 있는 셀은 테두리 CSS를 명시하지 않으면 선이 사라진다.
// 그래서 모든 셀(머리글·데이터)에 회색 격자선을 직접 넣어준다.
const CB = `border:1px solid ${BORDER};`;
const TABLE_OPEN = `<table style="border:1px solid ${BORDER}">`;
const TH = `${CB}background-color:${GREEN};color:#FFFFFF;text-align:center`;

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function heading(text: string): string {
  return `<h2 style="color:${GREEN}">${esc(text)}</h2>`;
}

function paragraphsHtml(text: string): string {
  const body = text.trim() || "(작성된 내용 없음)";
  return body
    .split("\n")
    .map((line) => `<p style="color:${DARK}">${esc(line)}</p>`)
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
      const timeCell = `<td style="${CB}background-color:${LIGHT_GREEN};color:${GREEN_MID};text-align:center"><strong>${esc(
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
          return `<td ${attrs} style="${CB}${bg}text-align:center">${lines}</td>`;
        })
        .join("");
      return `<tr>${timeCell}${cells}</tr>`;
    })
    .join("");

  return `${TABLE_OPEN}${header}${rows}</table>`;
}

function budgetHtml(content: BusinessPlanContent): string {
  const total = Number(content.budget?.total) || 0;
  const items = content.budget?.items ?? [];
  const allocated = items.reduce((sum, i) => sum + Number(i.amount), 0);
  const remaining = total - allocated;

  const header = `<tr><th style="${TH}">프로그램명</th><th style="${TH}">산출 내역</th><th style="${TH}">금액 (원)</th><th style="${TH}">비고</th></tr>`;
  const rows = items
    .map((item, i) => {
      const stripe = i % 2 === 1 ? `background-color:${LIGHT_GREEN};` : "";
      return `<tr><td style="${CB}${stripe}">${esc(
        item.name
      )}</td><td style="${CB}${stripe}color:${GRAY}">${esc(
        item.detail
      )}</td><td style="${CB}${stripe}text-align:right">${Number(
        item.amount
      ).toLocaleString("ko-KR")}</td><td style="${CB}${stripe}color:${GRAY}">${esc(
        item.note
      )}</td></tr>`;
    })
    .join("");
  const sumRow = items.length
    ? `<tr><td style="${CB}background-color:${CREAM};color:${GREEN}"><strong>합계</strong></td><td style="${CB}background-color:${CREAM}"></td><td style="${CB}background-color:${CREAM};color:${GREEN};text-align:right"><strong>${allocated.toLocaleString(
        "ko-KR"
      )}</strong></td><td style="${CB}background-color:${CREAM}"></td></tr>`
    : "";
  const table = items.length
    ? `${TABLE_OPEN}${header}${rows}${sumRow}</table>`
    : `<p style="color:${GRAY}">(배정된 프로그램 없음)</p>`;

  const remainColor = remaining < 0 ? "#C0392B" : GREEN_MID;
  return `<p style="color:${GREEN}"><strong>총 예산: ${total.toLocaleString(
    "ko-KR"
  )}원</strong></p>${table}<p style="color:${remainColor}">남은 예산: ${remaining.toLocaleString(
    "ko-KR"
  )}원${remaining < 0 ? " (예산 초과)" : ""}</p>`;
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
      const res = await fetch(`/api/uploads/${img.file}`);
      if (!res.ok) continue;
      const blob = await res.blob();
      const ext = img.file.split(".").pop()?.toLowerCase() ?? "png";
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
        ? `<p style="color:${GRAY}"><em>${esc(img.caption)}</em></p>`
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

export async function exportBusinessPlanToHwpx(
  title: string,
  content: BusinessPlanContent
) {
  const planTypeLabel =
    content.planType === "internal" ? "내부 기획안" : "외부 기획안";
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  let sectionNumber = 0;
  const sectionsHtml = content.sections
    .map((section) => {
      sectionNumber += 1;
      return `${heading(`${sectionNumber}. ${section.title || "제목 없음"}`)}${paragraphsHtml(
        section.body
      )}`;
    })
    .join("");

  const hasTimetable =
    content.timetable?.days?.length > 0 && content.timetable?.rows?.length > 0;
  let timetableSection = "";
  if (hasTimetable) {
    sectionNumber += 1;
    timetableSection = `${heading(`${sectionNumber}. 일정표`)}${timetableHtml(content)}`;
  }

  sectionNumber += 1;
  const budgetSection = `${heading(`${sectionNumber}. 예산안`)}${budgetHtml(content)}`;

  const { html: imagesHtml, resolver } = content.images?.length
    ? await imagesHtmlAndResolver(content.images)
    : { html: "", resolver: () => null };

  let imagesSection = "";
  if (content.images?.length && imagesHtml) {
    sectionNumber += 1;
    imagesSection = `${heading(`${sectionNumber}. 사진 첨부`)}${imagesHtml}`;
  }

  const html = `<html><body>
<h1 style="color:${GREEN}">${esc(title || "기획안")}</h1>
<p style="color:${GOLD}"><strong>${esc(planTypeLabel)}</strong> · ${esc(dateStr)}</p>
${sectionsHtml}
${timetableSection}
${budgetSection}
${imagesSection}
</body></html>`;

  const { htmlToHwpx } = await import("hwp-convert");
  const bytes = await htmlToHwpx(html, {
    title: title || "기획안",
    creator: "기획안 관리",
    imageResolver: resolver,
  });

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
