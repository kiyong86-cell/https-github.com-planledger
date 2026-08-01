// 기획안 브라우저 저장소 (IndexedDB).
// 회원가입 없이 사용 — 데이터는 사용자의 브라우저 안에만 저장된다.
import { BusinessPlan, BusinessPlanContent } from "./types";

const DB_NAME = "planledger";
const STORE = "plans";

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

export async function listPlans(): Promise<
  Pick<BusinessPlan, "id" | "title" | "updated_at">[]
> {
  const all = await tx<BusinessPlan[]>("readonly", (s) => s.getAll());
  return all
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(({ id, title, updated_at }) => ({ id, title, updated_at }));
}

export async function getPlan(id: string): Promise<BusinessPlan | null> {
  const plan = await tx<BusinessPlan | undefined>("readonly", (s) => s.get(id));
  return plan ?? null;
}

export async function createPlan(
  title: string,
  content: BusinessPlanContent
): Promise<BusinessPlan> {
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
  await tx("readwrite", (s) => s.delete(id));
  return true;
}
