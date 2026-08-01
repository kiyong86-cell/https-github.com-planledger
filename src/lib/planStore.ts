// 기획안 저장소.
// - 로그인 안 함(기본): 브라우저(IndexedDB)에만 저장 — 회원가입 없이 바로 사용
// - 로그인 함(선택): Supabase에 저장 — 여러 기기에서 같은 문서 사용
import { BusinessPlan, BusinessPlanContent } from "./types";

const DB_NAME = "planledger";
const STORE = "plans";

const CLOUD_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

// ---------- 로그인 여부 ----------

export async function getCurrentUser(): Promise<{
  id: string;
  email: string | null;
} | null> {
  if (!CLOUD_ENABLED) return null;
  try {
    const { createClient } = await import("./supabase/client");
    const {
      data: { user },
    } = await createClient().auth.getUser();
    return user ? { id: user.id, email: user.email ?? null } : null;
  } catch {
    return null;
  }
}

// ---------- 브라우저 저장 (IndexedDB) ----------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
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

async function localList(): Promise<BusinessPlan[]> {
  const all = await tx<BusinessPlan[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

// ---------- 공개 API (로그인 여부에 따라 자동 분기) ----------

export async function listPlans(): Promise<
  Pick<BusinessPlan, "id" | "title" | "updated_at">[]
> {
  const user = await getCurrentUser();
  if (user) {
    const { createClient } = await import("./supabase/client");
    const { data } = await createClient()
      .from("business_plans")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    return data ?? [];
  }
  return (await localList()).map(({ id, title, updated_at }) => ({
    id,
    title,
    updated_at,
  }));
}

export async function getPlan(id: string): Promise<BusinessPlan | null> {
  const user = await getCurrentUser();
  if (user) {
    const { createClient } = await import("./supabase/client");
    const { data } = await createClient()
      .from("business_plans")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (data as BusinessPlan) ?? null;
  }
  const plan = await tx<BusinessPlan | undefined>("readonly", (s) => s.get(id));
  return plan ?? null;
}

export async function createPlan(
  title: string,
  content: BusinessPlanContent
): Promise<BusinessPlan> {
  const user = await getCurrentUser();
  if (user) {
    const { createClient } = await import("./supabase/client");
    const { data, error } = await createClient()
      .from("business_plans")
      .insert({ title, content, user_id: user.id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as BusinessPlan;
  }

  const now = new Date().toISOString();
  const plan: BusinessPlan = {
    id: crypto.randomUUID(),
    title,
    content,
    created_at: now,
    updated_at: now,
  };
  await tx("readwrite", (s) => s.put(plan));
  return plan;
}

export async function updatePlan(
  id: string,
  title: string,
  content: BusinessPlanContent
): Promise<BusinessPlan | null> {
  const user = await getCurrentUser();
  if (user) {
    const { createClient } = await import("./supabase/client");
    const { data, error } = await createClient()
      .from("business_plans")
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return null;
    return data as BusinessPlan;
  }

  const existing = await getPlan(id);
  if (!existing) return null;
  const plan: BusinessPlan = {
    ...existing,
    title,
    content,
    updated_at: new Date().toISOString(),
  };
  await tx("readwrite", (s) => s.put(plan));
  return plan;
}

export async function deletePlan(id: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (user) {
    const { createClient } = await import("./supabase/client");
    const { error } = await createClient()
      .from("business_plans")
      .delete()
      .eq("id", id);
    return !error;
  }
  await tx("readwrite", (s) => s.delete(id));
  return true;
}

// ---------- 로그인 시 브라우저 문서를 계정으로 옮기기 ----------

export async function countLocalPlans(): Promise<number> {
  try {
    return (await localList()).length;
  } catch {
    return 0;
  }
}

/** 브라우저에 저장된 문서를 로그인한 계정으로 복사한다. 성공 시 브라우저 사본은 지운다. */
export async function migrateLocalPlansToCloud(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  const locals = await localList();
  if (locals.length === 0) return 0;

  const { createClient } = await import("./supabase/client");
  const supabase = createClient();

  const rows = locals.map((p) => ({
    title: p.title,
    content: p.content,
    user_id: user.id,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));

  const { error } = await supabase.from("business_plans").insert(rows);
  if (error) throw new Error(error.message);

  await tx("readwrite", (s) => s.clear());
  return locals.length;
}
