// Word(.docx) → 한글(.hwpx) 변환.
// 1) mammoth: docx를 HTML로 변환 (표 구조·병합·굵기·제목·이미지 보존)
// 2) hwp-convert: HTML을 한컴 호환 HWPX로 변환
// 전 과정이 브라우저 안에서만 실행되어 파일이 서버로 전송되지 않는다.

const BORDER = "#808080";

// docx XML에서 표 셀의 배경색·글자색·정렬을 추출한다.
// mammoth는 색상과 정렬을 모두 버리므로, 원본 XML에서 직접 읽어 나중에 입힌다.
// 반환: [표][행][보이는 셀] 순서 (세로병합 이어짐 셀은 mammoth처럼 건너뜀)
export type CellStyle = {
  fill?: string;
  color?: string;
  align?: string; // 가로 정렬 (left/center/right/justify)
  vAlign?: string; // 세로 정렬 (top/middle/bottom)
};

// Word 정렬값(w:jc) → CSS text-align
const JC_TO_CSS: Record<string, string> = {
  center: "center",
  right: "right",
  end: "right",
  both: "justify",
  distribute: "justify",
  left: "left",
  start: "left",
};

// Word 셀 세로정렬(w:vAlign) → CSS vertical-align
const VALIGN_TO_CSS: Record<string, string> = {
  center: "middle",
  bottom: "bottom",
  top: "top",
};

function scanBlocks(src: string, open: string, close: string): string[] {
  // 중첩을 고려한 최상위 블록 추출 (표 안의 표는 통째로 부모에 포함)
  const blocks: string[] = [];
  let pos = 0;
  while (true) {
    const start = src.indexOf(open, pos);
    if (start === -1) break;
    let depth = 0;
    let i = start;
    while (i < src.length) {
      const nextOpen = src.indexOf(open, i);
      const nextClose = src.indexOf(close, i);
      if (nextClose === -1) return blocks; // 비정상 문서
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        i = nextOpen + open.length;
      } else {
        depth--;
        i = nextClose + close.length;
        if (depth === 0) break;
      }
    }
    blocks.push(src.slice(start, i));
    pos = i;
  }
  return blocks;
}

export function extractTableCellStyles(docXml: string): CellStyle[][][] {
  const tables = scanBlocks(docXml, "<w:tbl>", "</w:tbl>");
  return tables.map((tbl) => {
    const rows = tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
    return rows.map((tr) => {
      const cells = tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];
      const visible: CellStyle[] = [];
      for (const tc of cells) {
        // 세로병합 이어짐 셀(<w:vMerge/>, restart 아님)은 mammoth가 출력하지 않으므로 건너뜀
        if (/<w:vMerge\s*\/>/.test(tc)) continue;
        const style: CellStyle = {};
        const fill = tc.match(/<w:shd[^>]*w:fill="([0-9A-Fa-f]{6})"/);
        if (fill) style.fill = fill[1].toUpperCase();
        const color = tc.match(/<w:color[^>]*w:val="([0-9A-Fa-f]{6})"/);
        if (color) style.color = color[1].toUpperCase();
        const jc = tc.match(/<w:jc w:val="(\w+)"/);
        if (jc) style.align = JC_TO_CSS[jc[1]];
        const va = tc.match(/<w:vAlign w:val="(\w+)"/);
        if (va) style.vAlign = VALIGN_TO_CSS[va[1]];
        visible.push(style);
      }
      return visible;
    });
  });
}

// 추출한 셀 색상·정렬을 mammoth HTML의 같은 위치 셀에 입힌다.
export function applyTableCellStyles(
  html: string,
  styles: CellStyle[][][]
): string {
  let ti = -1;
  return html.replace(/<table[\s\S]*?<\/table>/g, (tbl) => {
    ti++;
    const tStyles = styles[ti];
    if (!tStyles) return tbl;
    let ri = -1;
    return tbl.replace(/<tr[\s\S]*?<\/tr>/g, (tr) => {
      ri++;
      const row = tStyles[ri];
      if (!row) return tr;
      let ci = -1;
      return tr.replace(/<(td|th)((?:\s[^>]*)?)>/g, (m, tag, attrs) => {
        ci++;
        const cs = row[ci];
        if (!cs || (!cs.fill && !cs.color && !cs.align && !cs.vAlign)) return m;
        const style = [
          `border:1px solid ${BORDER}`,
          cs.fill ? `background-color:#${cs.fill}` : "",
          cs.color ? `color:#${cs.color}` : "",
          cs.align ? `text-align:${cs.align}` : "",
          cs.vAlign ? `vertical-align:${cs.vAlign}` : "",
        ]
          .filter(Boolean)
          .join(";");
        return `<${tag} style="${style}"${attrs}>`;
      });
    });
  });
}

