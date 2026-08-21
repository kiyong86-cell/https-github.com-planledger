// 오프라인 설치판 진입점.
// 같은 소스로 두 판을 만든다 (offline/build.mjs 참고):
//   정식판 — 결과물에 아무 표시가 없다
//   체험판 — 기능은 전부 같고, 변환된 문서 맨 앞에 체험판 표시 한 줄이 들어간다
// 변환 로직은 웹판과 같은 src/lib/docxToHwpx.ts를 그대로 쓴다(원본 하나 유지).
import { convertDocxToHwpx } from "../src/lib/docxToHwpx";

// ────────────────────────────────────────────────────────────
// 연락처 — 체험판 도입 문의 화면에 그대로 나간다. 여기만 고치면 된다.
// 전화는 선택 사항: "" 로 비워두면 화면에 아예 안 나온다.
const CONTACT = {
  이름: "박기용",
  이메일: "kiyong0263@naver.com",
  전화: "010-9619-0263",
};

// 도입 문의 화면에 보여줄 가격 한 줄. 담당자가 "살 수 있는 금액인가"를 먼저 보고 연락한다.
const PRICE_LINE =
  "1대 99,000원부터 (초기 도입가, 부가세 별도) · 부서·기관 전체 라이선스는 별도 문의";
// ────────────────────────────────────────────────────────────

// 빌드할 때 정해지는 값 (esbuild --define)
declare const __TRIAL__: boolean;
const TRIAL = __TRIAL__;

const BANNER =
  "[체험판] 이 문서는 한글 변환기 체험판으로 변환되었습니다. 정식판에는 이 줄이 없습니다.";

type Done = { name: string; blob: Blob };

const $ = (id: string) => document.getElementById(id)!;
let files: File[] = [];

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function kb(n: number) {
  return n < 1024 * 1024
    ? `${Math.round(n / 1024)} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function setFiles(list: FileList | null) {
  const picked = Array.from(list ?? []).filter((f) => /\.docx$/i.test(f.name));
  if (picked.length === 0) return;
  files = picked;
  $("count").textContent = `${files.length}개 선택됨`;
  $("names").textContent = files.map((f) => f.name).join(", ");
  $("results").innerHTML = "";
  $("summary").textContent = "";
  ($("run") as HTMLButtonElement).disabled = false;
}

async function run() {
  const btn = $("run") as HTMLButtonElement;
  const box = $("results");
  btn.disabled = true;
  box.innerHTML = "";

  const done: Done[] = [];
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    btn.textContent = `변환 중... (${i + 1}/${files.length})`;
    const row = document.createElement("div");
    row.className = "row";
    row.textContent = `⏳ ${f.name}`;
    box.appendChild(row);
    try {
      const { blob } = await convertDocxToHwpx(
        f,
        TRIAL ? { banner: BANNER } : {}
      );
      const name = f.name.replace(/\.docx$/i, "") + ".hwpx";
      done.push({ name, blob });
      row.className = "row ok";
      row.textContent = `✅ ${name}  ·  ${kb(blob.size)}`;
    } catch (e) {
      // 한 파일이 실패해도 나머지는 계속 변환한다
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      row.className = "row fail";
      row.textContent = `❌ ${f.name}  ·  변환 실패 (${msg})`;
    }
  }

  btn.textContent = "변환하기";
  btn.disabled = false;

  if (done.length === 0) {
    $("summary").textContent = "변환된 파일이 없습니다.";
    return;
  }

  $("summary").textContent =
    `${done.length}개 변환 완료` + (failed ? ` · ${failed}개 실패` : "");

  if (done.length === 1) {
    save(done[0].blob, done[0].name);
    return;
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const r of done) zip.file(r.name, r.blob);
  const out = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  save(out, `한글변환_${new Date().toISOString().slice(0, 10)}.zip`);
}

function setupTrialUi() {
  document.title = "한글(HWPX) 변환기 — 체험판";
  const badge = $("trial");
  badge.hidden = false;
  badge.textContent =
    "체험판 · 횟수 제한 없이 쓸 수 있고, 변환된 문서 맨 앞에 체험판 표시 한 줄이 들어갑니다";
  $("paidNote").hidden = false;
  $("buy").hidden = false;

  const subject = "한글 변환기 도입 문의";
  const body = [
    "아래를 채워 보내주시면 견적서를 보내드립니다.",
    "",
    "· 기관명:",
    "· 담당자 성함/직위:",
    "· 연락처:",
    "· 설치 대수(대략):",
    "· 문의 내용:",
  ].join("\n");

  $("buy").innerHTML = `
    <h2>정식판 도입 안내</h2>
    <p class="lead">체험판과 기능은 완전히 같습니다. <b>정식판은 문서에 체험판 표시가 들어가지 않습니다.</b></p>
    <ul>
      <li>표시 없는 결과물 — <b>그대로 제출·보고에 사용 가능</b></li>
      <li>여러 파일을 한 번에 변환하고 zip 하나로 저장</li>
      <li>인터넷 차단망·설치 권한 없는 PC에서 그대로 동작</li>
      <li><b>견적서·세금계산서 발행</b> (기관 구매 절차에 필요한 서류)</li>
    </ul>
    <p class="price">${PRICE_LINE}</p>
    <p class="who">${CONTACT.이름}${
      CONTACT.전화 ? ` · ${CONTACT.전화}` : ""
    }<br />${CONTACT.이메일}</p>
    <a class="cta" href="mailto:${CONTACT.이메일}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}">메일로 도입 문의하기</a>
    <button type="button" id="copyMail" class="ghost">이메일 주소 복사</button>
    <span id="copied" class="copied" hidden>복사됨</span>
  `;

  $("copyMail").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.이메일);
      const tag = $("copied");
      tag.hidden = false;
      setTimeout(() => (tag.hidden = true), 1500);
    } catch {
      // 클립보드를 못 쓰면 주소가 화면에 이미 보이므로 그대로 둔다
    }
  });
}

const drop = $("drop");
drop.addEventListener("click", () => ($("picker") as HTMLInputElement).click());
$("picker").addEventListener("change", (e) =>
  setFiles((e.target as HTMLInputElement).files)
);
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("over");
});
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  setFiles((e as DragEvent).dataTransfer?.files ?? null);
});
$("run").addEventListener("click", run);

if (TRIAL) setupTrialUi();
