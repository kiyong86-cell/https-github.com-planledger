// Word(.docx) → 한글(.hwpx) 변환.
// 1) mammoth: docx를 HTML로 변환 (표 구조·병합·굵기·제목·이미지 보존)
// 2) hwp-convert: HTML을 한컴 호환 HWPX로 변환
// 전 과정이 브라우저 안에서만 실행되어 파일이 서버로 전송되지 않는다.

const BORDER = "#808080";
// 빈 줄 채움 문자(폭 없는 공백). 눈에 보이지 않지만 변환 엔진이 글자로 세어 문단을 남긴다.
export const BLANK_LINE = "​";

// docx XML에서 표 셀의 배경색·글자색·정렬을 추출한다.
// mammoth는 색상과 정렬을 모두 버리므로, 원본 XML에서 직접 읽어 나중에 입힌다.
// 반환: [표][행][보이는 셀] 순서 (세로병합 이어짐 셀은 mammoth처럼 건너뜀)
export type CellStyle = {
  fill?: string;
  color?: string;
  align?: string; // 가로 정렬 (left/center/right/justify)
  vAlign?: string; // 세로 정렬 (top/middle/bottom)
  fontPt?: number; // 글자 크기(pt)
};

// 문단·셀 안 런들의 글자 크기(<w:sz>, 1/2 pt 단위) 중 가장 많이 쓰인 값을 pt로 돌려준다.
// mammoth는 런의 직접 서식(크기)을 전부 버리므로 원본 XML에서 직접 읽어야 한다.
// 런 단위까지 살리면 코드가 커지는 데 비해, 레이아웃을 망치는 건 문단별 크기 차이라서
// 문단(셀) 하나의 대표 크기만 잡는다.
function dominantFontPt(xml: string): number | undefined {
  const counts = new Map<number, number>();
  for (const m of xml.matchAll(/<w:sz w:val="(\d+)"/g)) {
    const half = Number(m[1]);
    counts.set(half, (counts.get(half) ?? 0) + 1);
  }
  let best: number | undefined;
  let bestCount = 0;
  for (const [half, n] of counts) {
    if (n > bestCount) {
      best = half;
      bestCount = n;
    }
  }
  return best === undefined ? undefined : best / 2;
}

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
        style.fontPt = dominantFontPt(tc);
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
        if (
          !cs ||
          (!cs.fill && !cs.color && !cs.align && !cs.vAlign && !cs.fontPt)
        )
          return m;
        const style = [
          `border:1px solid ${BORDER}`,
          cs.fill ? `background-color:#${cs.fill}` : "",
          cs.color ? `color:#${cs.color}` : "",
          cs.align ? `text-align:${cs.align}` : "",
          cs.vAlign ? `vertical-align:${cs.vAlign}` : "",
          cs.fontPt ? `font-size:${cs.fontPt}pt` : "",
        ]
          .filter(Boolean)
          .join(";");
        return `<${tag} style="${style}"${attrs}>`;
      });
    });
  });
}

// 표 밖 본문 문단의 정렬(가운데·오른쪽)과 글자 크기를 글자 내용과 함께 추출한다.
// mammoth는 문단 일부를 합치거나 목록으로 바꾸므로 순서로 짝지으면 어긋난다.
// 그래서 순서 대신 글자 내용으로 찾아 붙인다.
export type BodyAlign = {
  text: string;
  align?: string;
  pt?: number;
  lineHeight?: number; // 줄간격 배수 (1.5 = 150%)
  blanksAfter?: number; // 바로 뒤에 붙어 있던 빈 문단 개수
};

