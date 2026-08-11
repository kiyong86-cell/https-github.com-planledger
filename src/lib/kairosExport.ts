// KAIROS 주간 문서 내보내기 — PDF(인쇄) / Word(.doc) / 한글(.hwpx)
// 세 형식 모두 같은 HTML 한 벌에서 만든다.
import {
  adherence,
  CATS,
  CatKey,
  DAY_KO,
  DAYS,
  dayDate,
  displayTotals,
  END_HOUR,
  fmt,
  GridMode,
  gridTotals,
  NIGHT_REST,
  SLOTS,
  START_HOUR,
  sumDay,
  WeekData,
} from "./kairos";

const BORDER = "#888";
const HEAD_BG = "#dff1f5";

function esc(v: string | undefined | null): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const cell = (extra = "") =>
  `border:1px solid ${BORDER};padding:3px 5px;font-size:9.5pt;${extra}`;
const head = (extra = "") =>
  cell(`background-color:${HEAD_BG};text-align:center;font-weight:bold;${extra}`);

/** 30분 칸을 시간(hh:mm) 문자열로 */
function slotTime(i: number): string {
  const h = START_HOUR + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
}

/** 연속으로 같은 활동인 칸을 하나의 시간 블록으로 묶는다. */
function blocks(row: (CatKey | null)[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < SLOTS) {
    const k = row[i];
    if (!k) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < SLOTS && row[j] === k) j += 1;
    const name = CATS.find((c) => c.key === k)?.ko ?? k;
    const end = j >= SLOTS ? `${END_HOUR}:00` : slotTime(j);
    out.push(`${slotTime(i)}~${end} ${name}`);
    i = j;
  }
  return out;
}

function catTable(
  tot: ReturnType<typeof displayTotals>,
  cmp?: ReturnType<typeof displayTotals>
): string {
  let h = `<table style="border-collapse:collapse"><tr><th style="${head(
    "width:80px"
  )}"></th>`;
  DAYS.forEach((d) => {
    h += `<th style="${head("width:46px")}">${d}</th>`;
  });
  h += `<th style="${head("width:46px")}">주계</th></tr>`;

  CATS.forEach((c) => {
    let wk = 0;
    h += `<tr><td style="${cell()}">${c.ko}</td>`;
    DAYS.forEach((d) => {
      const v = tot[d][c.key];
      wk += v;
      let text = v ? fmt(v) : "";
      if (cmp) {
        const diff = v - cmp[d][c.key];
        if (diff)
          text += ` <span style="font-size:7.5pt;color:${
            diff > 0 ? "#0d9488" : "#c0392b"
          }">${diff > 0 ? "+" : ""}${fmt(diff)}</span>`;
      }
      h += `<td style="${cell("text-align:center")}">${text || "&nbsp;"}</td>`;
    });
    h += `<td style="${cell("text-align:center")}">${
      wk ? fmt(wk) : "&nbsp;"
    }</td></tr>`;
  });

  let grand = 0;
  h += `<tr><td style="${head("text-align:left")}">합계</td>`;
  DAYS.forEach((d) => {
    const s = sumDay(tot[d]);
    grand += s;
    const off = s !== 24 && s !== NIGHT_REST;
    h += `<td style="${head(off ? "color:#c0392b" : "")}">${fmt(s)}</td>`;
  });
  h += `<td style="${head()}">${fmt(grand)}</td></tr></table>`;
  return h;
}

