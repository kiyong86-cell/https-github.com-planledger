// 오프라인 설치판 빌드: 모든 라이브러리를 한 파일에 넣어 단일 HTML을 만든다.
// 같은 소스로 두 판을 뽑는다 — 정식판(무제한·일괄변환), 체험판(1개씩·2회).
// 실행: node offline/build.mjs
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "dist");
const shell = readFileSync(join(here, "shell.html"), "utf8");

const EDITIONS = [
  { trial: false, file: "한글변환기.html", label: "정식판" },
  { trial: true, file: "한글변환기_체험판.html", label: "체험판" },
];

mkdirSync(outDir, { recursive: true });

for (const edition of EDITIONS) {
  const result = await build({
    entryPoints: [join(here, "entry.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    minify: true,
    write: false,
    legalComments: "none",
    // file:// 로 열어도 동작하도록 외부 요청이 생기는 코드는 남기지 않는다
    define: {
      "process.env.NODE_ENV": '"production"',
      __TRIAL__: String(edition.trial),
    },
  });

  const js = result.outputFiles[0].text;
  // $& 같은 치환 패턴이 번들에 있어도 깨지지 않도록 함수 치환을 쓴다
  const html = shell.replace("/*BUNDLE*/", () => js);
  const path = join(outDir, edition.file);
  writeFileSync(path, html, "utf8");

  const mb = (Buffer.byteLength(html, "utf8") / 1024 / 1024).toFixed(2);
  console.log(`${edition.label}: ${path} (${mb} MB)`);
}