// <w:spacing w:line="360" w:lineRule="auto"/> → 360/240 = 1.5줄
// lineRule이 auto가 아니면(exact/atLeast) 절대값이라 배수로 못 바꾸므로 건너뛴다.
function lineHeightOf(paraXml: string): number | undefined {
  const sp = paraXml.match(/<w:spacing[^>]*\/>/);
  if (!sp) return undefined;
  if (!/w:lineRule="auto"/.test(sp[0])) return undefined;
  const line = sp[0].match(/w:line="(\d+)"/);
  if (!line) return undefined;
  const mult = Number(line[1]) / 240;
  return mult > 0 ? Math.round(mult * 100) / 100 : undefined;
}

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

  const paras = outside.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  const textOf = (p: string) =>
    plainText((p.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || []).join(""));

  const out: BodyAlign[] = [];
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    const text = textOf(p);
    if (!text) continue; // 빈 문단 자체는 붙일 자리가 없으므로 앞 문단이 대신 기억한다

    // 바로 뒤에 붙어 있는 빈 문단 개수를 센다.
    // mammoth가 빈 문단을 통째로 버려서 원본의 세로 여백이 사라지고 페이지가 밀린다.
    let blanksAfter = 0;
    while (i + 1 + blanksAfter < paras.length && !textOf(paras[i + 1 + blanksAfter])) {
      blanksAfter++;
    }

    const jc = p.match(/<w:jc w:val="(\w+)"/);
    let align = jc ? JC_TO_CSS[jc[1]] : undefined;
    if (align === "left" || align === "justify") align = undefined;
    const pt = dominantFontPt(p);
    const lineHeight = lineHeightOf(p);
    if (!align && !pt && !lineHeight && !blanksAfter) continue;

    out.push({ text, align, pt, lineHeight, blanksAfter });
  }
  return out;
}

// Word가 페이지를 끊은 지점. 명시적 나눔(<w:pageBreakBefore/>, <w:br w:type="page"/>)과
// Word가 저장할 때 남긴 실제 페이지 경계 표시(lastRenderedPageBreak)를 모두 본다.
// 원본 페이지 배치를 글꼴 계산으로 똑같이 재현하는 건 불가능하므로,
// Word가 이미 계산해 적어둔 위치를 그대로 쓴다.
export function extractPageBreakTexts(docXml: string): string[] {
  const body = docXml.slice(docXml.indexOf("<w:body>"));
  const out: string[] = [];
  for (const p of body.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []) {
    const marked =
      /lastRenderedPageBreak/.test(p) ||
      /<w:pageBreakBefore\s*\/>/.test(p) ||
      /<w:br[^>]*w:type="page"/.test(p);
    if (!marked) continue;
    const text = plainText(
      (p.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || []).join("")
    );
    if (text) out.push(text);
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
      const { align, pt, lineHeight, blanksAfter } = pending[i];
      pending.splice(i, 1); // 같은 문단을 두 번 쓰지 않는다
      const style = [
        align ? `text-align:${align}` : "",
        pt ? `font-size:${pt}pt` : "",
        lineHeight ? `line-height:${lineHeight}` : "",
      ]
        .filter(Boolean)
        .join(";");
      // 원본에 있던 빈 줄을 되살린다.
      // 엔진이 공백만 든 문단을 버려서 &nbsp;·<br>·빈 <p> 모두 사라진다.
      // 폭 없는 공백(U+200B)만 글자로 취급돼 살아남는다.
      const blanks = `<p>${BLANK_LINE}</p>`.repeat(blanksAfter ?? 0);
      const styled = style
        ? `<${tag} style="${style}"${attrs}>${inner}</${tag}>`
        : m;
      return styled + blanks;
    }
  );

  return aligned.replace(/ TBL(\d+) /g, (_m, i) => tables[Number(i)]);
}

// 문단 위/아래 여백. 변환 엔진이 CSS margin을 통째로 버리므로(전부 0으로 나감)
// CSS로는 못 넘기고, 변환이 끝난 HWPX를 열어 직접 써넣는다.
// 단위: HWPUNIT(1pt = 100). docx는 twip(1pt = 20)이라 5배.
export type ParaMargin = { text: string; prev: number; next: number };

export function extractParaMargins(docXml: string): ParaMargin[] {
  const body = docXml.slice(docXml.indexOf("<w:body>"));
  const out: ParaMargin[] = [];
  for (const p of body.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []) {
    const sp = p.match(/<w:spacing[^>]*\/>/);
    if (!sp) continue;
    const before = Number(sp[0].match(/w:before="(\d+)"/)?.[1] ?? 0);
    const after = Number(sp[0].match(/w:after="(\d+)"/)?.[1] ?? 0);
    if (!before && !after) continue;
    const text = plainText(
      (p.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || []).join("")
    );
    if (text) out.push({ text, prev: before * 5, next: after * 5 });
  }
  return out;
}

