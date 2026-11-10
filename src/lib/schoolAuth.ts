// 서버 전용 — 지금 로그인한 사람이 KAIROS에서 어떤 역할인지 확인한다.
import { KairosMember, KairosRole } from "./school";

export type SchoolSession = {
  userId: string;
  email: string;
  member: KairosMember | null;
  role: KairosRole | null;
  isAdmin: boolean;
};

/** 정해진 시간 안에 끝나지 않으면 null 을 돌려준다. */
async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** 관리자 이메일 — 첫 관리자가 승인 없이 들어올 수 있게 해주는 값. */
function adminEmail(): string {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

/** 로그인하지 않았으면 null. */
export async function getSchoolSession(): Promise<SchoolSession | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const { createClient } = await import("./supabase/server");
  const supabase = createClient();

  // 데이터베이스가 멈췄을 때 화면이 끝없이 기다리지 않도록 시간 제한을 둔다.
  const user = await withTimeout(
    supabase.auth
      .getUser()
      .then(({ data }) => data.user)
      .catch(() => null),
    5000
  );
  if (!user) return null;

  const data = await withTimeout(
    Promise.resolve(
      supabase.from("kairos_members").select("*").eq("user_id", user.id).maybeSingle()
    )
      .then((r) => r.data)
      .catch(() => null),
    5000
  );

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