function gridTable(data: WeekData): string {
  const pt = gridTotals(data, "plan");
  const at = gridTotals(data, "act");
  let h = `<table style="border-collapse:collapse"><tr>
<th style="${head("width:34px")}">요일</th><th style="${head(
    "width:30px"
  )}">구분</th>`;
  for (let i = START_HOUR; i < END_HOUR; i++) {
    h += `<th colspan="2" style="${head("width:28px;font-size:7.5pt")}">${String(
      i
    ).padStart(2, "0")}</th>`;
  }
  h += `<th style="${head("width:36px")}">합계</th></tr>`;

  DAYS.forEach((d) => {
    (
      [
        ["plan", "계획"],
        ["act", "실행"],
      ] as [GridMode, string][]
    ).forEach(([mode, label], mi) => {
      h += "<tr>";
      if (mi === 0)
        h += `<td rowspan="2" style="${cell(
          "text-align:center;font-weight:bold"
        )}">${DAY_KO[d]}</td>`;
      h += `<td style="${cell("text-align:center;font-size:8pt")}">${label}</td>`;
      for (let i = 0; i < SLOTS; i++) {
        const k = data.grid[mode][d][i];
        const color = k ? CATS.find((c) => c.key === k)?.color : null;
        h += `<td${color ? ` bgcolor="${color}"` : ""} style="${cell(
          color ? `background-color:${color};` : ""
        )}">&nbsp;</td>`;
      }
      h += `<td style="${cell("text-align:center;font-size:8pt")}">${fmt(
        sumDay((mode === "plan" ? pt : at)[d])
      )}h</td></tr>`;
    });
  });
  return h + "</table>";
}

function legend(): string {
  return `<p style="font-size:9pt">${CATS.map(
    (c) =>
      `<span bgcolor="${c.color}" style="background-color:${c.color}">&nbsp;&nbsp;&nbsp;</span> ${c.ko}`
  ).join(" &nbsp; ")}</p>`;
}

function dayBlock(data: WeekData, week: string, index: number): string {
  const d = DAYS[index];
  const day = data.days[d];
  const adh = adherence(data, d);
  const filled = day.todos.filter((t) => t.t.trim());
  const done = filled.filter((t) => t.done).length;
  const p = sumDay(gridTotals(data, "plan")[d]);
  const a = sumDay(gridTotals(data, "act")[d]);

  let h = `<p style="font-size:14pt"><strong>일일학습계획표</strong>
<span style="font-size:10pt">${dayDate(week, index)} (${DAY_KO[d]}요일)</span></p>
<table style="border-collapse:collapse;width:100%">
<tr><td style="${head("width:110px")}">오늘의 묵상 본문</td><td style="${cell()}">${
    esc(day.med) || "&nbsp;"
  }</td></tr>
<tr><td style="${head()}">액션 포인트</td><td style="${cell()}">${
    esc(day.act) || "&nbsp;"
  }</td></tr>
<tr><td style="${head()}">감사 제목</td><td style="${cell()}">${
    esc(day.thx) || "&nbsp;"
  }</td></tr></table>
<p style="font-size:11pt"><strong>일일 자가 평가</strong></p>
<table style="border-collapse:collapse;width:100%">
<tr><td style="${head("width:110px")}">목표 달성률</td><td style="${cell()}">${
    adh === null ? "계획 없음" : `${adh} / 100`
  }</td>
<td style="${head("width:90px")}">할 일 완료</td><td style="${cell()}">${done} / ${
    filled.length
  }</td></tr>
<tr><td style="${head()}">계획 / 실행 시간</td><td style="${cell()}">${fmt(
    p
  )}h / ${fmt(a)}h</td>
<td style="${head()}">한 줄 평가</td><td style="${cell()}">${
    esc(day.rev) || "&nbsp;"
  }</td></tr></table>
<p style="font-size:11pt"><strong>오늘 할 일</strong></p>
<table style="border-collapse:collapse;width:100%">
<tr><td style="${head("width:50px")}">우선순위</td><td style="${head()}">구체적인 학습 내용</td><td style="${head(
    "width:56px"
  )}">목표 달성</td></tr>`;
  day.todos.forEach((t) => {
    h += `<tr><td style="${cell("text-align:center")}">${
      esc(t.p) || "&nbsp;"
    }</td><td style="${cell()}">${esc(t.t) || "&nbsp;"}</td><td style="${cell(
      "text-align:center"
    )}">${t.done ? "V" : "&nbsp;"}</td></tr>`;
  });
  h += "</table>";

  const planBlocks = blocks(data.grid.plan[d]);
  const actBlocks = blocks(data.grid.act[d]);
  if (planBlocks.length || actBlocks.length) {
    h += `<p style="font-size:11pt"><strong>시간 사용</strong></p>
<table style="border-collapse:collapse;width:100%">
<tr><td style="${head("width:50px")}">계획</td><td style="${cell()}">${
      planBlocks.join(" / ") || "&nbsp;"
    }</td></tr>
<tr><td style="${head()}">실행</td><td style="${cell()}">${
      actBlocks.join(" / ") || "&nbsp;"
    }</td></tr></table>`;
  }

  const tomorrow = day.tmr.filter((t) => t.trim());
  h += `<p style="font-size:11pt"><strong>내일 할 일</strong></p>`;
  h += tomorrow.length
    ? `<p style="font-size:10pt">${tomorrow
        .map((t) => `• ${esc(t)}`)
        .join("<br/>")}</p>`
    : `<p style="font-size:10pt">&nbsp;</p>`;
  return h;
}

