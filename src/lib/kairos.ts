// KAIROS — 주간 시간 계획·실행 관리에 쓰는 타입과 계산 함수.
// 화면(app/kairos)과 내보내기(kairosExport)가 같은 계산을 쓰도록 여기 한 곳에 모아둔다.

export type CatKey = string;

/** 생활 항목 — 공부 외의 시간 */
export const LIFE_CATS: { key: CatKey; ko: string; en: string; color: string }[] = [
  { key: "pray", ko: "기도·묵상", en: "Prayer", color: "#8b5cf6" },
  { key: "rest", ko: "잠·휴식", en: "Sleep/Rest", color: "#94a3b8" },
  { key: "academy", ko: "학원·과외", en: "Tutoring", color: "#14b8a6" },
  { key: "play", ko: "노는 시간", en: "Free time", color: "#f59e0b" },
  { key: "study", ko: "공부(자습)", en: "Self-study", color: "#22c55e" },
  { key: "etc", ko: "기타", en: "Other", color: "#a3765a" },
  { key: "buffer", ko: "땜빵", en: "Buffer", color: "#ec4899" },
];

/** 학교 과목 */
export const SUBJECT_CATS: { key: CatKey; ko: string; en: string; color: string }[] = [
  { key: "korean", ko: "국어", en: "Korean", color: "#e11d48" },
  { key: "english", ko: "영어", en: "English", color: "#2563eb" },
  { key: "math", ko: "수학", en: "Math", color: "#7c3aed" },
  { key: "social", ko: "사회", en: "Social studies", color: "#ea580c" },
  { key: "science", ko: "과학", en: "Science", color: "#0891b2" },
  { key: "history", ko: "한국사", en: "Korean history", color: "#b45309" },
  { key: "talk", ko: "대화수업", en: "Dialogue class", color: "#db2777" },
  { key: "career", ko: "진로", en: "Career", color: "#4d7c0f" },
  { key: "council", ko: "자치활동", en: "Student council", color: "#0d9488" },
  { key: "writing", ko: "글쓰기", en: "Writing", color: "#9333ea" },
  { key: "reading", ko: "독서", en: "Reading", color: "#1d4ed8" },
  { key: "art", ko: "미술", en: "Art", color: "#f43f5e" },
  { key: "reflection", ko: "리플렉션", en: "Reflection", color: "#64748b" },
  { key: "music", ko: "악기", en: "Instrument", color: "#c026d3" },
  { key: "pe", ko: "운동수업", en: "PE", color: "#16a34a" },
  { key: "library", ko: "도서관", en: "Library", color: "#78716c" },
  { key: "choir", ko: "합창", en: "Choir", color: "#d946ef" },
  { key: "club", ko: "동아리", en: "Club", color: "#059669" },
  { key: "farm", ko: "농사", en: "Farming", color: "#65a30d" },
  { key: "bible", ko: "성경", en: "Bible", color: "#7e22ce" },
  { key: "worship", ko: "예배", en: "Worship", color: "#4f46e5" },
];

export const CATS = [...LIFE_CATS, ...SUBJECT_CATS];

/** 과목인지 (완성 분량을 적는 항목) */
export const SUBJECT_KEYS = new Set(SUBJECT_CATS.map((c) => c.key));

// 예전 "학교" 항목으로 칠해둔 기록은 "기타"로 옮겨 읽는다.
const LEGACY_MAP: Record<string, CatKey> = { school: "etc" };

export function normalizeCat(key: unknown): CatKey | null {
  if (typeof key !== "string") return null;
  if (CAT_COLOR[key]) return key;
  return LEGACY_MAP[key] ?? null;
}

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

export const START_HOUR = 0; // 하루 전체(00~24시)를 표에 담는다
export const END_HOUR = 24;
export const SLOTS = (END_HOUR - START_HOUR) * 2; // 30분 한 칸
/** 예전 표(06~24시)를 하루 전체 표로 옮길 때 쓰는 칸 수 */
const LEGACY_OFFSET = 12; // 06시 = 12번째 30분 칸
export const LEGACY_SLOTS = 36;
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
  /** 과목별·요일별 완성 분량 (예: progress.korean.MON = "문학 3단원") */
  progress: Record<CatKey, Partial<Record<DayKey, string>>>;
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
  return { days, grid: { plan, act }, progress: {} };
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
        // 예전 기록은 06시부터 36칸이었다. 같은 시각에 오도록 12칸 밀어 넣는다.
        const offset = g.length === LEGACY_SLOTS ? LEGACY_OFFSET : 0;
        for (let i = 0; i < g.length && i + offset < SLOTS; i++) {
          base.grid[m][d][i + offset] = normalizeCat(g[i]);
        }
      }
    });
  });
  if (src.progress && typeof src.progress === "object") {
    Object.entries(src.progress as Record<string, unknown>).forEach(([k, v]) => {
      if (!CAT_COLOR[k]) return;
      if (typeof v === "string") {
        // 예전에는 과목마다 한 칸이었다. 월요일 칸으로 옮겨 둔다.
        if (v.trim()) base.progress[k] = { MON: v };
      } else if (v && typeof v === "object") {
        const byDay: Partial<Record<DayKey, string>> = {};
        DAYS.forEach((d) => {
          const text = (v as Record<string, unknown>)[d];
          if (typeof text === "string" && text.trim()) byDay[d] = text;
        });
        if (Object.keys(byDay).length) base.progress[k] = byDay;
      }
    });
  }
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
      if (k && k in col) col[k] += 0.5;
    });
    out[d] = col;
  });
  return out;
}

/** 표시용 집계 — 이제 표가 하루 전체(00~24시)를 담으므로 그대로 쓴다. */
export function displayTotals(
  w: WeekData,
  mode: GridMode
): Record<DayKey, CatTotals> {
  return gridTotals(w, mode);
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