// HWPX section의 문단을 순서대로 훑는다. 여는 태그의 위치·길이와 그 문단의 글자를 함께 돌려준다.
// 다음 문단이 시작되기 전까지를 그 문단의 글자로 본다.
// (표처럼 문단 안에 문단이 있으면 바깥 문단은 글자가 비게 되고, 그런 문단은 건너뛴다)
type SectionPara = { at: number; len: number; tag: string; text: string };

function sectionParagraphs(sectionXml: string): SectionPara[] {
  const opens = [...sectionXml.matchAll(/<hp:p\b[^>]*>/g)];
  return opens.map((m, i) => {
    const at = m.index!;
    const end = i + 1 < opens.length ? opens[i + 1].index! : sectionXml.length;
    return {
      at,
      len: m[0].length,
      tag: m[0],
      text: plainText(
        [...sectionXml.slice(at, end).matchAll(/<hp:t>([\s\S]*?)<\/hp:t>/g)]
          .map((t) => t[1])
          .join("")
      ),
    };
  });
}

// 위치가 밀리지 않도록 뒤에서부터 갈아끼운다.
function spliceAll(
  xml: string,
  edits: { at: number; len: number; tag: string }[]
): string {
  let out = xml;
  for (const e of [...edits].reverse()) {
    out = out.slice(0, e.at) + e.tag + out.slice(e.at + e.len);
  }
  return out;
}

/** Word가 끊었던 자리의 문단에 페이지 나눔을 켠다. */
export function applyPageBreaks(sectionXml: string, texts: string[]): string {
  if (texts.length === 0) return sectionXml;
  const pending = [...texts];
  const edits: { at: number; len: number; tag: string }[] = [];

  for (const p of sectionParagraphs(sectionXml)) {
    if (!p.text) continue;
    const k = pending.indexOf(p.text);
    if (k === -1) continue;
    pending.splice(k, 1);
    if (!/pageBreak="0"/.test(p.tag)) continue;
    edits.push({ at: p.at, len: p.len, tag: p.tag.replace('pageBreak="0"', 'pageBreak="1"') });
  }
  return spliceAll(sectionXml, edits);
}

// 문단 아래 구분선. 변환 엔진은 <p>의 border-bottom을 버리고 <hr>·<u>도 지원하지 않아
// 결과 파일에 직접 넣는다. 테두리가 하나도 없는 borderFill을 본떠 아래선만 켠 것을 새로 만들고,
// 그 문단의 paraPr을 복제해 <hh:border>를 붙인다.
export type ParaBorder = { text: string; color: string; widthMm?: string };

