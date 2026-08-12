// KAIROS 주간 문서 내보내기 — PDF(인쇄) / Word(.doc) / 한글(.hwpx)
// 세 형식 모두 같은 HTML 한 벌에서 만든다.
import {
  adherence,
  CATS,
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

function catTable(
  tot: ReturnType<typeof displayTotals>,
  cmp?: ReturnType<typeof displayTotals>
): string {
  let h = `<table style="border-collapse:collapse"><tr><th style="${head(
    "width:66px"
  )}"></th>`;
  DAYS.forEach((d) => {
    h += `<th style="${head("width:32px;font-size:8pt")}">${d}</th>`;
  });
  h += `<th style="${head("width:34px;font-size:8pt")}">주계</th></tr>`;

  CATS.forEach((c) => {
    let wk = 0;
    h += `<tr><td style="${cell(
      "white-space:nowrap;font-size:8.5pt"
    )}">${c.ko}</td>`;
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

/** 1장 — 주간 학습 계획: 요일 6줄을 한 표에 담는다. */
function weeklySheet(data: WeekData, week: string): string {
  let h = `<table style="border-collapse:collapse;width:100%">
<tr>
<td style="${head("width:52px")}">요일</td>
<td style="${head("width:210px")}">묵상 본문 · 액션 포인트 · 감사 제목</td>
<td style="${head()}">할 일 (√ = 완료)</td>
<td style="${head("width:96px")}">자가 평가</td>
<td style="${head("width:150px")}">한 줄 평가</td>
</tr>`;

  DAYS.forEach((d, index) => {
    const day = data.days[d];
    const adh = adherence(data, d);
    const filled = day.todos.filter((t) => t.t.trim());
    const done = filled.filter((t) => t.done).length;
    const p = sumDay(gridTotals(data, "plan")[d]);
    const a = sumDay(gridTotals(data, "act")[d]);

    const devotion = [
      day.med.trim() && `묵상: ${esc(day.med)}`,
      day.act.trim() && `액션: ${esc(day.act)}`,
      day.thx.trim() && `감사: ${esc(day.thx)}`,
    ]
      .filter(Boolean)
      .join("<br/>");

    const todoList = filled.length
      ? filled
          .map(
            (t) =>
              `${t.done ? "√" : "·"} ${t.p.trim() ? `[${esc(t.p)}] ` : ""}${esc(
                t.t
              )}`
          )
          .join("<br/>")
      : "&nbsp;";

    h += `<tr>
<td style="${cell("text-align:center;font-size:9pt")}"><strong>${
      DAY_KO[d]
    }</strong><br/><span style="font-size:7.5pt">${dayDate(week, index)
      .split(". ")
      .slice(1)
      .join("/")}</span></td>
<td style="${cell("font-size:9pt")}">${devotion || "&nbsp;"}</td>
<td style="${cell("font-size:9pt")}">${todoList}</td>
<td style="${cell("font-size:8.5pt")}">달성률 ${
      adh === null ? "-" : `${adh}%`
    }<br/>할 일 ${done}/${filled.length}<br/>계획 ${fmt(p)}h · 실행 ${fmt(
      a
    )}h</td>
<td style="${cell("font-size:9pt")}">${esc(day.rev) || "&nbsp;"}</td>
</tr>`;
  });

  return h + "</table>";
}

/** 주간 전체 문서(HTML). PDF·Word·한글이 모두 이 결과를 쓴다. */
export function buildWeekHtml(
  week: string,
  data: WeekData,
  prevWeekData?: WeekData | null
): string {
  const plan = displayTotals(data, "plan");
  const act = displayTotals(data, "act");

  const period = `${week} (${dayDate(week, 0)} ~ ${dayDate(week, 5)})`;
  const title = (text: string) =>
    `<p style="font-size:15pt;margin:0 0 4pt 0"><strong>${text}</strong>
<span style="font-size:9pt;font-weight:normal">&nbsp;&nbsp;${period}</span></p>`;

  // 1장 — 주간 학습 계획
  let body = `<div style="page-break-after:always">
${title("KAIROS 주간 학습 계획")}
${weeklySheet(data, week)}
</div>`;

  // 2장 — 24시간 계획·실행
  body += `<div style="page-break-after:always">
${title("24시간을 어떻게 사용할 것인가? (계획·실행)")}
${legend()}${gridTable(data)}
<p style="font-size:8.5pt">※ 00~06시 6시간은 잠·휴식으로 자동 계산되어 합계에 포함됩니다.</p>
</div>`;

  // 3장 — 시간 분배 (표 세 개를 가로로 나란히)
  const columns: string[] = [];
  if (prevWeekData) {
    columns.push(
      `<p style="font-size:10pt;margin:0 0 3pt 0"><strong>지난 주 실행</strong></p>${catTable(
        displayTotals(prevWeekData, "act")
      )}`
    );
  }
  columns.push(
    `<p style="font-size:10pt;margin:0 0 3pt 0"><strong>이번 주 계획</strong></p>${catTable(
      plan
    )}`
  );
  columns.push(
    `<p style="font-size:10pt;margin:0 0 3pt 0"><strong>이번 주 실행</strong></p>${catTable(
      act,
      plan
    )}`
  );

  body += `<div>
${title("시간 분배")}
<table style="width:100%"><tr>${columns
    .map(
      (c) =>
        `<td style="vertical-align:top;padding-right:10pt;border:0">${c}</td>`
    )
    .join("")}</tr></table>
<p style="font-size:8.5pt">※ 실행 표의 작은 숫자는 계획 대비 차이입니다. 00~06시 잠·휴식 6시간이 합계에 포함되어 있습니다.</p>
</div>`;

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
