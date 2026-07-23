"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SECTION_HINTS, emptyContent } from "@/lib/businessPlanTemplate";
import { exportBusinessPlanToDocx } from "@/lib/docxExport";
import { exportBusinessPlanToHwpx } from "@/lib/hwpExport";
import { trackEvent } from "@/lib/track";
import {
  BudgetItem,
  BusinessPlanContent,
  PlanType,
  Timetable,
  TimetableCell,
} from "@/lib/types";

function defaultTime(): string {
  return "09:00-09:30";
}

function freshCell(): TimetableCell {
  return { text: "", rowSpan: 1, colSpan: 1, hidden: false };
}

// (r, c)를 앵커로 하는 병합을 풀어 덮인 셀을 모두 되살린다
function unmergeAt(t: Timetable, r: number, c: number): Timetable {
  const anchor = t.rows[r]?.cells[c];
  if (!anchor) return t;
  const rows = t.rows.map((row, ri) => ({
    ...row,
    cells: row.cells.map((cell, ci) => {
      const covered =
        ri >= r &&
        ri < r + anchor.rowSpan &&
        ci >= c &&
        ci < c + anchor.colSpan;
      if (!covered) return cell;
      return ri === r && ci === c
        ? { ...cell, rowSpan: 1, colSpan: 1, hidden: false }
        : freshCell();
    }),
  }));
  return { ...t, rows };
}

// 특정 열/행을 지나는 병합을 모두 해제 (열·행 삭제 전 정리용)
function unmergeCrossing(
  t: Timetable,
  target: { column?: number; row?: number }
): Timetable {
  let result = t;
  for (let r = 0; r < t.rows.length; r++) {
    for (let c = 0; c < (t.rows[r]?.cells.length ?? 0); c++) {
      const cell = result.rows[r].cells[c];
      if (cell.hidden || (cell.rowSpan === 1 && cell.colSpan === 1)) continue;
      const crossesColumn =
        target.column !== undefined &&
        c <= target.column &&
        target.column < c + cell.colSpan;
      const crossesRow =
        target.row !== undefined &&
        r <= target.row &&
        target.row < r + cell.rowSpan;
      if (crossesColumn || crossesRow) {
        result = unmergeAt(result, r, c);
      }
    }
  }
  return result;
}

const PLAN_TYPE_INFO: Record<
  PlanType,
  { label: string; description: string }
> = {
  internal: {
    label: "내부 기획안",
    description: "개요·목적·프로그램·일정 중심의 간단한 구성",
  },
  external: {
    label: "외부 기획안",
    description: "시장 분석·수익 구조·재무 계획·팀 소개까지 포함한 제출용 구성",
  },
};

