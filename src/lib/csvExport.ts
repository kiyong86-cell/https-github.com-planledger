import { Receipt } from "./types";

export function exportReceiptsToCsv(receipts: Receipt[], filename: string) {
  const header = ["날짜", "상호", "카테고리", "금액", "메모"];
  const rows = receipts.map((r) => [
    r.receipt_date,
    r.vendor ?? "",
    r.category ?? "",
    String(r.amount),
    (r.memo ?? "").replace(/\n/g, " "),
  ]);

  const escapeCell = (cell: string) =>
    /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;

  const csv = [header, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");

  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 추가
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
