"use client";

// 저장된 기록 모아보기.
// - 학생: 내가 저장한 주가 최신순으로 쌓인다
// - 교사·관리자: 학생 한 명의 기록을 보고 주마다 피드백을 남긴다
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SchoolHeader from "@/components/SchoolHeader";
import { listWeekRecords, WeekRecord } from "@/lib/kairosRecords";
import { Feedback, loadFeedback, saveFeedback } from "@/lib/kairosFeedback";
import {
  DAY_KO,
  DAYS,
  dayDate,
  displayTotals,
  fmt,
  SUBJECT_CATS,
  weekLabel,
} from "@/lib/kairos";

export default function RecordsClient({
  studentId,
  studentName,
  canWriteFeedback,
  myName,
  isStaff,
  isAdmin,
}: {
  studentId?: string;
  studentName?: string;
  canWriteFeedback: boolean;
  myName: string;
  isStaff: boolean;
  isAdmin: boolean;
}) {
  const [records, setRecords] = useState<WeekRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setRecords(null);
    listWeekRecords(studentId)
      .then(setRecords)
      .catch((e) => {
        setError(
          "기록을 불러오지 못했습니다. (" +
            (e instanceof Error ? e.message : "알 수 없는 오류") +
            ")"
        );
        setRecords([]);
      });
  }, [studentId]);

  useEffect(load, [load]);

  // 주를 펼치면 그 주 피드백을 가져온다
  useEffect(() => {
    if (!openWeek) return;
    let alive = true;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const {
        data: { user },
      } = await createClient().auth.getUser();
      const target = studentId ?? user?.id;
      if (!target) return;
      const f = await loadFeedback(target, openWeek).catch(() => null);
      if (alive) {
        setFeedback(f);
        setDraft(f?.text ?? "");
      }
    })();
    return () => {
      alive = false;
    };
  }, [openWeek, studentId]);

  const title = studentName ? studentName + " 학생 기록" : "내 기록";

  return (
    <div className="min-h-screen bg-slate-50">
      <SchoolHeader
        title={title}
        showKairosLink
        showTeacherLink={isStaff}
        showAdminLink={isAdmin}
      />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              저장한 주가 최신순으로 쌓입니다. 한 줄을 누르면 그 주의 내용을 볼
              수 있어요.
            </p>
          </div>
          {isStaff && studentId && (
            <Link
              href="/school/teacher"
              className="rounded-md border bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              ← 학생 현황
            </Link>
          )}
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {records === null ? (
          <p className="text-sm text-slate-400">불러오는 중...</p>
        ) : records.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-white p-10 text-center text-sm text-slate-400">
            아직 저장된 기록이 없습니다.{" "}
            {!studentId && (
              <Link href="/school/kairos" className="text-emerald-700 underline">
                시간표 쓰러 가기
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => {
              const open = openWeek === r.week;
              const act = displayTotals(r.data, "act");
              const plan = displayTotals(r.data, "plan");
              const usedSubjects = SUBJECT_CATS.filter((c) =>
                DAYS.some((d) => act[d][c.key] > 0 || plan[d][c.key] > 0)
              );
              return (
                <li key={r.week} className="rounded-lg border bg-white">
                  <button
                    onClick={() => setOpenWeek(open ? null : r.week)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span>
                      <span className="font-medium text-slate-900">
                        {weekLabel(r.week, true)}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        {dayDate(r.week, 0)} ~ {dayDate(r.week, 5)}
                      </span>
                    </span>
                    <span className="flex items-center gap-4 text-sm text-slate-500">
                      <span>
                        계획 {fmt(r.planHours)}h · 실행 {fmt(r.actHours)}h
                      </span>
                      <span className="font-medium text-slate-900">
                        {r.avgRate === null ? "-" : r.avgRate + "%"}
                      </span>
                      <span className="text-xs">
                        할 일 {r.todoDone}/{r.todoTotal}
                      </span>
                      <span className="text-slate-300">{open ? "▲" : "▼"}</span>
                    </span>
                  </button>

                  {open && (
                    <div className="border-t px-4 py-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            요일별 실행 시간
                          </h3>
                          <table className="mt-2 w-full border-collapse text-xs">
                            <tbody>
                              {DAYS.map((d) => {
                                const dayTotal = Object.values(act[d]).reduce(
                                  (a, b) => a + b,
                                  0
                                );
                                return (
                                  <tr key={d}>
                                    <td className="border px-2 py-1">
                                      {DAY_KO[d]}
                                    </td>
                                    <td className="border px-2 py-1 text-right">
                                      {fmt(dayTotal)}h
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            과목별 완성 분량
                          </h3>
                          {usedSubjects.length === 0 ? (
                            <p className="mt-2 text-xs text-slate-400">
                              기록된 과목이 없습니다.
                            </p>
                          ) : (
                            <ul className="mt-2 space-y-1 text-xs text-slate-600">
                              {usedSubjects.map((c) => {
                                const notes = DAYS.map((d) => {
                                  const text = r.data.progress[c.key]?.[d];
                                  return text ? DAY_KO[d] + " " + text : null;
                                }).filter(Boolean);
                                return (
                                  <li key={c.key}>
                                    <span
                                      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                                      style={{ background: c.color }}
                                    />
                                    <b>{c.ko}</b>{" "}
                                    <span className="text-slate-400">
                                      (계획{" "}
                                      {fmt(
                                        DAYS.reduce(
                                          (sum, d) => sum + plan[d][c.key],
                                          0
                                        )
                                      )}
                                      h · 실행{" "}
                                      {fmt(
                                        DAYS.reduce(
                                          (sum, d) => sum + act[d][c.key],
                                          0
                                        )
                                      )}
                                      h)
                                    </span>{" "}
                                    {notes.length ? notes.join(" / ") : "—"}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 border-t pt-4">
                        <h3 className="text-sm font-semibold text-slate-900">
                          선생님 피드백
                        </h3>
                        {canWriteFeedback && studentId ? (
                          <>
                            <textarea
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              rows={4}
                              placeholder="이번 주 기록을 보고 한마디 남겨주세요."
                              className="mt-2 w-full rounded-md border p-3 text-sm focus:border-slate-500 focus:outline-none"
                            />
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <button
                                disabled={saving}
                                onClick={async () => {
                                  setSaving(true);
                                  try {
                                    await saveFeedback(
                                      studentId,
                                      r.week,
                                      draft,
                                      myName
                                    );
                                    setFeedback({
                                      student_id: studentId,
                                      week: r.week,
                                      teacher_name: myName,
                                      text: draft,
                                      updated_at: new Date().toISOString(),
                                    });
                                    setError(null);
                                  } catch (e) {
                                    setError(
                                      "피드백을 저장하지 못했습니다. (" +
                                        (e instanceof Error
                                          ? e.message
                                          : "알 수 없는 오류") +
                                        ")"
                                    );
                                  } finally {
                                    setSaving(false);
                                  }
                                }}
                                className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                              >
                                {saving ? "저장 중..." : "피드백 저장"}
                              </button>
                              {feedback?.updated_at && (
                                <span className="text-xs text-slate-400">
                                  마지막 저장{" "}
                                  {new Date(feedback.updated_at).toLocaleString(
                                    "ko-KR"
                                  )}
                                </span>
                              )}
                            </div>
                          </>
                        ) : feedback?.text ? (
                          <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                            <p className="text-xs text-emerald-700">
                              {feedback.teacher_name
                                ? feedback.teacher_name + " 선생님"
                                : "선생님"}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
                              {feedback.text}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-400">
                            아직 받은 피드백이 없습니다.
                          </p>
                        )}
                      </div>

                      {!studentId && (
                        <Link
                          href={"/school/kairos?week=" + r.week}
                          className="mt-4 inline-block rounded-md border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          이 주 시간표 열기 →
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
