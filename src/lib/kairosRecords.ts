// 저장된 주간 기록 목록. 학생은 자기 것, 교사·관리자는 학생 것을 본다.
import { createClient } from "./supabase/client";
import {
  adherence,
  DAYS,
  gridTotals,
  normalizeWeek,
  sumDay,
  WeekData,
} from "./kairos";

export type WeekRecord = {
  week: string;
  updatedAt: string;
  planHours: number;
  actHours: number;
  avgRate: number | null;
  todoDone: number;
  todoTotal: number;
  data: WeekData;
};

function summarize(week: string, updatedAt: string, raw: unknown): WeekRecord {
  const data = normalizeWeek(raw);
  const planHours = DAYS.reduce(
    (s, d) => s + sumDay(gridTotals(data, "plan")[d]),
    0
  );
  const actHours = DAYS.reduce(
    (s, d) => s + sumDay(gridTotals(data, "act")[d]),
    0
  );
  const rates = DAYS.map((d) => adherence(data, d)).filter(
    (v): v is number => v !== null
  );
  const todos = DAYS.flatMap((d) =>
    data.days[d].todos.filter((t) => t.t.trim())
  );

  return {
    week,
    updatedAt,
    planHours,
    actHours,
    avgRate: rates.length
      ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
      : null,
    todoDone: todos.filter((t) => t.done).length,
    todoTotal: todos.length,
    data,
  };
}

/** 저장된 주를 최신순으로 가져온다. userId 를 주면 그 사람 것(교사·관리자만 가능). */
export async function listWeekRecords(userId?: string): Promise<WeekRecord[]> {
  const supabase = createClient();
  let target = userId;
  if (!target) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // 로그인 전에 쓴 기록은 이 브라우저에만 있다
      const { listLocalWeeks } = await import("./kairosStore");
      const locals = await listLocalWeeks();
      return locals
        .map((r) => summarize(r.week, r.updated_at, r.data))
        .filter((r) => r.planHours > 0 || r.actHours > 0 || r.todoTotal > 0)
        .sort((a, b) => b.week.localeCompare(a.week));
    }
    target = user.id;
  }

  const { data, error } = await supabase
    .from("kairos_weeks")
    .select("week, data, updated_at")
    .eq("user_id", target)
    .order("week", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as { week: string; data: unknown; updated_at: string }[])
    .map((r) => summarize(r.week, r.updated_at, r.data))
    .filter((r) => r.planHours > 0 || r.actHours > 0 || r.todoTotal > 0);
}