export function applyParaBorders(
  headerXml: string,
  sectionXml: string,
  borders: ParaBorder[]
): { header: string; section: string } {
  const unchanged = { header: headerXml, section: sectionXml };
  if (borders.length === 0) return unchanged;

  const fillsOpen = headerXml.match(/<hh:borderFills itemCnt="(\d+)">/);
  const paraOpen = headerXml.match(/<hh:paraProperties itemCnt="(\d+)">/);
  if (!fillsOpen || !paraOpen) return unchanged;

  // 본으로 쓸 borderFill: 사방 테두리가 없고 채움색도 없는 것
  let maxFillId = 0;
  let template = "";
  for (const m of headerXml.matchAll(/<hh:borderFill id="(\d+)"[\s\S]*?<\/hh:borderFill>/g)) {
    maxFillId = Math.max(maxFillId, Number(m[1]));
    if (!template && /<hh:bottomBorder type="NONE"/.test(m[0]) && !/fillBrush/.test(m[0])) {
      template = m[0];
    }
  }
  if (!template) return unchanged;

  const paraBlocks = new Map<string, string>();
  let maxParaId = -1;
  for (const m of headerXml.matchAll(/<hh:paraPr id="(\d+)"[\s\S]*?<\/hh:paraPr>/g)) {
    paraBlocks.set(m[1], m[0]);
    maxParaId = Math.max(maxParaId, Number(m[1]));
  }
  if (paraBlocks.size === 0) return unchanged;

  const newFills: string[] = [];
  const fillIds = new Map<string, string>();
  const newParas: string[] = [];
  const paraIds = new Map<string, string>();
  const edits: { at: number; len: number; tag: string }[] = [];
  const pending = [...borders];

  for (const p of sectionParagraphs(sectionXml)) {
    if (!p.text) continue;
    const k = pending.findIndex((b) => b.text === p.text);
    if (k === -1) continue;

    const srcId = p.tag.match(/paraPrIDRef="(\d+)"/)?.[1];
    const src = srcId ? paraBlocks.get(srcId) : undefined;
    if (!srcId || !src) continue;

    const { color, widthMm = "0.25 mm" } = pending[k];
    pending.splice(k, 1); // 같은 문단을 두 번 쓰지 않는다

    const fillKey = `${color}|${widthMm}`;
    let fillId = fillIds.get(fillKey);
    if (!fillId) {
      fillId = String(++maxFillId);
      newFills.push(
        template
          .replace(/^<hh:borderFill id="\d+"/, `<hh:borderFill id="${fillId}"`)
          .replace(
            /<hh:bottomBorder type="NONE" width="[^"]*" color="[^"]*"\/>/,
            `<hh:bottomBorder type="SOLID" width="${widthMm}" color="${color}"/>`
          )
      );
      fillIds.set(fillKey, fillId);
    }

    const paraKey = `${srcId}|${fillId}`;
    let newId = paraIds.get(paraKey);
    if (!newId) {
      newId = String(++maxParaId);
      newParas.push(
        src
          .replace(/^<hh:paraPr id="\d+"/, `<hh:paraPr id="${newId}"`)
          .replace(
            /<\/hh:paraPr>$/,
            `<hh:border borderFillIDRef="${fillId}" offsetLeft="0" offsetRight="0"` +
              ` offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/></hh:paraPr>`
          )
      );
      paraIds.set(paraKey, newId);
    }

    edits.push({
      at: p.at,
      len: p.len,
      tag: p.tag.replace(/paraPrIDRef="\d+"/, `paraPrIDRef="${newId}"`),
    });
  }

  if (newParas.length === 0) return unchanged;

  const header = headerXml
    .replace(
      fillsOpen[0],
      `<hh:borderFills itemCnt="${Number(fillsOpen[1]) + newFills.length}">`
    )
    .replace("</hh:borderFills>", newFills.join("") + "</hh:borderFills>")
    .replace(
      paraOpen[0],
      `<hh:paraProperties itemCnt="${Number(paraOpen[1]) + newParas.length}">`
    )
    .replace("</hh:paraProperties>", newParas.join("") + "</hh:paraProperties>");

  return { header, section: spliceAll(sectionXml, edits) };
}

/**
 * 문단 여백을 HWPX에 입힌다.
 * 엔진은 같은 서식의 문단들을 paraPr 하나로 합쳐 쓰기 때문에, 그 paraPr을 그냥 고치면
 * 관계없는 문단까지 같이 밀린다. 그래서 필요한 조합만 paraPr을 복제해 새 id를 주고
 * 해당 문단만 그 id를 가리키게 바꾼다.
 */
