export type ParsedReceipt = {
  date?: string; // YYYY-MM-DD
  amount?: number;
  vendor?: string;
};

const AMOUNT_KEYWORDS = [
  "합계",
  "합 계",
  "총액",
  "총 액",
  "총합계",
  "결제금액",
  "결제 금액",
  "받을금액",
  "받은금액",
  "판매금액",
  "총구매액",
  "청구금액",
  "카드결제",
];

const VENDOR_SKIP = /영수증|매출전표|카드|승인|전화|tel|사업자|번호|주소|대표/i;
const NUMBER_SKIP_LINE = /전화|tel|사업자|번호|승인|카드번호|포인트/i;

// 문자열에서 금액 후보(100원 이상 ~ 1억 미만) 중 가장 큰 값
function amountFrom(text: string): number | undefined {
  const nums = [...text.matchAll(/(\d{1,3}(?:,\d{3})+|\d{3,8})/g)].map((m) =>
    Number(m[1].replace(/,/g, ""))
  );
  const candidates = nums.filter((n) => n >= 100 && n < 100000000);
  return candidates.length ? Math.max(...candidates) : undefined;
}

export function parseReceiptText(raw: string): ParsedReceipt {
  const text = raw.replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const result: ParsedReceipt = {};

  // 날짜: 2026-07-23 / 2026.07.23 / 2026년 7월 23일 등
  const dateMatch = text.match(
    /(20\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/
  );
  if (dateMatch) {
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      result.date = `${dateMatch[1]}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
    }
  }

  // 금액: 합계/총액 등 키워드가 있는 줄 우선
  for (const keyword of AMOUNT_KEYWORDS) {
    const line = lines.find((l) => l.includes(keyword));
    if (line) {
      const n = amountFrom(line);
      if (n) {
        result.amount = n;
        break;
      }
    }
  }
  // 키워드가 없으면: 날짜/전화/사업자번호 줄을 뺀 나머지에서 가장 큰 수
  if (!result.amount) {
    const safeLines = lines.filter(
      (l) => !/20\d{2}/.test(l) && !NUMBER_SKIP_LINE.test(l)
    );
    const n = amountFrom(safeLines.join(" "));
    if (n) result.amount = n;
  }

  // 상호: 위쪽 5줄 중 한글 2자 이상 포함된 첫 줄
  const vendorLine = lines
    .slice(0, 5)
    .find(
      (l) =>
        /[가-힣]{2,}/.test(l) &&
        !VENDOR_SKIP.test(l) &&
        !AMOUNT_KEYWORDS.some((k) => l.includes(k))
    );
  if (vendorLine) {
    result.vendor = vendorLine
      .replace(/\(주\)|주식회사|㈜|[\[\]()]/g, "")
      .trim()
      .slice(0, 25);
  }

  return result;
}

export async function recognizeReceipt(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ text: string; parsed: ParsedReceipt }> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["kor", "eng"], undefined, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return { text: data.text, parsed: parseReceiptText(data.text) };
  } finally {
    await worker.terminate();
  }
}
