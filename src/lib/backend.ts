// 데이터 계층: 클라우드 모드(Supabase)와 로컬 모드(data/ 폴더)를 같은 API로 감싼다.
// 모든 함수는 async — 페이지와 API 라우트는 이 모듈만 사용한다.
import { BusinessPlan, BusinessPlanContent, Receipt } from "./types";
import { isCloudMode } from "./mode";
import * as local from "./localdb";

async function cloud() {
  const { createClient } = await import("./supabase/server");
  return createClient();
}

async function cloudUserId(): Promise<string> {
  const supabase = await cloud();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  return user.id;
}

// ---------- 기획안 ----------

export async function listPlans(): Promise<
  Pick<BusinessPlan, "id" | "title" | "updated_at">[]
> {
  if (!isCloudMode()) return local.listPlans();
  const supabase = await cloud();
  const { data, error } = await supabase
    .from("business_plans")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPlan(id: string): Promise<BusinessPlan | null> {
  if (!isCloudMode()) return local.getPlan(id);
  const supabase = await cloud();
  const { data } = await supabase
    .from("business_plans")
    .select("*")
    .eq("id", id)
    .single();
  return (data as BusinessPlan) ?? null;
}

export async function createPlan(
  title: string,
  content: BusinessPlanContent
): Promise<BusinessPlan> {
  if (!isCloudMode()) return local.createPlan(title, content);
  const supabase = await cloud();
  const userId = await cloudUserId();

  const { data, error } = await supabase
    .from("business_plans")
    .insert({ title, content, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as BusinessPlan;
}

export async function updatePlan(
  id: string,
  title: string,
  content: BusinessPlanContent
): Promise<BusinessPlan | null> {
  if (!isCloudMode()) return local.updatePlan(id, title, content);
  const supabase = await cloud();
  const { data, error } = await supabase
    .from("business_plans")
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return data as BusinessPlan;
}

export async function deletePlan(id: string): Promise<boolean> {
  if (!isCloudMode()) return local.deletePlan(id);
  const supabase = await cloud();
  const userId = await cloudUserId();

  // 첨부 사진 파일 정리
  const { data: plan } = await supabase
    .from("business_plans")
    .select("content")
    .eq("id", id)
    .single();
  const images = (plan?.content as { images?: Array<{ file?: string }> })
    ?.images;
  if (Array.isArray(images) && images.length > 0) {
    const paths = images
      .filter((img) => img?.file)
      .map((img) => `${userId}/${img.file}`);
    if (paths.length > 0) await supabase.storage.from("uploads").remove(paths);
  }

  const { error } = await supabase
    .from("business_plans")
    .delete()
    .eq("id", id);
  return !error;
}

// ---------- 영수증 ----------

export async function listReceipts(): Promise<Receipt[]> {
  if (!isCloudMode()) return local.listReceipts();
  const supabase = await cloud();
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .order("receipt_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Receipt[];
}

export async function createReceipt(
  input: Omit<Receipt, "id" | "created_at">
): Promise<Receipt> {
  if (!isCloudMode()) return local.createReceipt(input);
  const supabase = await cloud();
  const userId = await cloudUserId();
  const { data, error } = await supabase
    .from("receipts")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Receipt;
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  if (!isCloudMode()) return local.getReceipt(id);
  const supabase = await cloud();
  const { data } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .single();
  return (data as Receipt) ?? null;
}

export async function deleteReceipt(id: string): Promise<boolean> {
  if (!isCloudMode()) return local.deleteReceipt(id);
  const supabase = await cloud();
  const userId = await cloudUserId();

  const { data: receipt } = await supabase
    .from("receipts")
    .select("image_path")
    .eq("id", id)
    .single();
  if (receipt?.image_path) {
    await supabase.storage
      .from("uploads")
      .remove([`${userId}/${receipt.image_path}`]);
  }

  const { error } = await supabase.from("receipts").delete().eq("id", id);
  return !error;
}

// ---------- 파일(사진) ----------

export async function saveUpload(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  if (!isCloudMode()) return local.saveUpload(buffer, originalName);
  const supabase = await cloud();
  const userId = await cloudUserId();
  const ext = originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf("."))
    : ".bin";
  const stored = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  const { error } = await supabase.storage
    .from("uploads")
    .upload(`${userId}/${stored}`, buffer, {
      contentType: guessContentType(ext),
    });
  if (error) throw new Error(error.message);
  return stored;
}

export async function readUpload(storedName: string): Promise<Buffer | null> {
  if (!isCloudMode()) return local.readUpload(storedName);
  if (
    storedName.includes("/") ||
    storedName.includes("\\") ||
    storedName.includes("..")
  ) {
    return null;
  }
  const supabase = await cloud();
  const userId = await cloudUserId();
  const { data, error } = await supabase.storage
    .from("uploads")
    .download(`${userId}/${storedName}`);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

function guessContentType(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".pdf": "application/pdf",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}
