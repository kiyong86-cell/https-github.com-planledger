// 임시 진단 스크립트 — 실제 변환기를 node에서 돌려 결과 HWPX 내부를 뜯어본다.
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { convertDocxToHwpx } from "../src/lib/docxToHwpx";

const src = process.argv[2];
const out = process.argv[3];

const buf = readFileSync(src);
const file = new File([buf], basename(src), {
  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});

const { blob, warnings } = await convertDocxToHwpx(file);
const bytes = new Uint8Array(await blob.arrayBuffer());
writeFileSync(out, bytes);

const JSZip = (await import("jszip")).default;
const zip = await JSZip.loadAsync(bytes);
const header = await zip.file("Contents/header.xml")!.async("string");
const section = await zip.file("Contents/section0.xml")!.async("string");

const heights = [...header.matchAll(/<hh:charPr[^>]*height="(\d+)"/g)].map((m) => m[1]);

console.log("결과 크기:", bytes.length, "bytes");
console.log("mammoth 경고:", warnings.length);
warnings.slice(0, 6).forEach((w) => console.log("   ·", w));
console.log("--- HWPX 글자크기(charPr height, 1/100pt) 분포 ---");
console.log("   ", [...new Set(heights)].sort((a, b) => +a - +b).join(", ") || "(없음)");
console.log("    charPr 총개수:", heights.length);
const lineSp = [...header.matchAll(/<hh:lineSpacing[^>]*value="(\d+)"/g)].map((m) => m[1]);
console.log("--- 줄간격(%) 분포 ---");
console.log("   ", [...new Set(lineSp)].sort((a, b) => +a - +b).join(", ") || "(없음)");
const gaps = [...header.matchAll(/<hh:prev value="(\d+)"\/><hh:next value="(\d+)"\/>/g)]
  .map((m) => `${m[1]}/${m[2]}`)
  .filter((g) => g !== "0/0");
console.log("--- 문단 여백(위/아래, HWPUNIT) 0 아닌 것 ---");
console.log("   ", [...new Set(gaps)].join(", ") || "(전부 0 — 여백 안 들어감)");
console.log("    문단 스타일 개수:", (header.match(/<hh:paraPr /g) || []).length);
const breaks = [...section.matchAll(/<hp:p\b[^>]*pageBreak="1"[^>]*>/g)];
console.log("--- 페이지 나눔 켜진 문단 ---", breaks.length, "개");
console.log("--- 표 개수 ---", (section.match(/<hp:tbl /g) || []).length);
console.log("--- 문단 개수 ---", (section.match(/<hp:p /g) || []).length);
console.log("--- 본문 앞부분 ---");
[...section.matchAll(/<hp:t>([^<]{2,})<\/hp:t>/g)]
  .slice(0, 8)
  .forEach((m) => console.log("   ", m[1]));
