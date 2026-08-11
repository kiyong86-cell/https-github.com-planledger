"use client";

// 교사 화면 — 학생 명단 등록/비밀번호 재설정 + 주간 제출 현황.
// 이 경로는 미들웨어에서 교사 계정만 열 수 있게 막혀 있다.
import { useCallback, useEffect, useState } from "react";
import SchoolHeader from "@/components/SchoolHeader";
import { createClient } from "@/lib/supabase/client";
import { StudentProfile } from "@/lib/school";
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

type Row = StudentProfile & { data: WeekData | null };
type RosterResult = { student_no: string; ok: boolean; message: string };

export default function TeacherPage() {
  const [week, setWeek] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [rosterText, setRosterText] = useState("");
  const [results, setResults] = useState<RosterResult[] | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setWeek(currentWeekValue()), []);

  const load = useCallback(async () => {
    if (!week) return;
    setRows(null);
    const supabase = createClient();
    const [{ data: profiles }, { data: weeks }] = await Promise.all([
      supabase
        .from("kairos_profiles")
        .select("user_id, student_no, name, grade, klass")
        .order("student_no"),
      supabase.from("kairos_weeks").select("user_id, data").eq("week", week),
    ]);

    const byUser = new Map<string, WeekData>();
    (weeks ?? []).forEach((w: { user_id: string; data: unknown }) =>
      byUser.set(w.user_id, normalizeWeek(w.data))
    );

    setRows(
      ((profiles ?? []) as StudentProfile[]).map((p) => ({
        ...p,
        data: byUser.get(p.user_id) ?? null,
      }))
    );
  }, [week]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitRoster() {
    setError(null);
    setResults(null);

    // 한 줄에 한 명: 학번, 이름, 학년, 반, 비밀번호
    const students = rosterText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [student_no, name, grade, klass, password] = line
          .split(/[,\t]/)
          .map((s) => (s ?? "").trim());
        return { student_no, name, grade, klass, password };
      });

    if (students.length === 0) {
      setError("등록할 학생을 한 줄에 한 명씩 적어주세요.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/school/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "등록에 실패했습니다.");
      } else {
        setResults(body.results ?? []);
        setRosterText("");
        load();
      }
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SchoolHeader title="교사 화면" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">주간 제출 현황</h1>
          <input
            type="week"
            value={week}
            onChange={(e) => setWeek(e.target.value || currentWeekValue())}
            className="rounded-md border px-2 py-1.5 text-sm"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="border-b px-3 py-2 text-left">학번</th>
                <th className="border-b px-3 py-2 text-left">이름</th>
                <th className="border-b px-3 py-2">학년/반</th>
                <th className="border-b px-3 py-2">작성</th>
                <th className="border-b px-3 py-2">계획 시간</th>
                <th className="border-b px-3 py-2">실행 시간</th>
                <th className="border-b px-3 py-2">평균 달성률</th>
                <th className="border-b px-3 py-2">할 일 완료</th>
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
                    등록된 학생이 없습니다. 아래에서 명단을 등록하세요.
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
                      <td className="px-3 py-2">{r.student_no}</td>
                      <td className="px-3 py-2">{r.name || "-"}</td>
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <section className="mt-8 rounded-lg border bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">
            학생 명단 등록 · 비밀번호 재설정
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            한 줄에 한 명씩 <b>학번, 이름, 학년, 반, 비밀번호</b> 순서로 적으세요.
            엑셀에서 복사해 붙여넣어도 됩니다. 이미 있는 학번은 비밀번호만
            새로 정해집니다.
          </p>
          <textarea
            value={rosterText}
            onChange={(e) => setRosterText(e.target.value)}
            rows={6}
            placeholder={"20261234, 김학생, 2, 3, kairos1234\n20261235, 이학생, 2, 3, kairos1234"}
            className="mt-3 w-full rounded-md border p-3 font-mono text-xs focus:border-slate-500 focus:outline-none"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={submitRoster}
              disabled={sending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {sending ? "등록 중..." : "등록하기"}
            </button>
            <span className="text-xs text-slate-400">
              비밀번호는 6자 이상이어야 합니다.
            </span>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {results && (
            <ul className="mt-4 space-y-1 text-xs">
              {results.map((r, i) => (
                <li
                  key={i}
                  className={r.ok ? "text-emerald-700" : "text-red-600"}
                >
                  {r.student_no} — {r.message}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-4 text-xs text-slate-400">
          학생은 <b>학번</b>과 비밀번호로 로그인합니다. 학생 화면 주소는
          이 사이트 주소 뒤에 /school 을 붙인 곳입니다.
        </p>
      </main>
    </div>
  );
}