export function applyParaMargins(
  headerXml: string,
  sectionXml: string,
  margins: ParaMargin[]
): { header: string; section: string } {
  const unchanged = { header: headerXml, section: sectionXml };
  if (margins.length === 0) return unchanged;

  const container = headerXml.match(/<hh:paraProperties itemCnt="(\d+)">/);
  if (!container) return unchanged;

  const blocks = new Map<string, string>();
  let maxId = -1;
  for (const m of headerXml.matchAll(/<hh:paraPr id="(\d+)"[\s\S]*?<\/hh:paraPr>/g)) {
    blocks.set(m[1], m[0]);
    maxId = Math.max(maxId, Number(m[1]));
  }
  if (blocks.size === 0) return unchanged;

  const pending = [...margins];
  const clones: string[] = [];
  const cloneIds = new Map<string, string>(); // 원본id|위|아래 → 새 id
  const edits: { at: number; len: number; tag: string }[] = [];

  for (const p of sectionParagraphs(sectionXml)) {
    const text = p.text;
    if (!text) continue;

    const srcId = p.tag.match(/paraPrIDRef="(\d+)"/)?.[1];
    if (!srcId) continue;

    const k = pending.findIndex((x) => x.text === text);
    if (k === -1) continue;
    const { prev, next } = pending[k];
    pending.splice(k, 1); // 같은 문단을 두 번 쓰지 않는다

    const key = `${srcId}|${prev}|${next}`;
    let newId = cloneIds.get(key);
    if (!newId) {
      const src = blocks.get(srcId);
      if (!src) continue;
      newId = String(++maxId);
      clones.push(
        src
          .replace(/^<hh:paraPr id="\d+"/, `<hh:paraPr id="${newId}"`)
          .replace(/<hh:prev value="\d+"\/>/, `<hh:prev value="${prev}"/>`)
          .replace(/<hh:next value="\d+"\/>/, `<hh:next value="${next}"/>`)
      );
      cloneIds.set(key, newId);
    }
    edits.push({
      at: p.at,
      len: p.len,
      tag: p.tag.replace(/paraPrIDRef="\d+"/, `paraPrIDRef="${newId}"`),
    });
  }

  if (clones.length === 0) return unchanged;

  const section = spliceAll(sectionXml, edits);

  const header = headerXml
    .replace(
      container[0],
      `<hh:paraProperties itemCnt="${Number(container[1]) + clones.length}">`
    )
    .replace("</hh:paraProperties>", clones.join("") + "</hh:paraProperties>");

  return { header, section };
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
function resizeTable(tbl: string, grid: number[]): string | null {
  if (!grid || grid.length < 2) return null; // 열 1개면 조정 불필요

  const colCnt = Number(tbl.match(/colCnt="(\d+)"/)?.[1] ?? 0);
  if (colCnt !== grid.length) return null; // 구조 불일치 시 건드리지 않음

  const total = Number(tbl.match(/<hp:sz width="(\d+)"/)?.[1] ?? 0);
  if (!total) return null;

  const gridSum = grid.reduce((a, b) => a + b, 0);
  const colW = grid.map((w) => Math.round((w / gridSum) * total));
  colW[colW.length - 1] = total - colW.slice(0, -1).reduce((a, b) => a + b, 0);

  return tbl.replace(
    /(<hp:cellAddr colAddr="(\d+)"[^>]*\/>\s*<hp:cellSpan colSpan="(\d+)"[^>]*\/>\s*<hp:cellSz width=")(\d+)(")/g,
    (_m, pre, colAddr, colSpan, _oldW, post) => {
      const c = Number(colAddr);
      const span = Number(colSpan);
      let w = 0;
      for (let k = c; k < Math.min(c + span, colW.length); k++) w += colW[k];
      return `${pre}${w}${post}`;
    }
  );
}

export function applyColumnWidths(
  sectionXml: string,
  grids: number[][]
): string {
  const tables = scanBlocks(sectionXml, "<hp:tbl ", "</hp:tbl>");
  let out = sectionXml;

  tables.forEach((tbl, ti) => {
    const updated = resizeTable(tbl, grids[ti]);
    if (updated) out = out.replace(tbl, updated);
  });

  return out;
}

/** 문서 순서 대신 "열 개수"로 표를 찾아 너비를 지정한다. */
export function applyColumnWidthsByColCount(
  sectionXml: string,
  map: Record<number, number[]>
): string {
  const tables = scanBlocks(sectionXml, "<hp:tbl ", "</hp:tbl>");
  let out = sectionXml;

  tables.forEach((tbl) => {
    const colCnt = Number(tbl.match(/colCnt="(\d+)"/)?.[1] ?? 0);
    const updated = resizeTable(tbl, map[colCnt]);
    if (updated) out = out.replace(tbl, updated);
  });

  return out;
}

// 변환 엔진은 정렬을 지정하지 않은 문단을 모두 "양쪽 정렬(JUSTIFY)"로 만든다.
// Word의 기본값은 왼쪽 정렬이라 글자 간격이 벌어져 원본과 달라 보인다.
// 그래서 기본 문단 모양(paraPr id="0")만 왼쪽 정렬로 바꾼다.
export function setDefaultAlignLeft(headerXml: string): string {
  return headerXml.replace(
    /(<hh:paraPr id="0"[\s\S]*?<hh:align horizontal=")JUSTIFY(")/,
    "$1LEFT$2"
  );
}

// 용지를 가로로 눕힌다 (열이 많은 표가 잘리지 않도록).
export function setPageLandscape(sectionXml: string): string {
  return sectionXml.replace(
    /<hp:pagePr([^>]*?)width="(\d+)"([^>]*?)height="(\d+)"/,
    (m, a, w, b, h) =>
      Number(w) < Number(h)
        ? `<hp:pagePr${a}width="${h}"${b}height="${w}"`
        : m
  );
}

/** 변환 결과 HWPX를 열어 보정한 뒤 다시 묶는다. */
export async function postProcessHwpx(
  bytes: Uint8Array,
  options: {
    grids?: number[][];
    gridByCols?: Record<number, number[]>;
    landscape?: boolean;
    paraMargins?: ParaMargin[];
    pageBreakTexts?: string[];
    paraBorders?: ParaBorder[];
  } = {}
): Promise<Uint8Array> {
  const {
    grids,
    gridByCols,
    landscape,
    paraMargins,
    pageBreakTexts,
    paraBorders,
  } = options;
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(bytes);

    const headerFile = zip.file("Contents/header.xml");
    const sectionFile = zip.file("Contents/section0.xml");
    let header = headerFile ? await headerFile.async("string") : null;
    let section = sectionFile ? await sectionFile.async("string") : null;

    if (header) header = setDefaultAlignLeft(header);

    if (section) {
      if (grids && grids.some((g) => g.length > 1)) {
        section = applyColumnWidths(section, grids);
      }
      if (gridByCols) section = applyColumnWidthsByColCount(section, gridByCols);
      if (landscape) section = setPageLandscape(section);
      if (pageBreakTexts) section = applyPageBreaks(section, pageBreakTexts);
    }

    // 아래 둘은 header(스타일)와 section(참조)을 함께 고쳐야 해서 마지막에 처리한다.
    // 구분선이 여백보다 뒤에 와야 여백이 들어간 스타일을 그대로 물려받는다.
    if (header && section && paraMargins && paraMargins.length > 0) {
      const applied = applyParaMargins(header, section, paraMargins);
      header = applied.header;
      section = applied.section;
    }
    if (header && section && paraBorders && paraBorders.length > 0) {
      const applied = applyParaBorders(header, section, paraBorders);
      header = applied.header;
      section = applied.section;
    }

    if (header) zip.file("Contents/header.xml", header);
    if (section) zip.file("Contents/section0.xml", section);

    // mimetype은 규격상 무압축이어야 한다
    zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });
    return await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  } catch {
    // 보정에 실패하면 변환 원본을 그대로 쓴다
    return bytes;
  }
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

