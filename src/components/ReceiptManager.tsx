"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RECEIPT_CATEGORIES, Receipt } from "@/lib/types";
import { exportReceiptsToCsv } from "@/lib/csvExport";
import { trackEvent } from "@/lib/track";
import { recognizeReceipt } from "@/lib/receiptOcr";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type OcrStatus =
  | { stage: "loading" }
  | { stage: "recognizing"; progress: number }
  | { stage: "done"; found: string[] }
  | { stage: "failed" };

export default function ReceiptManager() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 입력 폼 상태
  const [date, setDate] = useState(todayStr());
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(RECEIPT_CATEGORIES[0]);
  const [memo, setMemo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);

    if (!selected || !selected.type.startsWith("image/")) {
      setOcrStatus(null);
      return;
    }

    setOcrStatus({ stage: "loading" });
    try {
      const { parsed } = await recognizeReceipt(selected, (progress) =>
        setOcrStatus({ stage: "recognizing", progress })
      );

      const found: string[] = [];
      if (parsed.date) {
        setDate(parsed.date);
        found.push("날짜");
      }
      if (parsed.amount) {
        setAmount(String(parsed.amount));
        found.push("금액");
      }
      if (parsed.vendor) {
        setVendor(parsed.vendor);
        found.push("상호");
      }

      setOcrStatus(found.length > 0 ? { stage: "done", found } : { stage: "failed" });
    } catch {
      setOcrStatus({ stage: "failed" });
    }
  }

  // 필터 상태
  const [monthFilter, setMonthFilter] = useState(""); // "YYYY-MM"
  const [categoryFilter, setCategoryFilter] = useState("전체");

  async function loadReceipts() {
    setLoading(true);
    try {
      const res = await fetch("/api/receipts");
      if (!res.ok) throw new Error("목록을 불러오지 못했습니다.");
      setReceipts(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadReceipts();
  }, []);

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      if (monthFilter && !r.receipt_date.startsWith(monthFilter)) return false;
      if (categoryFilter !== "전체" && r.category !== categoryFilter)
        return false;
      return true;
    });
  }, [receipts, monthFilter, categoryFilter]);

  const total = filtered.reduce((sum, r) => sum + Number(r.amount), 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const form = new FormData();
    form.set("receipt_date", date);
    form.set("vendor", vendor);
    form.set("amount", amount);
    form.set("category", category);
    form.set("memo", memo);
    if (file) form.set("file", file);

    try {
      const res = await fetch("/api/receipts", { method: "POST", body: form });
      if (!res.ok) throw new Error("저장에 실패했습니다.");
      trackEvent("receipt_created");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      setSaving(false);
      return;
    }

    setVendor("");
    setAmount("");
    setMemo("");
    setFile(null);
    setOcrStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSaving(false);
    await loadReceipts();
  }

  async function handleDelete(receipt: Receipt) {
    if (!confirm("이 영수증을 삭제할까요?")) return;

    const res = await fetch(`/api/receipts/${receipt.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("삭제에 실패했습니다.");
      return;
    }
    setReceipts((prev) => prev.filter((r) => r.id !== receipt.id));
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="grid grid-cols-1 gap-4 rounded-lg border bg-white p-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">날짜</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">상호</label>
          <input
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="예) OO문구점"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">금액</label>
          <input
            type="number"
            min="0"
            step="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">카테고리</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {RECEIPT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">메모</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="선택 입력"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            영수증 사진 첨부 (선택) — 사진을 올리면 날짜·금액·상호를 자동으로 읽어드려요
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="w-full text-sm"
          />
          {ocrStatus?.stage === "loading" && (
            <p className="mt-1 text-xs text-slate-500">
              문자 인식 준비 중... (처음 한 번은 인식 데이터를 내려받아 시간이 걸릴 수 있어요)
            </p>
          )}
          {ocrStatus?.stage === "recognizing" && (
            <p className="mt-1 text-xs text-slate-500">
              영수증 읽는 중... {ocrStatus.progress}%
            </p>
          )}
          {ocrStatus?.stage === "done" && (
            <p className="mt-1 text-xs text-green-600">
              자동 인식 완료! ({ocrStatus.found.join(", ")}) — 내용을 확인하고 필요하면 고친 뒤
              저장하세요.
            </p>
          )}
          {ocrStatus?.stage === "failed" && (
            <p className="mt-1 text-xs text-amber-600">
              글자를 읽지 못했어요. 사진은 그대로 첨부되니 내용은 직접 입력해주세요.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>
        )}

        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "영수증 추가"}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-slate-500">월별 필터</label>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">카테고리 필터</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="전체">전체</option>
            {RECEIPT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {(monthFilter || categoryFilter !== "전체") && (
          <button
            onClick={() => {
              setMonthFilter("");
              setCategoryFilter("전체");
            }}
            className="text-sm text-slate-500 hover:underline"
          >
            필터 초기화
          </button>
        )}

        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-slate-600">
            합계:{" "}
            <strong className="text-slate-900">
              {total.toLocaleString("ko-KR")}원
            </strong>{" "}
            ({filtered.length}건)
          </span>
          <button
            onClick={() =>
              exportReceiptsToCsv(
                filtered,
                `영수증${monthFilter ? "-" + monthFilter : ""}.csv`
              )
            }
            className="rounded-md border px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            CSV 내보내기
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        {loading ? (
          <p className="p-6 text-sm text-slate-400">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">
            조건에 맞는 영수증이 없습니다.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">날짜</th>
                <th className="px-4 py-2">상호</th>
                <th className="px-4 py-2">카테고리</th>
                <th className="px-4 py-2 text-right">금액</th>
                <th className="px-4 py-2">메모</th>
                <th className="px-4 py-2">첨부</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{r.receipt_date}</td>
                  <td className="px-4 py-2">{r.vendor || "-"}</td>
                  <td className="px-4 py-2">{r.category || "-"}</td>
                  <td className="px-4 py-2 text-right">
                    {Number(r.amount).toLocaleString("ko-KR")}원
                  </td>
                  <td className="px-4 py-2 text-slate-500">{r.memo || "-"}</td>
                  <td className="px-4 py-2">
                    {r.image_path ? (
                      <a
                        href={`/api/receipts/${r.id}/image`}
                        target="_blank"
                        className="text-slate-700 underline hover:text-slate-900"
                      >
                        보기
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(r)}
                      className="text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
