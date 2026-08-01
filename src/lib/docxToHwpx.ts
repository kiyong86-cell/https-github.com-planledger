// Word(.docx) → 한글(.hwpx) 변환.
// 1) mammoth: docx를 HTML로 변환 (표 구조·병합·굵기·제목·이미지 보존)
// 2) hwp-convert: HTML을 한컴 호환 HWPX로 변환
// 전 과정이 브라우저 안에서만 실행되어 파일이 서버로 전송되지 않는다.

const BORDER = "#808080";

// mammoth가 만든 HTML을 hwp-convert에 맞게 보강한다.
// (순수 문자열 처리 — node 테스트에서도 동일하게 사용)
export function prepareHtmlForHwpx(html: string): string {
  let out = html;

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

  // 이미지는 data URI로 인라인 → hwp-convert가 BinData로 패키징
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = prepareHtmlForHwpx(result.value);

  const { htmlToHwpx } = await import("hwp-convert");
  const title = file.name.replace(/\.docx$/i, "");
  const bytes = await htmlToHwpx(html, { title, creator: "PlanLedger" });

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
