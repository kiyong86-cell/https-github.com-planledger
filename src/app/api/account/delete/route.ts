import { NextResponse } from "next/server";
import { isCloudMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

// 회원 스스로 탈퇴: 본인 데이터·파일 삭제 후 계정 삭제.
// 계정(auth.users) 완전 삭제에는 service_role 키가 필요하다.
// 키가 없으면 데이터만 삭제하고 계정 껍데기는 남는다(로그인은 되지만 데이터 없음).
export async function POST() {
  if (!isCloudMode()) {
    return NextResponse.json(
      { error: "로컬 모드에는 계정이 없습니다." },
      { status: 400 }
    );
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const userId = user.id;

    // 1) 업로드한 파일 삭제 (uploads/{userId}/*)
    const { data: files } = await supabase.storage
      .from("uploads")
      .list(userId);
    if (files && files.length > 0) {
      await supabase.storage
        .from("uploads")
        .remove(files.map((f) => `${userId}/${f.name}`));
    }

    // 2) 본인 데이터 삭제 (RLS로 본인 것만 삭제 가능)
    await supabase.from("business_plans").delete().eq("user_id", userId);

    // 3) 계정 자체 삭제 — service_role 키가 있으면 완전 삭제(연관 행 cascade)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let fullyDeleted = false;
    if (serviceKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient: createAdmin } = await import(
        "@supabase/supabase-js"
      );
      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKey
      );
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (!error) fullyDeleted = true;
    } else {
      // service_role 없으면 프로필만이라도 지운다
      await supabase.from("profiles").delete().eq("id", userId);
    }

    // 세션 로그아웃
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true, fullyDeleted });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "탈퇴 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