// 표 밖 본문 문단 중 가운데·오른쪽 정렬된 것만 글자 내용과 함께 추출한다.
// mammoth는 문단 일부를 합치거나 목록으로 바꾸므로 순서로 짝지으면 어긋난다.
// 그래서 순서 대신 글자 내용으로 찾아 붙인다.
export type BodyAlign = { text: string; align: string };

function plainText(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function extractBodyAligns(docXml: string): BodyAlign[] {
  const body = docXml.slice(docXml.indexOf("<w:body>"));
  // 표 블록을 통째로 지워 표 밖 문단만 남긴다
  let outside = body;
  for (const tbl of scanBlocks(body, "<w:tbl>", "</w:tbl>")) {
    outside = outside.replace(tbl, "");
  }

  const out: BodyAlign[] = [];
  for (const p of outside.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []) {
    const jc = p.match(/<w:jc w:val="(\w+)"/);
    const align = jc ? JC_TO_CSS[jc[1]] : undefined;
    if (!align || align === "left" || align === "justify") continue;
    const text = plainText(
      (p.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || []).join("")
    );
    if (text) out.push({ text, align });
  }
  return out;
}

// 추출한 정렬을 HTML에서 같은 글자를 가진 문단에 입힌다.
export function applyBodyAligns(html: string, aligns: BodyAlign[]): string {
  if (aligns.length === 0) return html;

  // 표 안 문단은 건드리지 않도록 표를 잠시 빼둔다
  const tables: string[] = [];
  const masked = html.replace(/<table[\s\S]*?<\/table>/g, (t) => {
    tables.push(t);
    return ` TBL${tables.length - 1} `;
  });

  const pending = [...aligns];
  const aligned = masked.replace(
    /<(p|h[1-6])((?:\s[^>]*)?)>([\s\S]*?)<\/(?:p|h[1-6])>/g,
    (m, tag, attrs, inner) => {
      if (/style=/.test(attrs)) return m;
      const text = plainText(inner);
      if (!text) return m;
      const i = pending.findIndex((a) => a.text === text);
      if (i === -1) return m;
      const { align } = pending[i];
      pending.splice(i, 1); // 같은 문단을 두 번 쓰지 않는다
      return `<${tag} style="text-align:${align}"${attrs}>${inner}</${tag}>`;
    }
  );

  return aligned.replace(/ TBL(\d+) /g, (_m, i) => tables[Number(i)]);
}

// docx의 표별 열 너비(w:tblGrid/gridCol)를 추출한다.
export function extractTableGrids(docXml: string): number[][] {
  const tables = scanBlocks(docXml, "<w:tbl>", "</w:tbl>");
  return tables.map((tbl) => {
    const grid = tbl.match(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/);
    if (!grid) return [];
    return [...grid[0].matchAll(/<w:gridCol[^>]*w:w="(\d+)"/g)].map((m) =>
      Number(m[1])
    );
  });
}

// 변환된 HWPX의 section XML에서 각 표의 셀 너비를
// 원본 docx의 열 너비 비율대로 재조정한다.
export function applyColumnWidths(
  sectionXml: string,
  grids: number[][]
): string {
  const tables = scanBlocks(sectionXml, "<hp:tbl ", "</hp:tbl>");
  let out = sectionXml;

  tables.forEach((tbl, ti) => {
    const grid = grids[ti];
    if (!grid || grid.length < 2) return; // 열 1개면 조정 불필요

    const colCnt = Number(tbl.match(/colCnt="(\d+)"/)?.[1] ?? 0);
    if (colCnt !== grid.length) return; // 구조 불일치 시 건드리지 않음

    const total = Number(tbl.match(/<hp:sz width="(\d+)"/)?.[1] ?? 0);
    if (!total) return;

    const gridSum = grid.reduce((a, b) => a + b, 0);
    const colW = grid.map((w) => Math.round((w / gridSum) * total));
    colW[colW.length - 1] = total - colW.slice(0, -1).reduce((a, b) => a + b, 0);

    const updated = tbl.replace(
      /(<hp:cellAddr colAddr="(\d+)"[^>]*\/>\s*<hp:cellSpan colSpan="(\d+)"[^>]*\/>\s*<hp:cellSz width=")(\d+)(")/g,
      (_m, pre, colAddr, colSpan, _oldW, post) => {
        const c = Number(colAddr);
        const span = Number(colSpan);
        let w = 0;
        for (let k = c; k < Math.min(c + span, colW.length); k++) w += colW[k];
        return `${pre}${w}${post}`;
      }
    );
    out = out.replace(tbl, updated);
  });

  return out;
}

// mammoth가 만든 HTML을 hwp-convert에 맞게 보강한다.
// (순수 문자열 처리 — node 테스트에서도 동일하게 사용)
export function prepareHtmlForHwpx(
  html: string,
  cellStyles?: CellStyle[][][],
  bodyAligns?: BodyAlign[]
): string {
  let out = html;

  // 1) 원본 docx의 셀 배경색·글자색·정렬을 먼저 입힌다
  if (cellStyles && cellStyles.length > 0) {
    out = applyTableCellStyles(out, cellStyles);
  }

  // 2) 표 밖 문단의 가운데·오른쪽 정렬을 입힌다
  if (bodyAligns && bodyAligns.length > 0) {
    out = applyBodyAligns(out, bodyAligns);
  }

  // 표에 격자선 부여 (hwp-convert는 border CSS가 없으면 무테로 그림)
  out = out
    .replace(/<table(?![^>]*style=)/g, `<table style="border:1px solid ${BORDER}"`)
    .replace(/<td(?![^>]*style=)/g, `<td style="border:1px solid ${BORDER}"`)
    .replace(
      /<th(?![^>]*style=)/g,
      `<th style="border:1px solid ${BORDER};background-color:#EFEFEF"`
    );

  // 셀 안의 문단(<p>)을 줄바꿈으로 풀어준다 — 셀 내용이 비는 것 방지
  out = out.replace(/<(td|th)([^>]*)>([\s\S]*?)<\/\1>/g, (_m, tag, attrs, inner) => {
    const flattened = inner
      .replace(/<p[^>]*>/g, "")
      .replace(/<\/p>\s*(?=<p|$)/g, "<br/>")
      .replace(/<\/p>/g, "<br/>")
      .replace(/(<br\/>)+$/g, "");
    return `<${tag}${attrs}>${flattened}</${tag}>`;
  });

  // 변환 엔진이 표 셀 안의 이미지를 지원하지 않으므로,
  // 셀 안의 이미지를 해당 표 바로 뒤로 꺼내 별도 문단으로 배치한다.
  out = out.replace(/<table[^>]*>[\s\S]*?<\/table>/g, (tbl) => {
    const imgs = tbl.match(/<img[^>]*>/g) || [];
    if (imgs.length === 0) return tbl;
    const stripped = tbl.replace(/<img[^>]*>/g, "");
    return stripped + imgs.map((im) => `<p>${im}</p>`).join("");
  });

  return `<html><body>${out}</body></html>`;
}

export async function convertDocxToHwpx(
  file: File
): Promise<{ blob: Blob; warnings: string[] }> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();

  // 원본 XML에서 표 셀 색상·정렬·열 너비 추출 (mammoth가 버리는 정보)
  const JSZip = (await import("jszip")).default;
  let cellStyles: CellStyle[][][] = [];
  let grids: number[][] = [];
  let bodyAligns: BodyAlign[] = [];
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (docXml) {
      cellStyles = extractTableCellStyles(docXml);
      grids = extractTableGrids(docXml);
      bodyAligns = extractBodyAligns(docXml);
    }
  } catch {
    // 추출 실패해도 변환 자체는 계속 진행
  }

  // 이미지는 data URI로 인라인 → hwp-convert가 BinData로 패키징
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = prepareHtmlForHwpx(result.value, cellStyles, bodyAligns);

  const { htmlToHwpx } = await import("hwp-convert");
  const title = file.name.replace(/\.docx$/i, "");
  let bytes: Uint8Array = await htmlToHwpx(html, {
    title,
    creator: "PlanLedger",
  });

  // 후처리: 원본 열 너비 비율을 HWPX에 반영
  if (grids.some((g) => g.length > 1)) {
    try {
      const outZip = await JSZip.loadAsync(bytes);
      const sectionFile = outZip.file("Contents/section0.xml");
      if (sectionFile) {
        const sectionXml = await sectionFile.async("string");
        outZip.file("Contents/section0.xml", applyColumnWidths(sectionXml, grids));
        // mimetype은 규격상 무압축이어야 함 (원래 상태 유지)
        outZip.file("mimetype", "application/hwp+zip", {
          compression: "STORE",
        });
        bytes = await outZip.generateAsync({
          type: "uint8array",
          compression: "DEFLATE",
        });
      }
    } catch {
      // 폭 조정 실패 시 균등 분할본 그대로 사용
    }
  }

  return {
    blob: new Blob([new Uint8Array(bytes)], { type: "application/hwp+zip" }),
    warnings: result.messages.map((m) => m.message),
  };
}

export function downloadHwpx(blob: Blob, originalName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${originalName.replace(/\.docx$/i, "")}.hwpx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