// 체험판 표시줄. 문서 맨 앞에 눈에 띄게 한 줄 넣는다.
// 변환 엔진을 그대로 태우므로 후처리가 필요 없다.
export function bannerHtml(text: string): string {
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p style="color:#B91C1C;font-size:10pt;line-height:1.3"><strong>${safe}</strong></p>`;
}

export async function convertDocxToHwpx(
  file: File,
  options: { banner?: string } = {}
): Promise<{ blob: Blob; warnings: string[] }> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();

  // 원본 XML에서 표 셀 색상·정렬·열 너비 추출 (mammoth가 버리는 정보)
  const JSZip = (await import("jszip")).default;
  let cellStyles: CellStyle[][][] = [];
  let grids: number[][] = [];
  let bodyAligns: BodyAlign[] = [];
  let paraMargins: ParaMargin[] = [];
  let pageBreakTexts: string[] = [];
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (docXml) {
      cellStyles = extractTableCellStyles(docXml);
      grids = extractTableGrids(docXml);
      bodyAligns = extractBodyAligns(docXml);
      paraMargins = extractParaMargins(docXml);
      pageBreakTexts = extractPageBreakTexts(docXml);
    }
  } catch {
    // 추출 실패해도 변환 자체는 계속 진행
  }

  // 이미지는 data URI로 인라인 → hwp-convert가 BinData로 패키징
  const result = await mammoth.convertToHtml({ arrayBuffer });
  let html = prepareHtmlForHwpx(result.value, cellStyles, bodyAligns);
  if (options.banner) {
    html = html.replace("<body>", `<body>${bannerHtml(options.banner)}`);
  }

  const { htmlToHwpx } = await import("hwp-convert");
  const title = file.name.replace(/\.docx$/i, "");
  const raw: Uint8Array = await htmlToHwpx(html, {
    title,
    creator: "PlanLedger",
  });

  // 후처리: 원본 열 너비 비율 반영 + 기본 문단 왼쪽 정렬 + 문단 여백 + 페이지 나눔
  const bytes = await postProcessHwpx(raw, {
    grids,
    paraMargins,
    pageBreakTexts,
  });

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
