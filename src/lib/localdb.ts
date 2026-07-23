import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { BusinessPlan, BusinessPlanContent, Receipt } from "./types";

// 모든 데이터는 프로젝트 폴더 안 data/ 에 저장됩니다.
// - data/plans.json    사업계획서
// - data/receipts.json 영수증 목록
// - data/uploads/      영수증 사진 원본
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const PLANS_FILE = path.join(DATA_DIR, "plans.json");
const RECEIPTS_FILE = path.join(DATA_DIR, "receipts.json");

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

// ---------- 영수증 ----------

export function listReceipts(): Receipt[] {
  return readJson<Receipt>(RECEIPTS_FILE).sort(
    (a, b) =>
      b.receipt_date.localeCompare(a.receipt_date) ||
      b.created_at.localeCompare(a.created_at)
  );
}

export function getReceipt(id: string): Receipt | null {
  return readJson<Receipt>(RECEIPTS_FILE).find((r) => r.id === id) ?? null;
}

export function createReceipt(
  input: Omit<Receipt, "id" | "created_at">
): Receipt {
  const receipt: Receipt = {
    ...input,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  const receipts = readJson<Receipt>(RECEIPTS_FILE);
  receipts.push(receipt);
  writeJson(RECEIPTS_FILE, receipts);
  return receipt;
}

export function deleteReceipt(id: string): boolean {
  const receipts = readJson<Receipt>(RECEIPTS_FILE);
  const target = receipts.find((r) => r.id === id);
  if (!target) return false;
  if (target.image_path) {
    const imageFile = path.join(UPLOADS_DIR, target.image_path);
    if (fs.existsSync(imageFile)) fs.unlinkSync(imageFile);
  }
  writeJson(
    RECEIPTS_FILE,
    receipts.filter((r) => r.id !== id)
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
