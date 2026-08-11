// 서버 전용 — 지금 로그인한 사람이 KAIROS에서 어떤 역할인지 확인한다.
import { KairosMember, KairosRole } from "./school";

export type SchoolSession = {
  userId: string;
  email: string;
  member: KairosMember | null;
  role: KairosRole | null;
  isAdmin: boolean;
};

/** 관리자 이메일 — 첫 관리자가 승인 없이 들어올 수 있게 해주는 값. */
function adminEmail(): string {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

/** 로그인하지 않았으면 null. */
export async function getSchoolSession(): Promise<SchoolSession | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const { createClient } = await import("./supabase/server");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("kairos_members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const member = (data as KairosMember | null) ?? null;
  const email = (user.email ?? "").toLowerCase();
  const isAdmin = member?.role === "admin" || (!!email && email === adminEmail());

  return {
    userId: user.id,
    email: user.email ?? "",
    member,
    role: isAdmin ? "admin" : member?.role ?? null,
    isAdmin,
  };
}
