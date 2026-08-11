// KAIROS — 주간 시간 계획·실행 관리에 쓰는 타입과 계산 함수.
// 화면(app/kairos)과 내보내기(kairosExport)가 같은 계산을 쓰도록 여기 한 곳에 모아둔다.

export type CatKey =
  | "pray"
  | "school"
  | "rest"
  | "academy"
  | "play"
  | "etc"
  | "study"
  | "buffer";

export const CATS: { key: CatKey; ko: string; en: string; color: string }[] = [
  { key: "pray", ko: "기도·묵상", en: "Prayer", color: "#8b5cf6" },
  { key: "school", ko: "학교", en: "School", color: "#3b82f6" },
  { key: "rest", ko: "잠·휴식", en: "Sleep/Rest", color: "#94a3b8" },
  { key: "academy", ko: "학원·과외", en: "Tutoring", color: "#14b8a6" },
  { key: "play", ko: "노는 시간", en: "Free time", color: "#f59e0b" },
  { key: "etc", ko: "기타", en: "Other", color: "#a3765a" },
  { key: "study", ko: "공부", en: "Study", color: "#22c55e" },
  { key: "buffer", ko: "땜빵", en: "Buffer", color: "#ec4899" },
];

export const CAT_COLOR: Record<CatKey, string> = CATS.reduce(
  (m, c) => ({ ...m, [c.key]: c.color }),
  {} as Record<CatKey, string>
);

export const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type DayKey = (typeof DAYS)[number];

export const DAY_KO: Record<DayKey, string> = {
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
};

export const START_HOUR = 6;
export const END_HOUR = 24;
export const SLOTS = (END_HOUR - START_HOUR) * 2; // 30분 한 칸
export const NIGHT_REST = 6; // 00~06시는 잠·휴식으로 자동 계산
export const TODO_ROWS = 12;
export const TMR_ROWS = 8;

export type Todo = { p: string; t: string; done: boolean };

export type DayPlan = {
  med: string; // 오늘의 묵상 본문
  act: string; // 액션 포인트
  thx: string; // 감사 제목
  rev: string; // 한 줄 평가
  todos: Todo[];
  tmr: string[]; // 내일 할 일
};

export type Grid = Record<DayKey, (CatKey | null)[]>;

export type WeekData = {
  days: Record<DayKey, DayPlan>;
  grid: { plan: Grid; act: Grid };
};

export type GridMode = "plan" | "act";

export function blankDay(): DayPlan {
  return {
    med: "",
    act: "",
    thx: "",
    rev: "",
    todos: Array.from({ length: TODO_ROWS }, () => ({
      p: "",
      t: "",
      done: false,
    })),
    tmr: Array.from({ length: TMR_ROWS }, () => ""),
  };
}

export function blankWeek(): WeekData {
  const days = {} as Record<DayKey, DayPlan>;
  const plan = {} as Grid;
  const act = {} as Grid;
  DAYS.forEach((d) => {
    days[d] = blankDay();
    plan[d] = Array(SLOTS).fill(null);
    act[d] = Array(SLOTS).fill(null);
  });
  return { days, grid: { plan, act } };
}

/** 저장된 값이 낡거나 일부만 있어도 빈 주 위에 덮어써서 항상 온전한 모양으로 만든다. */
export function normalizeWeek(raw: unknown): WeekData {
  const base = blankWeek();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Partial<WeekData>;
  DAYS.forEach((d) => {
    const day = src.days?.[d];
    if (day) {
      base.days[d] = {
        ...base.days[d],
        ...day,
        todos: base.days[d].todos.map((t, i) => ({ ...t, ...day.todos?.[i] })),
        tmr: base.days[d].tmr.map((t, i) => day.tmr?.[i] ?? t),
      };
    }
    (["plan", "act"] as GridMode[]).forEach((m) => {
      const g = src.grid?.[m]?.[d];
      if (Array.isArray(g)) {
        for (let i = 0; i < SLOTS; i++) base.grid[m][d][i] = g[i] ?? null;
      }
    });
  });
  return base;
}

// ---------- 집계 ----------

export type CatTotals = Record<CatKey, number>;

/** 그리드(06~24시)만 집계한다. */
export function gridTotals(w: WeekData, mode: GridMode): Record<DayKey, CatTotals> {
  const out = {} as Record<DayKey, CatTotals>;
  DAYS.forEach((d) => {
    const col = CATS.reduce(
      (m, c) => ({ ...m, [c.key]: 0 }),
      {} as CatTotals
    );
    w.grid[mode][d].forEach((k) => {
      if (k) col[k] += 0.5;
    });
    out[d] = col;
  });
  return out;
}

/** 표시용 집계 — 00~06시 6시간을 잠·휴식에 더해 하루 24시간을 채운다. */
export function displayTotals(
  w: WeekData,
  mode: GridMode
): Record<DayKey, CatTotals> {
  const t = gridTotals(w, mode);
  const out = {} as Record<DayKey, CatTotals>;
  DAYS.forEach((d) => {
    out[d] = { ...t[d], rest: t[d].rest + NIGHT_REST };
  });
  return out;
}

export function sumDay(col: CatTotals): number {
  return CATS.reduce((a, c) => a + col[c.key], 0);
}

/** 목표 달성률(%) — 계획한 시간 중 실제로 그대로 지킨 비율. 계획이 없으면 null. */
export function adherence(w: WeekData, day: DayKey): number | null {
  const p = gridTotals(w, "plan")[day];
  const a = gridTotals(w, "act")[day];
  const planned = sumDay(p);
  if (!planned) return null;
  const match = CATS.reduce((s, c) => s + Math.min(p[c.key], a[c.key]), 0);
  return Math.round((match / planned) * 100);
}

export function fmt(n: number): string {
  return n % 1 ? n.toFixed(1) : String(n);
}

// ---------- 주차(ISO week) ----------

export function isoWeekMonday(value: string): Date {
  const [y, w] = value.split("-W").map(Number);
  const d = new Date(Date.UTC(y, 0, 4));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - dow + 1 + (w - 1) * 7);
  return d;
}

export function toWeekValue(date: Date): string {
  const t = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  return t.getUTCFullYear() + "-W" + String(wk).padStart(2, "0");
}

export function shiftWeek(value: string, delta: number): string {
  const m = isoWeekMonday(value);
  m.setUTCDate(m.getUTCDate() + 7 * delta);
  return toWeekValue(
    new Date(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate())
  );
}

export function currentWeekValue(): string {
  return toWeekValue(new Date());
}

/** 그 주 n번째 날짜 문자열 (0 = 월요일) */
export function dayDate(weekValue: string, dayIndex: number): string {
  const m = isoWeekMonday(weekValue);
  m.setUTCDate(m.getUTCDate() + dayIndex);
  return `${m.getUTCFullYear()}. ${m.getUTCMonth() + 1}. ${m.getUTCDate()}`;
}
