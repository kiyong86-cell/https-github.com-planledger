import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { BusinessPlan, BusinessPlanContent } from "./types";

// 모든 데이터는 프로젝트 폴더 안 data/ 에 저장됩니다.
// - data/plans.json    기획안
// - data/uploads/      첨부 사진 원본
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const PLANS_FILE = path.join(DATA_DIR, "plans.json");

function ensureDirs() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function readJson<T>(file: string): T[] {
  ensureDirs();
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T[];
  } catch {
    return [];
  }
}

function writeJson<T>(file: string, rows: T[]) {
  ensureDirs();
  fs.writeFileSync(file, JSON.stringify(rows, null, 2), "utf-8");
}

// ---------- 사업계획서 ----------

export function listPlans(): BusinessPlan[] {
  return readJson<BusinessPlan>(PLANS_FILE).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );
}

export function getPlan(id: string): BusinessPlan | null {
  return readJson<BusinessPlan>(PLANS_FILE).find((p) => p.id === id) ?? null;
}

export function createPlan(
  title: string,
  content: BusinessPlanContent
): BusinessPlan {
  const now = new Date().toISOString();
  const plan: BusinessPlan = {
    id: randomUUID(),
    title,
    content,
    created_at: now,
    updated_at: now,
  };
  const plans = readJson<BusinessPlan>(PLANS_FILE);
  plans.push(plan);
  writeJson(PLANS_FILE, plans);
  return plan;
}

export function updatePlan(
  id: string,
  title: string,
  content: BusinessPlanContent
): BusinessPlan | null {
  const plans = readJson<BusinessPlan>(PLANS_FILE);
  const plan = plans.find((p) => p.id === id);
  if (!plan) return null;
  plan.title = title;
  plan.content = content;
  plan.updated_at = new Date().toISOString();
  writeJson(PLANS_FILE, plans);
  return plan;
}

export function deletePlan(id: string): boolean {
  const plans = readJson<BusinessPlan>(PLANS_FILE);
  const target = plans.find((p) => p.id === id);
  if (!target) return false;

  // 기획안에 첨부된 사진 파일도 함께 정리
  const images = (target.content as { images?: Array<{ file?: string }> })
    ?.images;
  if (Array.isArray(images)) {
    for (const img of images) {
      if (img?.file) deleteUpload(img.file);
    }
  }

  writeJson(
    PLANS_FILE,
    plans.filter((p) => p.id !== id)
  );
  return true;
}


// ---------- 이미지 파일 ----------

export function saveUpload(buffer: Buffer, originalName: string): string {
  ensureDirs();
  const ext = path.extname(originalName) || ".bin";
  const stored = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, stored), buffer);
  return stored;
}

export function deleteUpload(storedName: string) {
  if (
    storedName.includes("/") ||
    storedName.includes("\\") ||
    storedName.includes("..")
  ) {
    return;
  }
  const file = path.join(UPLOADS_DIR, storedName);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

export function readUpload(storedName: string): Buffer | null {
  // 경로 탈출 방지: 파일명만 허용
  if (storedName.includes("/") || storedName.includes("\\") || storedName.includes("..")) {
    return null;
  }
  const file = path.join(UPLOADS_DIR, storedName);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}