/** 주간 전체 문서(HTML). PDF·Word·한글이 모두 이 결과를 쓴다. */
export function buildWeekHtml(
  week: string,
  data: WeekData,
  prevWeekData?: WeekData | null
): string {
  const plan = displayTotals(data, "plan");
  const act = displayTotals(data, "act");

  let body = `<p style="font-size:18pt"><strong>KAIROS 주간 계획표</strong></p>
<p style="font-size:10pt">${week} (${dayDate(week, 0)} ~ ${dayDate(
    week,
    5
  )})</p>`;

  DAYS.forEach((_, i) => {
    body += `<div style="page-break-after:always">${dayBlock(
      data,
      week,
      i
    )}</div>`;
  });

  body += `<div style="page-break-after:always">
<p style="font-size:14pt"><strong>24시간을 어떻게 사용할 것인가? (계획·실행)</strong></p>
${legend()}${gridTable(data)}
<p style="font-size:8.5pt">※ 00~06시 6시간은 잠·휴식으로 자동 계산되어 합계에 포함됩니다.</p></div>
<p style="font-size:14pt"><strong>시간 분배</strong></p>`;

  if (prevWeekData) {
    body += `<p style="font-size:11pt"><strong>지난 주 실행</strong></p>${catTable(
      displayTotals(prevWeekData, "act")
    )}`;
  }
  body += `<p style="font-size:11pt"><strong>이번 주 계획</strong></p>${catTable(
    plan
  )}
<p style="font-size:11pt"><strong>이번 주 실행 (작은 숫자 = 계획 대비 차이)</strong></p>${catTable(
    act,
    plan
  )}`;

  return `<html><head><meta charset="utf-8"><title>KAIROS ${week}</title>
<style>body{font-family:"맑은 고딕","Malgun Gothic",sans-serif;font-size:10pt}
@page{size:A4 landscape;margin:12mm}</style></head><body>${body}</body></html>`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Word에서 바로 열리는 문서(.doc). 한글에서도 열린다. */
export function exportWeekToWord(week: string, html: string) {
  download(
    new Blob(["﻿" + html], { type: "application/msword" }),
    `KAIROS_${week}.doc`
  );
}

/** 한글 문서(.hwpx) — 기획안 내보내기와 같은 변환 엔진을 쓴다. */
export async function exportWeekToHwpx(week: string, html: string) {
  const { htmlToHwpx } = await import("hwp-convert");
  const bytes: Uint8Array = await htmlToHwpx(html, {
    title: `KAIROS ${week}`,
    creator: "PlanLedger KAIROS",
  });
  download(
    new Blob([new Uint8Array(bytes)], { type: "application/hwp+zip" }),
    `KAIROS_${week}.hwpx`
  );
}

/** 새 창에서 인쇄 대화상자를 연다. 대상에서 "PDF로 저장"을 고르면 PDF가 된다. */
export function printWeek(html: string): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  let fired = false;
  const go = () => {
    if (fired) return;
    fired = true;
    try {
      w.focus();
      w.print();
    } catch {
      /* 사용자가 창을 먼저 닫은 경우 */
    }
  };
  w.onload = go;
  setTimeout(go, 600);
  return true;
}