export default function BusinessPlanForm({
  planId,
  initialTitle,
  initialContent,
}: {
  planId?: string;
  initialTitle: string;
  initialContent: BusinessPlanContent;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState<BusinessPlanContent>(initialContent);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exportingHwp, setExportingHwp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ---------- 기획안 종류 ----------

  function switchPlanType(planType: PlanType) {
    if (planType === content.planType) return;

    const hasText = content.sections.some((s) => s.body.trim() !== "");
    if (planId || hasText) {
      // 이미 작성 중이면 섹션은 그대로 두고 종류 표시만 변경
      const keepSections = confirm(
        `${PLAN_TYPE_INFO[planType].label}(으)로 바꿉니다.\n\n[확인] 지금 작성한 주제·내용은 그대로 유지\n[취소] 바꾸지 않기`
      );
      if (!keepSections) return;
      setContent((prev) => ({ ...prev, planType }));
    } else {
      // 아직 아무것도 안 썼으면 해당 종류의 기본 주제로 교체
      setContent((prev) => ({
        ...emptyContent(planType),
        budget: prev.budget,
      }));
    }
  }

  // ---------- 주제(섹션) ----------

  function updateSection(index: number, key: "title" | "body", value: string) {
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === index ? { ...s, [key]: value } : s
      ),
    }));
  }

  function addSection() {
    setContent((prev) => ({
      ...prev,
      sections: [...prev.sections, { title: "", body: "" }],
    }));
  }

  function removeSection(index: number) {
    const target = content.sections[index];
    if (
      (target.title.trim() || target.body.trim()) &&
      !confirm(`"${target.title || "제목 없는 주제"}"를 삭제할까요?`)
    ) {
      return;
    }
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= content.sections.length) return;
    setContent((prev) => {
      const sections = [...prev.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...prev, sections };
    });
  }

  // ---------- 예산안 ----------

  function updateTotalBudget(value: string) {
    setContent((prev) => ({
      ...prev,
      budget: { ...prev.budget, total: Number(value) || 0 },
    }));
  }

  function addBudgetItem() {
    setContent((prev) => ({
      ...prev,
      budget: {
        ...prev.budget,
        items: [
          ...prev.budget.items,
          { name: "", detail: "", amount: 0, note: "" },
        ],
      },
    }));
  }

  function updateBudgetItem(
    index: number,
    key: keyof BudgetItem,
    value: string
  ) {
    setContent((prev) => {
      const items = prev.budget.items.map((item, i) =>
        i === index
          ? { ...item, [key]: key === "amount" ? Number(value) || 0 : value }
          : item
      );
      return { ...prev, budget: { ...prev.budget, items } };
    });
  }

  function removeBudgetItem(index: number) {
    setContent((prev) => ({
      ...prev,
      budget: {
        ...prev.budget,
        items: prev.budget.items.filter((_, i) => i !== index),
      },
    }));
  }

  const allocated = content.budget.items.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );
  const remaining = Number(content.budget.total) - allocated;

  // ---------- 일정표(타임테이블) ----------

  function addDay() {
    setContent((prev) => ({
      ...prev,
      timetable: {
        days: [...prev.timetable.days, ""],
        rows: prev.timetable.rows.map((r) => ({
          ...r,
          cells: [...r.cells, freshCell()],
        })),
      },
    }));
  }

  function updateDay(dayIndex: number, value: string) {
    setContent((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        days: prev.timetable.days.map((d, i) => (i === dayIndex ? value : d)),
      },
    }));
  }

  function removeDay(dayIndex: number) {
    setContent((prev) => {
      const cleaned = unmergeCrossing(prev.timetable, { column: dayIndex });
      return {
        ...prev,
        timetable: {
          days: cleaned.days.filter((_, i) => i !== dayIndex),
          rows: cleaned.rows.map((r) => ({
            ...r,
            cells: r.cells.filter((_, i) => i !== dayIndex),
          })),
        },
      };
    });
  }

  function addTimeRow() {
    setContent((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        rows: [
          ...prev.timetable.rows,
          {
            time: defaultTime(),
            cells: prev.timetable.days.map(() => freshCell()),
          },
        ],
      },
    }));
  }

  function updateRowTime(rowIndex: number, value: string) {
    setContent((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        rows: prev.timetable.rows.map((r, i) =>
          i === rowIndex ? { ...r, time: value } : r
        ),
      },
    }));
  }

  function updateCell(rowIndex: number, cellIndex: number, value: string) {
    setContent((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        rows: prev.timetable.rows.map((r, i) =>
          i === rowIndex
            ? {
                ...r,
                cells: r.cells.map((c, j) =>
                  j === cellIndex ? { ...c, text: value } : c
                ),
              }
            : r
        ),
      },
    }));
  }

  function removeTimeRow(rowIndex: number) {
    setContent((prev) => {
      const cleaned = unmergeCrossing(prev.timetable, { row: rowIndex });
      return {
        ...prev,
        timetable: {
          ...cleaned,
          rows: cleaned.rows.filter((_, i) => i !== rowIndex),
        },
      };
    });
  }

  function canMergeRight(r: number, c: number): boolean {
    const t = content.timetable;
    const cell = t.rows[r]?.cells[c];
    if (!cell || cell.hidden) return false;
    const target = t.rows[r]?.cells[c + cell.colSpan];
    return !!target && !target.hidden && target.rowSpan === cell.rowSpan;
  }

  function canMergeDown(r: number, c: number): boolean {
    const t = content.timetable;
    const cell = t.rows[r]?.cells[c];
    if (!cell || cell.hidden) return false;
    const target = t.rows[r + cell.rowSpan]?.cells[c];
    return !!target && !target.hidden && target.colSpan === cell.colSpan;
  }

  function mergeRight(r: number, c: number) {
    if (!canMergeRight(r, c)) return;
    setContent((prev) => {
      const t = prev.timetable;
      const cell = t.rows[r].cells[c];
      const targetCol = c + cell.colSpan;
      const target = t.rows[r].cells[targetCol];
      const mergedText = [cell.text, target.text]
        .filter((s) => s.trim())
        .join("\n");
      const rows = t.rows.map((row, ri) => ({
        ...row,
        cells: row.cells.map((cc, ci) => {
          if (ri === r && ci === c) {
            return { ...cc, text: mergedText, colSpan: cc.colSpan + target.colSpan };
          }
          if (ri === r && ci === targetCol) {
            return { ...freshCell(), hidden: true };
          }
          return cc;
        }),
      }));
      return { ...prev, timetable: { ...t, rows } };
    });
  }

  function mergeDown(r: number, c: number) {
    if (!canMergeDown(r, c)) return;
    setContent((prev) => {
      const t = prev.timetable;
      const cell = t.rows[r].cells[c];
      const targetRow = r + cell.rowSpan;
      const target = t.rows[targetRow].cells[c];
      const mergedText = [cell.text, target.text]
        .filter((s) => s.trim())
        .join("\n");
      const rows = t.rows.map((row, ri) => ({
        ...row,
        cells: row.cells.map((cc, ci) => {
          if (ri === r && ci === c) {
            return { ...cc, text: mergedText, rowSpan: cc.rowSpan + target.rowSpan };
          }
          if (ri === targetRow && ci === c) {
            return { ...freshCell(), hidden: true };
          }
          return cc;
        }),
      }));
      return { ...prev, timetable: { ...t, rows } };
    });
  }

  function unmergeCell(r: number, c: number) {
    setContent((prev) => ({
      ...prev,
      timetable: unmergeAt(prev.timetable, r, c),
    }));
  }

  // ---------- 사진 첨부 ----------

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        if (!res.ok) throw new Error("사진 업로드에 실패했습니다.");
        const { file: stored } = await res.json();
        setContent((prev) => ({
          ...prev,
          images: [...prev.images, { file: stored, caption: "" }],
        }));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "사진 업로드에 실패했습니다."
      );
    }
    setUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function updateImageCaption(index: number, caption: string) {
    setContent((prev) => ({
      ...prev,
      images: prev.images.map((img, i) =>
        i === index ? { ...img, caption } : img
      ),
    }));
  }

  function removeImage(index: number) {
    if (!confirm("이 사진을 목록에서 뺄까요?")) return;
    setContent((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }

  // ---------- 저장/삭제 ----------

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      if (planId) {
        const res = await fetch(`/api/plans/${planId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        if (!res.ok) throw new Error("저장에 실패했습니다.");
        setSavedAt(new Date());
      } else {
        const res = await fetch("/api/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        if (!res.ok) throw new Error("저장에 실패했습니다.");
        const plan = await res.json();
        trackEvent("plan_created");
        router.push(`/business-plan/${plan.id}`);
        router.refresh();
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!planId) return;
    if (!confirm("이 기획안을 삭제할까요? 되돌릴 수 없습니다.")) return;

    const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("삭제에 실패했습니다.");
      return;
    }
    router.push("/business-plan");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="no-print grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(Object.keys(PLAN_TYPE_INFO) as PlanType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => switchPlanType(type)}
            className={`rounded-lg border p-4 text-left ${
              content.planType === type
                ? "border-slate-900 bg-white ring-1 ring-slate-900"
                : "border-slate-200 bg-white hover:border-slate-400"
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">
              {PLAN_TYPE_INFO[type].label}
              {content.planType === type && (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  ✓ 선택됨
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {PLAN_TYPE_INFO[type].description}
            </p>
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          기획안 제목
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-base font-medium focus:border-slate-500 focus:outline-none"
          placeholder="예) 2학기 OO 프로그램 기획안"
        />
      </div>

      {content.sections.map((section, i) => (
        <div key={i} className="rounded-lg border bg-white p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-400">
              {i + 1}.
            </span>
            <input
              value={section.title}
              onChange={(e) => updateSection(i, "title", e.target.value)}
              placeholder="주제를 입력하세요"
              className="flex-1 rounded-md border border-transparent px-2 py-1 text-sm font-semibold text-slate-800 hover:border-slate-200 focus:border-slate-500 focus:outline-none"
            />
            <div className="no-print flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => moveSection(i, -1)}
                disabled={i === 0}
                className="rounded px-1.5 py-0.5 hover:bg-slate-100 disabled:opacity-30"
                title="위로 이동"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveSection(i, 1)}
                disabled={i === content.sections.length - 1}
                className="rounded px-1.5 py-0.5 hover:bg-slate-100 disabled:opacity-30"
                title="아래로 이동"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeSection(i)}
                className="rounded px-1.5 py-0.5 text-red-400 hover:bg-red-50"
                title="이 주제 삭제"
              >
                ✕
              </button>
            </div>
          </div>
          {SECTION_HINTS[section.title] && (
            <p className="mb-1 pl-6 text-xs text-slate-400">
              {SECTION_HINTS[section.title]}
            </p>
          )}
          <textarea
            value={section.body}
            onChange={(e) => updateSection(i, "body", e.target.value)}
            placeholder="내용을 입력하세요"
            rows={4}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="no-print w-full rounded-lg border border-dashed py-3 text-sm text-slate-500 hover:bg-white"
      >
        + 주제 추가
      </button>

      <div className="rounded-lg border bg-slate-50 p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">
          일정표 (타임테이블)
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          날짜(열)와 시간(행)을 추가해서 일정표를 만들어보세요. Word 내보내기에도
          표로 들어갑니다.
        </p>

        {content.timetable.days.length > 0 && (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-32 border bg-white p-1 text-xs font-medium text-slate-500">
                    시간
                  </th>
                  {content.timetable.days.map((day, di) => (
                    <th key={di} className="border bg-white p-1">
                      <div className="flex items-center gap-1">
                        <input
                          value={day}
                          onChange={(e) => updateDay(di, e.target.value)}
                          placeholder={`예) ${12 + di}일 (수)`}
                          className="min-w-0 flex-1 rounded border-0 px-2 py-1 text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("이 날짜(열)를 삭제할까요?"))
                              removeDay(di);
                          }}
                          className="no-print shrink-0 text-xs text-red-400 hover:text-red-600"
                          title="이 날짜 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="no-print w-8 border-0"></th>
                </tr>
              </thead>
              <tbody>
                {content.timetable.rows.map((row, ri) => (
                  <tr key={ri}>
                    <td className="border bg-white p-1 align-top">
                      <input
                        value={row.time}
                        onChange={(e) => updateRowTime(ri, e.target.value)}
                        placeholder="09:00-09:30"
                        className="w-full rounded border-0 px-1 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </td>
                    {row.cells.map((cell, ci) => {
                      if (cell.hidden) return null;
                      const merged = cell.rowSpan > 1 || cell.colSpan > 1;
                      return (
                        <td
                          key={ci}
                          rowSpan={cell.rowSpan}
                          colSpan={cell.colSpan}
                          className={`border p-1 align-middle ${
                            merged ? "bg-emerald-50" : "bg-white"
                          }`}
                        >
                          <textarea
                            value={cell.text}
                            onChange={(e) => updateCell(ri, ci, e.target.value)}
                            placeholder="내용"
                            rows={2}
                            className="w-full resize-y rounded border-0 bg-transparent px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                          <div className="no-print mt-0.5 flex flex-wrap justify-center gap-1 text-[10px]">
                            {canMergeRight(ri, ci) && (
                              <button
                                type="button"
                                onClick={() => mergeRight(ri, ci)}
                                className="rounded border px-1 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                title="오른쪽 칸과 합치기"
                              >
                                →병합
                              </button>
                            )}
                            {canMergeDown(ri, ci) && (
                              <button
                                type="button"
                                onClick={() => mergeDown(ri, ci)}
                                className="rounded border px-1 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                title="아래 칸과 합치기"
                              >
                                ↓병합
                              </button>
                            )}
                            {merged && (
                              <button
                                type="button"
                                onClick={() => unmergeCell(ri, ci)}
                                className="rounded border border-emerald-300 px-1 py-0.5 text-emerald-600 hover:bg-emerald-100"
                                title="병합 풀기"
                              >
                                해제
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="no-print border-0 pl-1 align-middle">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("이 시간(행)을 삭제할까요?"))
                            removeTimeRow(ri);
                        }}
                        className="text-sm text-red-400 hover:text-red-600"
                        title="이 시간 행 삭제"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="no-print flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addDay}
            className="rounded-md border border-dashed px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
          >
            + 날짜(열) 추가
          </button>
          {content.timetable.days.length > 0 && (
            <button
              type="button"
              onClick={addTimeRow}
              className="rounded-md border border-dashed px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
            >
              + 시간(행) 추가
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-slate-50 p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">예산안</h2>
        <p className="mb-3 text-xs text-slate-400">
          총 예산을 입력하고, 프로그램(항목)별로 배정 금액을 나눠보세요.
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            총 예산 (원)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={content.budget.total || ""}
            onChange={(e) => updateTotalBudget(e.target.value)}
            placeholder="예) 1000000"
            className="w-full max-w-xs rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        {content.budget.items.length > 0 && (
          <div className="mb-3 space-y-2">
            <div className="hidden gap-2 text-xs text-slate-500 sm:grid sm:grid-cols-[1fr_1.2fr_110px_0.8fr_32px]">
              <span>프로그램명</span>
              <span>산출 내역</span>
              <span>금액 (원)</span>
              <span>비고</span>
              <span></span>
            </div>
            {content.budget.items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-md border bg-white p-2 sm:grid-cols-[1fr_1.2fr_110px_0.8fr_32px] sm:border-0 sm:bg-transparent sm:p-0"
              >
                <input
                  value={item.name}
                  onChange={(e) => updateBudgetItem(i, "name", e.target.value)}
                  placeholder="예) 다과비"
                  className="rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <input
                  value={item.detail}
                  onChange={(e) =>
                    updateBudgetItem(i, "detail", e.target.value)
                  }
                  placeholder="예) 1인 1,000원 x 10명"
                  className="rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={item.amount || ""}
                  onChange={(e) =>
                    updateBudgetItem(i, "amount", e.target.value)
                  }
                  placeholder="0"
                  className="rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <input
                  value={item.note}
                  onChange={(e) => updateBudgetItem(i, "note", e.target.value)}
                  placeholder="비고"
                  className="rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeBudgetItem(i)}
                  className="justify-self-end text-sm text-red-500 hover:underline sm:justify-self-center sm:self-center"
                  title="이 항목 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addBudgetItem}
          className="no-print rounded-md border border-dashed px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
        >
          + 프로그램 추가
        </button>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-sm">
          <span className="text-slate-600">
            배정 합계:{" "}
            <strong className="text-slate-900">
              {allocated.toLocaleString("ko-KR")}원
            </strong>
          </span>
          <span className="text-slate-600">
            남은 예산:{" "}
            <strong
              className={remaining < 0 ? "text-red-600" : "text-slate-900"}
            >
              {remaining.toLocaleString("ko-KR")}원
            </strong>
            {remaining < 0 && (
              <span className="ml-1 text-xs text-red-600">(예산 초과!)</span>
            )}
          </span>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">사진 첨부</h2>
        <p className="mb-3 text-xs text-slate-400">
          행사 사진, 참고 이미지 등을 첨부하세요. Word 내보내기에도 포함됩니다.
        </p>

        {content.images.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {content.images.map((img, i) => (
              <div key={img.file} className="rounded-md border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/uploads/${img.file}`}
                  alt={img.caption || `첨부 사진 ${i + 1}`}
                  className="mb-2 h-32 w-full rounded object-cover"
                />
                <div className="flex items-center gap-1">
                  <input
                    value={img.caption}
                    onChange={(e) => updateImageCaption(i, e.target.value)}
                    placeholder="사진 설명 (선택)"
                    className="min-w-0 flex-1 rounded-md border px-2 py-1 text-xs focus:border-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="no-print shrink-0 text-sm text-red-500 hover:underline"
                    title="이 사진 제거"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="no-print w-full text-sm"
        />
        {uploading && (
          <p className="mt-2 text-xs text-slate-400">사진 올리는 중...</p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          사진을 추가하거나 뺀 뒤에는 꼭 <strong>저장</strong>을 눌러주세요.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="no-print flex flex-wrap items-center gap-3 border-t pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={() => {
            trackEvent("export_docx");
            exportBusinessPlanToDocx(title, content);
          }}
          className="flex items-center gap-1.5 rounded-md border-2 border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
        >
          Word(.docx)로 내보내기
          <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            추천
          </span>
        </button>
        <button
          onClick={async () => {
            setExportingHwp(true);
            try {
              await exportBusinessPlanToHwpx(title, content);
              trackEvent("export_hwpx");
            } catch {
              setError("HWP 내보내기에 실패했습니다.");
            }
            setExportingHwp(false);
          }}
          disabled={exportingHwp}
          className="rounded-md border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {exportingHwp ? "변환 중..." : "한글(.hwpx)로 내보내기"}
        </button>
        <button
          onClick={() => {
            trackEvent("export_pdf");
            window.print();
          }}
          className="rounded-md border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          PDF로 인쇄/저장
        </button>
        {planId && (
          <button
            onClick={handleDelete}
            className="ml-auto text-sm text-red-600 hover:underline"
          >
            삭제
          </button>
        )}
        {savedAt && (
          <span className="text-xs text-slate-400">
            {savedAt.toLocaleTimeString("ko-KR")} 저장됨
          </span>
        )}
      </div>
      <p className="no-print text-xs text-slate-400">
        표·색상이 가장 깔끔하게 나오는 <strong>Word(.docx)</strong>를
        추천합니다. 한글(.hwpx)은 관공서에 .hwp로 제출할 때 사용하세요.
      </p>
    </div>
  );
}
