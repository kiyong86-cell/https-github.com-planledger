"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SchoolHeader from "@/components/SchoolHeader";
import { useI18n } from "@/components/LangProvider";
import { loadWeek, saveWeek } from "@/lib/kairosStore";
import {
  adherence,
  blankWeek,
  LIFE_CATS,
  SUBJECT_CATS,
  SUBJECT_KEYS,
  CatKey,
  CATS,
  currentWeekValue,
  DAY_KO,
  DayKey,
  DAYS,
  dayDate,
  displayTotals,
  END_HOUR,
  fmt,
  GridMode,
  gridTotals,
  NIGHT_REST,
  shiftWeek,
  SLOTS,
  START_HOUR,
  sumDay,
  WeekData,
} from "@/lib/kairos";
import {
  buildWeekHtml,
  exportWeekToHwpx,
  exportWeekToWord,
  printWeek,
} from "@/lib/kairosExport";
import { trackEvent } from "@/lib/track";

const MODES: [GridMode, string][] = [
  ["plan", "kairos.plan"],
  ["act", "kairos.actual"],
];

type SaveState = "idle" | "saving" | "saved" | "failed";

export default function KairosClient({
  isStaff,
  isAdmin,
}: {
  isStaff: boolean;
  isAdmin: boolean;
}) {
  const { t, lang } = useI18n();
  const [week, setWeek] = useState("");
  const [data, setData] = useState<WeekData | null>(null);
  const [prevData, setPrevData] = useState<WeekData | null>(null);
  const [day, setDay] = useState<DayKey>("MON");
  const [tab, setTab] = useState<1 | 2 | 3>(1);
  const [brush, setBrush] = useState<CatKey | null>("study");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [busy, setBusy] = useState<string | null>(null);
  const painting = useRef(false);
  const dirty = useRef(false);

  const catName = useCallback(
    (c: (typeof CATS)[number]) => (lang === "ko" ? c.ko : c.en),
    [lang]
  );

  useEffect(() => {
    setWeek(currentWeekValue());
  }, []);

  // 주가 바뀌면 그 주와 지난 주 데이터를 불러온다.
  useEffect(() => {
    if (!week) return;
    let alive = true;
    dirty.current = false;
    setData(null);
    Promise.all([loadWeek(week), loadWeek(shiftWeek(week, -1))])
      .then(([cur, prev]) => {
        if (!alive) return;
        setData(cur ?? blankWeek());
        setPrevData(prev);
      })
      .catch(() => {
        if (alive) setData(blankWeek());
      });
    return () => {
      alive = false;
    };
  }, [week]);

  // 자동 저장 (입력이 멈추고 0.8초 뒤)
  useEffect(() => {
    if (!data || !week || !dirty.current) return;
    setSaveState("saving");
    const timer = setTimeout(() => {
      saveWeek(week, data)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("failed"));
    }, 800);
    return () => clearTimeout(timer);
  }, [data, week]);

  const edit = useCallback((fn: (draft: WeekData) => WeekData) => {
    dirty.current = true;
    setData((prev) => (prev ? fn(prev) : prev));
  }, []);

  // 끌어서 칠할 때 마우스가 빠르게 지나가면 중간 칸을 건너뛴다.
  // 직전에 칠한 칸을 기억해 두고 같은 줄이면 사이를 채운다.
  const lastPainted = useRef<{ mode: GridMode; day: DayKey; index: number } | null>(
    null
  );

  const paint = useCallback(
    (mode: GridMode, d: DayKey, index: number, continuing = false) => {
      const last = lastPainted.current;
      const from =
        continuing && last && last.mode === mode && last.day === d
          ? last.index
          : index;
      lastPainted.current = { mode, day: d, index };
      edit((prev) => {
        const row = prev.grid[mode][d].slice();
        const [lo, hi] = from <= index ? [from, index] : [index, from];
        let changed = false;
        for (let i = lo; i <= hi; i++) {
          if (row[i] !== brush) {
            row[i] = brush;
            changed = true;
          }
        }
        if (!changed) return prev;
        return {
          ...prev,
          grid: {
            ...prev.grid,
            [mode]: { ...prev.grid[mode], [d]: row },
          },
        };
      });
    },
    [brush, edit]
  );

  useEffect(() => {
    const stop = () => {
      painting.current = false;
      lastPainted.current = null;
    };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  // 저장 버튼 — 자동 저장을 기다리지 않고 바로 저장한다.
  async function saveNow() {
    if (!data || !week) return;
    setSaveState("saving");
    try {
      await saveWeek(week, data);
      dirty.current = false;
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  }

  async function runExport(kind: "pdf" | "word" | "hwpx") {
    if (!data || !week) return;
    setBusy(kind);
    try {
      const html = buildWeekHtml(week, data, prevData);
      if (kind === "word") {
        exportWeekToWord(week, html);
        trackEvent("export_docx");
      } else if (kind === "hwpx") {
        await exportWeekToHwpx(week, html);
        trackEvent("export_hwpx");
      } else {
        if (!printWeek(html)) alert(t("kairos.popupBlocked"));
        trackEvent("export_pdf");
      }
    } catch {
      alert(t("kairos.exportFailed"));
    } finally {
      setBusy(null);
    }
  }

  if (!week || !data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SchoolHeader
        title="내 시간표"
        showTeacherLink={isStaff}
        showAdminLink={isAdmin}
      />
        <main className="mx-auto max-w-[1700px] px-4 py-10 text-sm text-slate-400">
          {t("kairos.loading")}
        </main>
      </div>
    );
  }

  const planTotals = displayTotals(data, "plan");
  const actTotals = displayTotals(data, "act");
  const dayPlan = data.days[day];
  const adh = adherence(data, day);
  const filledTodos = dayPlan.todos.filter((x) => x.t.trim());
  const doneTodos = filledTodos.filter((x) => x.done).length;
  const todoRate = filledTodos.length
    ? Math.round((doneTodos / filledTodos.length) * 100)
    : 0;
  const planHours = sumDay(gridTotals(data, "plan")[day]);
  const actHours = sumDay(gridTotals(data, "act")[day]);

  return (
    <div className="min-h-screen bg-slate-50">
      <SchoolHeader
        title="내 시간표"
        showTeacherLink={isStaff}
        showAdminLink={isAdmin}
      />
      <main className="mx-auto max-w-[1700px] px-4 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {t("kairos.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{t("kairos.intro")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setWeek(shiftWeek(week, -1))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm hover:bg-slate-50"
              title="지난 주"
            >
              ←
            </button>
            <input
              type="week"
              value={week}
              onChange={(e) => setWeek(e.target.value || currentWeekValue())}
              className="rounded-md border px-2 py-1.5 text-sm"
            />
            <button
              onClick={() => setWeek(shiftWeek(week, 1))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm hover:bg-slate-50"
              title="다음 주"
            >
              →
            </button>
            <button
              onClick={saveNow}
              disabled={saveState === "saving"}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {saveState === "saving" ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={() => runExport("pdf")}
              disabled={busy !== null}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40"
            >
              PDF
            </button>
            <button
              onClick={() => runExport("word")}
              disabled={busy !== null}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Word
            </button>
            <button
              onClick={() => runExport("hwpx")}
              disabled={busy !== null}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {busy === "hwpx" ? t("kairos.exporting") : t("kairos.hwp")}
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              onClick={() => setTab(n)}
              className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium ${
                tab === n
                  ? "bg-white text-slate-900"
                  : "bg-slate-100 text-slate-500 hover:text-slate-900"
              }`}
            >
              {t(`kairos.tab${n}`)}
            </button>
          ))}
          <span
            className={`ml-auto self-center text-xs ${
              saveState === "failed" ? "text-red-600" : "text-slate-400"
            }`}
          >
            {saveState === "saving"
              ? t("kairos.saving")
              : saveState === "failed"
              ? t("kairos.saveFailed")
              : saveState === "saved"
              ? t("auth.savedToAccount")
              : ""}
          </span>
        </div>

        {/* 1. 일일학습계획표 */}
        {tab === 1 && (
          <section className="rounded-lg border bg-white p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    day === d
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {DAY_KO[d]} ({d})
                </button>
              ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <p className="text-xs text-slate-400">
                  DATE {dayDate(week, DAYS.indexOf(day))}
                </p>
                {(
                  [
                    ["med", "kairos.meditation"],
                    ["act", "kairos.actionPoint"],
                    ["thx", "kairos.thanks"],
                  ] as [keyof typeof dayPlan, string][]
                ).map(([field, key]) => (
                  <label key={String(field)} className="mt-3 block">
                    <span className="text-xs text-slate-500">{t(key)}</span>
                    <input
                      value={String(dayPlan[field] ?? "")}
                      onChange={(e) =>
                        edit((prev) => ({
                          ...prev,
                          days: {
                            ...prev.days,
                            [day]: { ...prev.days[day], [field]: e.target.value },
                          },
                        }))
                      }
                      className="w-full border-b py-1.5 text-sm outline-none focus:border-emerald-600"
                    />
                  </label>
                ))}

                <h2 className="mb-2 mt-6 text-base font-semibold text-slate-900">
                  {t("kairos.todayTodo")}
                </h2>
                <table className="w-full border text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500">
                      <th className="w-12 border px-1 py-1">
                        {t("kairos.priority")}
                      </th>
                      <th className="border px-2 py-1">
                        {t("kairos.todoContent")}
                      </th>
                      <th className="w-14 border px-1 py-1">
                        {t("kairos.doneMark")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayPlan.todos.map((todo, i) => (
                      <tr key={i}>
                        <td className="border p-0">
                          <input
                            value={todo.p}
                            onChange={(e) =>
                              edit((prev) => {
                                const todos = prev.days[day].todos.slice();
                                todos[i] = { ...todos[i], p: e.target.value };
                                return {
                                  ...prev,
                                  days: {
                                    ...prev.days,
                                    [day]: { ...prev.days[day], todos },
                                  },
                                };
                              })
                            }
                            className="w-full px-1 py-1.5 text-center outline-none"
                          />
                        </td>
                        <td className="border p-0">
                          <input
                            value={todo.t}
                            onChange={(e) =>
                              edit((prev) => {
                                const todos = prev.days[day].todos.slice();
                                todos[i] = { ...todos[i], t: e.target.value };
                                return {
                                  ...prev,
                                  days: {
                                    ...prev.days,
                                    [day]: { ...prev.days[day], todos },
                                  },
                                };
                              })
                            }
                            className="w-full px-2 py-1.5 outline-none"
                          />
                        </td>
                        <td className="border text-center">
                          <input
                            type="checkbox"
                            checked={todo.done}
                            onChange={(e) =>
                              edit((prev) => {
                                const todos = prev.days[day].todos.slice();
                                todos[i] = { ...todos[i], done: e.target.checked };
                                return {
                                  ...prev,
                                  days: {
                                    ...prev.days,
                                    [day]: { ...prev.days[day], todos },
                                  },
                                };
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {t("kairos.selfCheck")}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {t("kairos.selfCheckHint")}
                </p>

                <div className="mt-3 space-y-4 rounded-lg border bg-slate-50 p-4">
                  <Gauge
                    label={t("kairos.goalRate")}
                    value={adh}
                    text={adh === null ? t("kairos.noPlan") : `${adh}%`}
                  />
                  <Gauge
                    label={t("kairos.todoRate")}
                    value={todoRate}
                    text={`${doneTodos} / ${filledTodos.length}`}
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {t("kairos.planVsActual")}
                    </span>
                    <b>
                      {fmt(planHours)}h / {fmt(actHours)}h
                    </b>
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className="text-xs text-slate-500">
                    {t("kairos.oneLine")}
                  </span>
                  <input
                    value={dayPlan.rev}
                    onChange={(e) =>
                      edit((prev) => ({
                        ...prev,
                        days: {
                          ...prev.days,
                          [day]: { ...prev.days[day], rev: e.target.value },
                        },
                      }))
                    }
                    className="w-full border-b py-1.5 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <h2 className="mb-2 mt-6 text-base font-semibold text-slate-900">
                  {t("kairos.tomorrowTodo")}
                </h2>
                <div className="space-y-1">
                  {dayPlan.tmr.map((value, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-slate-300">•</span>
                      <input
                        value={value}
                        onChange={(e) =>
                          edit((prev) => {
                            const tmr = prev.days[day].tmr.slice();
                            tmr[i] = e.target.value;
                            return {
                              ...prev,
                              days: {
                                ...prev.days,
                                [day]: { ...prev.days[day], tmr },
                              },
                            };
                          })
                        }
                        className="w-full border-b py-1 text-sm outline-none focus:border-emerald-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 2. 24시간 계획·실행 */}
        {tab === 2 && (
          <section className="rounded-lg border bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">
              {t("kairos.gridTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t("kairos.gridHint")}</p>

            <div className="my-4 space-y-2">
              {(
                [
                  ["생활", LIFE_CATS],
                  ["과목", SUBJECT_CATS],
                ] as const
              ).map(([groupName, list]) => (
                <div key={groupName} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-8 shrink-0 text-xs text-slate-400">
                    {groupName}
                  </span>
                  {list.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setBrush(c.key)}
                      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm ${
                        brush === c.key
                          ? "border-slate-900 font-semibold"
                          : "border-slate-300"
                      }`}
                    >
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-sm"
                        style={{ background: c.color }}
                      />
                      {catName(c)}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="my-4 flex flex-wrap gap-2">
              <button
                onClick={() => setBrush(null)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  brush === null ? "border-slate-900 font-semibold" : "border-slate-300"
                }`}
              >
                {t("kairos.eraser")}
              </button>
              <button
                onClick={() => {
                  if (!confirm(t("kairos.clearConfirm"))) return;
                  edit(() => ({ ...blankWeek(), days: data.days }));
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-500"
              >
                {t("kairos.clearAll")}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table
                className="w-full table-fixed border-collapse select-none"
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(
                    touch.clientX,
                    touch.clientY
                  ) as HTMLElement | null;
                  if (el?.dataset.slot) {
                    const [mode, d, i] = el.dataset.slot.split(":");
                    paint(mode as GridMode, d as DayKey, Number(i), true);
                    e.preventDefault();
                  }
                }}
              >
                <thead>
                  <tr>
                    <th className="w-14 border bg-slate-100 px-1 py-1 text-xs">
                      {t("kairos.dayCol")}
                    </th>
                    <th className="w-12 border bg-slate-100 px-1 py-1 text-xs" />
                    {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                      <th
                        key={i}
                        colSpan={2}
                        className="border bg-slate-100 px-0 py-1 text-xs font-normal text-slate-500"
                      >
                        {String(START_HOUR + i).padStart(2, "0")}
                      </th>
                    ))}
                    <th className="w-16 border bg-slate-100 px-1 py-1 text-xs">
                      {t("kairos.sum")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((d) =>
                    MODES.map(([mode, label], mi) => (
                      <tr key={`${d}-${mode}`}>
                        {mi === 0 && (
                          <td
                            rowSpan={2}
                            className="border bg-slate-50 px-2 text-center text-sm font-semibold"
                          >
                            {DAY_KO[d]}
                            <br />
                            {d}
                          </td>
                        )}
                        <td className="border bg-slate-50 px-1 text-center text-xs text-slate-500">
                          {t(label)}
                        </td>
                        {Array.from({ length: SLOTS }, (_, i) => {
                          const key = data.grid[mode][d][i];
                          return (
                            <td
                              key={i}
                              data-slot={`${mode}:${d}:${i}`}
                              onMouseDown={(e) => {
                                painting.current = true;
                                lastPainted.current = null;
                                paint(mode, d, i);
                                e.preventDefault();
                              }}
                              onMouseEnter={() => {
                                if (painting.current) paint(mode, d, i, true);
                              }}
                              className={`h-7 cursor-pointer border-y border-r p-0 ${
                                i % 2 === 0 ? "border-r-dashed" : ""
                              }`}
                              style={{
                                background: key
                                  ? CATS.find((c) => c.key === key)?.color
                                  : "#fff",
                              }}
                            />
                          );
                        })}
                        <td className="border bg-slate-50 px-1 text-center text-xs">
                          {fmt(sumDay(gridTotals(data, mode)[d]))}h
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400">{t("kairos.nightNote")}</p>
          </section>
        )}

        {/* 3. 시간 분배 */}
        {tab === 3 && (
          <section className="rounded-lg border bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">
              {t("kairos.distTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t("kairos.distHint")}</p>
            <div className="mt-4 grid gap-6 lg:grid-cols-3">
              <TotalsTable
                title={t("kairos.prevActual")}
                totals={prevData ? displayTotals(prevData, "act") : null}
                catName={catName}
                emptyText={t("kairos.noPrev")}
              />
              <TotalsTable
                title={t("kairos.thisPlan")}
                totals={planTotals}
                catName={catName}
              />
              <TotalsTable
                title={t("kairos.thisActual")}
                totals={actTotals}
                compare={planTotals}
                catName={catName}
              />
            </div>
            <p className="mt-4 text-xs text-slate-400">{t("kairos.distNote")}</p>

            <h3 className="mt-8 text-base font-semibold text-slate-900">
              과목별 완성 분량
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              이번 주에 어디까지 했는지 적어두세요. 시간은 위에서 자동으로
              계산되고, 분량은 직접 적습니다. (예: 수학 익힘책 32~48쪽)
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SUBJECT_CATS.filter((c) =>
                DAYS.some(
                  (d) => planTotals[d][c.key] > 0 || actTotals[d][c.key] > 0
                )
              ).map((c) => {
                const hours = DAYS.reduce(
                  (sum, d) => sum + actTotals[d][c.key],
                  0
                );
                return (
                  <label
                    key={c.key}
                    className="flex items-center gap-2 rounded-md border bg-slate-50 px-2 py-1.5"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ background: c.color }}
                    />
                    <span className="w-20 shrink-0 text-sm text-slate-700">
                      {catName(c)}
                    </span>
                    <span className="w-12 shrink-0 text-right text-xs text-slate-400">
                      {fmt(hours)}h
                    </span>
                    <input
                      value={data.progress[c.key] ?? ""}
                      onChange={(e) =>
                        edit((prev) => ({
                          ...prev,
                          progress: {
                            ...prev.progress,
                            [c.key]: e.target.value,
                          },
                        }))
                      }
                      placeholder="어디까지 했나요?"
                      className="w-full rounded border-0 bg-transparent px-1 py-0.5 text-sm outline-none focus:bg-white"
                    />
                  </label>
                );
              })}
              {SUBJECT_CATS.every((c) =>
                DAYS.every(
                  (d) => !planTotals[d][c.key] && !actTotals[d][c.key]
                )
              ) && (
                <p className="text-sm text-slate-400">
                  2번 표에서 과목을 칠하면 여기에 나타납니다.
                </p>
              )}
            </div>
          </section>
        )}

        <p className="mt-4 text-xs text-slate-400">
          내 계정에 저장됩니다. 집에서도 학교에서도 같은 학번으로 들어오면
          이어서 쓸 수 있어요.
        </p>
      </main>
    </div>
  );
}

function Gauge({
  label,
  value,
  text,
}: {
  label: string;
  value: number | null;
  text: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <b>{text}</b>
      </div>
      <div className="h-5 overflow-hidden rounded-full border border-slate-800 bg-white">
        <div
          className="h-full bg-gradient-to-r from-sky-300 to-slate-700"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function TotalsTable({
  title,
  totals,
  compare,
  catName,
  emptyText,
}: {
  title: string;
  totals: Record<DayKey, Record<CatKey, number>> | null;
  compare?: Record<DayKey, Record<CatKey, number>>;
  catName: (c: (typeof CATS)[number]) => string;
  emptyText?: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      {!totals ? (
        <div className="rounded border border-dashed p-6 text-center text-xs text-slate-400">
          {emptyText}
        </div>
      ) : (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border bg-cyan-50 px-1 py-1" />
              {DAYS.map((d) => (
                <th key={d} className="border bg-cyan-50 px-1 py-1 font-medium">
                  {d}
                </th>
              ))}
              <th className="border bg-cyan-50 px-1 py-1 font-medium">Σ</th>
            </tr>
          </thead>
          <tbody>
            {CATS.filter((c) =>
              DAYS.some((d) => totals[d][c.key] > 0)
            ).map((c) => {
              const wk = DAYS.reduce((s, d) => s + totals[d][c.key], 0);
              return (
                <tr key={c.key}>
                  <td className="border px-1 py-1">{catName(c)}</td>
                  {DAYS.map((d) => {
                    const v = totals[d][c.key];
                    const diff = compare ? v - compare[d][c.key] : 0;
                    return (
                      <td key={d} className="border px-1 py-1 text-center">
                        {v ? fmt(v) : ""}
                        {diff !== 0 && (
                          <span
                            className={`ml-0.5 text-[9px] ${
                              diff > 0 ? "text-teal-600" : "text-red-600"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}
                            {fmt(diff)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border px-1 py-1 text-center">
                    {wk ? fmt(wk) : ""}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-cyan-50 font-semibold">
              <td className="border px-1 py-1">Σ</td>
              {DAYS.map((d) => {
                const s = sumDay(totals[d]);
                const off = s !== 24 && s !== NIGHT_REST;
                return (
                  <td
                    key={d}
                    className={`border px-1 py-1 text-center ${
                      off ? "text-red-600" : ""
                    }`}
                  >
                    {fmt(s)}
                  </td>
                );
              })}
              <td className="border px-1 py-1 text-center">
                {fmt(DAYS.reduce((s, d) => s + sumDay(totals[d]), 0))}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
