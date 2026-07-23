import { NextResponse } from "next/server";
import { isCloudMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "export_docx",
  "export_hwpx",
  "export_pdf",
  "plan_created",
]);

export async function POST(request: Request) {
  // 로컬 모드(개인용)에서는 통계를 남기지 않는다.
  if (!isCloudMode()) return NextResponse.json({ ok: true });

  try {
    const { type } = await request.json();
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 로그인하지 않았으면 조용히 무시(통계에 안 남김)
    if (!user) return NextResponse.json({ ok: true });

    await supabase.from("events").insert({ type, user_id: user.id });
    return NextResponse.json({ ok: true });
  } catch {
    // 통계 실패가 사용자 경험을 막지 않도록 항상 ok 반환
    return NextResponse.json({ ok: true });
  }
}
