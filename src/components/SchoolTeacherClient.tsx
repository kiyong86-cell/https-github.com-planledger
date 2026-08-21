"use client";

// 교사 화면 — 승인된 학생들의 주간 제출 현황.
import { useCallback, useEffect, useState } from "react";
import SchoolHeader from "@/components/SchoolHeader";
import { createClient } from "@/lib/supabase/client";
import { KairosMember } from "@/lib/school";
import {
  Feedback,
  loadFeedbackForWeek,
  saveFeedback,
} from "@/lib/kairosFeedback";
import {
  adherence,
  currentWeekValue,
  DAYS,
  fmt,
  gridTotals,
  normalizeWeek,
  sumDay,
  WeekData,
} from "@/lib/kairos";

type Row = KairosMember & { data: WeekData | null; feedback: Feedback | null };

export default function SchoolTeacherClient({
  isAdmin,
  myName,
}: {
  isAdmin: boolean;
  myName: string;
}) {
  const [week, setWeek] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null); // 피드백 쓰는 학생
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setWeek(currentWeekValue()), []);

  const load = useCallback(async () => {
    if (!week) return;
    setRows(null);
    const supabase = createClient();
    const [{ data: members, error: memberError }, { data: weeks }] =
      await Promise.all([
        supabase
          .from("kairos_members")
          .select("*")
          .in("role", ["student", "teacher", "admin"])
          .order("grade").order("klass").order("name"),
        supabase.from("kairos_weeks").select("user_id, data").eq("week", week),
      ]);

    let feedbacks = new Map<string, Feedback>();
    try {
      feedbacks = await loadFeedbackForWeek(week);
    } catch {
      // 피드백 표를 아직 만들지 않았어도 현황은 보여준다
    }

    if (memberError) {
      setError("명단을 불러오지 못했습니다. 승인 상태를 확인해주세요.");
      setRows([]);
      return;
    }
    setError(null);

    const byUser = new Map<string, WeekData>();
    (weeks ?? []).forEach((w: { user_id: string; data: unknown }) =>
      byUser.set(w.user_id, normalizeWeek(w.data))
    );

    setRows(
      ((members ?? []) as KairosMember[])
        .filter((m) => m.role === "student")
        .map((m) => ({
          ...m,
          data: byUser.get(m.user_id) ?? null,
          feedback: feedbacks.get(m.user_id) ?? null,
        }))
    );
  }, [week]);

  useEffect(() => {
    load();
  }, [load]);

  const written = rows?.filter((r) => r.data).length ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <SchoolHeader title="학생 현황" showKairosLink showAdminLink={isAdmin} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              주간 제출 현황
            </h1>
            {rows && (
              <p className="mt-1 text-sm text-slate-500">
                학생 {rows.length}명 중 {written}명 작성
              </p>
            )}
          </div>
          <input
            type="week"
            value={week}
            onChange={(e) => setWeek(e.target.value || currentWeekValue())}
            className="rounded-md border px-2 py-1.5 text-sm"
          />
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="border-b px-3 py-2 text-left">이름</th>
                <th className="border-b px-3 py-2">학년/반</th>
                <th className="border-b px-3 py-2">작성</th>
                <th className="border-b px-3 py-2">계획 시간</th>
                <th className="border-b px-3 py-2">실행 시간</th>
                <th className="border-b px-3 py-2">평균 달성률</th>
                <th className="border-b px-3 py-2">할 일 완료</th>
                <th className="border-b px-3 py-2">피드백</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                    승인된 학생이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const d = r.data;
                  const plan = d
                    ? DAYS.reduce(
                        (s, day) => s + sumDay(gridTotals(d, "plan")[day]),
                        0
                      )
                    : 0;
                  const act = d
                    ? DAYS.reduce(
                        (s, day) => s + sumDay(gridTotals(d, "act")[day]),
                        0
                      )
                    : 0;
                  const rates = d
                    ? DAYS.map((day) => adherence(d, day)).filter(
                        (v): v is number => v !== null
                      )
                    : [];
                  const avg = rates.length
                    ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
                    : null;
                  const todos = d
                    ? DAYS.flatMap((day) =>
                        d.days[day].todos.filter((x) => x.t.trim())
                      )
                    : [];
                  const doneCount = todos.filter((x) => x.done).length;

                  return (
                    <tr key={r.user_id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {r.name || r.email}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500">
                        {[r.grade, r.klass].filter(Boolean).join("-") || "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {d ? (
                          <span className="text-emerald-700">○</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {d ? `${fmt(plan)}h` : ""}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {d ? `${fmt(act)}h` : ""}
                      </td>
                      <td className="px-3 py-2 text-center font-medium">
                        {avg === null ? "" : `${avg}%`}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500">
                        {todos.length ? `${doneCount} / ${todos.length}` : ""}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => {
                            setOpenFor(r.user_id);
                            setDraft(r.feedback?.text ?? "");
                          }}
                          className={`rounded border px-2 py-1 text-xs ${
                            r.feedback?.text
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          {r.feedback?.text ? "피드백 수정" : "피드백 쓰기"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {openFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg">
              <h2 className="text-base font-semibold text-slate-900">
                {rows?.find((r) => r.user_id === openFor)?.name} 학생에게 피드백
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {week} · 학생이 자기 시간표 화면에서 바로 볼 수 있습니다.
              </p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                placeholder="이번 주 계획을 잘 지켰어요. 다음 주에는 공부 시간을 조금 더 잡아볼까요?"
                className="mt-3 w-full rounded-md border p-3 text-sm focus:border-slate-500 focus:outline-none"
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setOpenFor(null)}
                  className="rounded-md border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  닫기
                </button>
                <button
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await saveFeedback(openFor, week, draft, myName);
                      setError(null);
                      setOpenFor(null);
                      load();
                    } catch (e) {
                      setError(
                        `피드백을 저장하지 못했습니다. (${
                          e instanceof Error ? e.message : "알 수 없는 오류"
                        })`
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-400">
          학생에게 알려줄 주소: <b>planledger.co.kr/school</b> — 각자 이메일로
          가입한 뒤 이용 신청을 하면 관리자가 승인합니다.
        </p>
      </main>
    </div>
  );
}
