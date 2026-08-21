// KAIROS 주간 데이터 저장소. planStore.ts와 같은 방식이다.
// - 로그인 안 함(기본): 브라우저(IndexedDB)에만 저장 — 회원가입 없이 바로 사용
// - 로그인 함(선택): Supabase에 저장 — 여러 기기에서 같은 주 계획을 이어서 사용
import { getCurrentUser } from "./planStore";
import { normalizeWeek, WeekData } from "./kairos";

const DB_NAME = "planledger-kairos";
const STORE = "weeks";

type Row = { week: string; data: WeekData; updated_at: string };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "week" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

/** 해당 주 데이터를 불러온다. 없으면 null. */
export async function loadWeek(week: string): Promise<WeekData | null> {
  const user = await getCurrentUser();
  if (user) {
    const { createClient } = await import("./supabase/client");
    const { data } = await createClient()
      .from("kairos_weeks")
      .select("data")
      .eq("week", week)
      .maybeSingle();
    return data ? normalizeWeek(data.data) : null;
  }
  try {
    const row = await tx<Row | undefined>("readonly", (s) => s.get(week));
    return row ? normalizeWeek(row.data) : null;
  } catch {
    return null;
  }
}

export async function saveWeek(week: string, data: WeekData): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    const { createClient } = await import("./supabase/client");
    const { error } = await createClient()
      .from("kairos_weeks")
      .upsert(
        {
          user_id: user.id,
          week,
          data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,week" }
      );
    if (error) throw new Error(error.message);
    return;
  }
  await tx("readwrite", (s) =>
    s.put({ week, data, updated_at: new Date().toISOString() })
  );
}

/** 브라우저에 저장된 주간 기록 전체 (로그인 전에 쓴 것) */
export async function listLocalWeeks(): Promise<
  { week: string; data: WeekData; updated_at: string }[]
> {
  try {
    return await tx<Row[]>("readonly", (s) => s.getAll());
  } catch {
    return [];
  }
}

/** 로그인할 때 브라우저에 있던 주간 데이터를 계정으로 옮긴다. */
export async function migrateLocalWeeksToCloud(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  let locals: Row[] = [];
  try {
    locals = await tx<Row[]>("readonly", (s) => s.getAll());
  } catch {
    return 0;
  }
  if (locals.length === 0) return 0;

  const { createClient } = await import("./supabase/client");
  const { error } = await createClient()
    .from("kairos_weeks")
    .upsert(
      locals.map((r) => ({
        user_id: user.id,
        week: r.week,
        data: r.data,
        updated_at: r.updated_at,
      })),
      { onConflict: "user_id,week" }
    );
  if (error) throw new Error(error.message);

  await tx("readwrite", (s) => s.clear());
  return locals.length;
}
