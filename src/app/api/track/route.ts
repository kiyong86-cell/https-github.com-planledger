import { NextResponse } from "next/server";
import { isCloudMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "export_docx",
  "export_hwpx",
  "export_pdf",
  "plan_created",
  "convert_docx",
]);

// 익명 사용 통계. 어떤 기능이 몇 번 쓰였는지만 기록하며,
// 이용자를 식별할 수 있는 정보나 문서 내용은 저장하지 않는다.
export async function POST(request: Request) {
  if (!isCloudMode()) return NextResponse.json({ ok: true });

  try {
    const { type } = await request.json();
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    await supabase.from("events").insert({ type, user_id: null });

    return NextResponse.json({ ok: true });
  } catch {
    // 통계 실패가 사용자 경험을 막지 않도록 항상 ok 반환
    return NextResponse.json({ ok: true });
  }
}
