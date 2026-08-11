import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { isTeacherEmail, studentEmail } from "@/lib/school";

export const dynamic = "force-dynamic";

// 학생 계정 만들기 / 비밀번호 바꾸기 — 교사 계정만 호출할 수 있다.
// 서비스 롤 키는 서버에서만 쓰이며 브라우저로 나가지 않는다.

type StudentInput = {
  student_no: string;
  name?: string;
  grade?: string;
  klass?: string;
  password: string;
};

type Result = { student_no: string; ok: boolean; message: string };

async function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const {
    data: { user },
  } = await createServerSupabase().auth.getUser();

  if (!isTeacherEmail(user?.email)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const admin = await adminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let students: StudentInput[] = [];
  try {
    const body = await request.json();
    students = Array.isArray(body?.students) ? body.students : [];
  } catch {
    return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
  }

  if (students.length === 0 || students.length > 300) {
    return NextResponse.json(
      { error: "학생은 한 번에 1~300명까지 등록할 수 있습니다." },
      { status: 400 }
    );
  }

  const results: Result[] = [];

  for (const s of students) {
    const studentNo = String(s.student_no ?? "").trim();
    const password = String(s.password ?? "");

    if (!studentNo || password.length < 6) {
      results.push({
        student_no: studentNo || "(빈 학번)",
        ok: false,
        message: "학번과 6자 이상 비밀번호가 필요합니다.",
      });
      continue;
    }

    const email = studentEmail(studentNo);

    // 이미 있는 학생이면 비밀번호만 바꾼다.
    const { data: existing } = await admin
      .from("kairos_profiles")
      .select("user_id")
      .eq("student_no", studentNo)
      .maybeSingle();

    if (existing?.user_id) {
      const { error } = await admin.auth.admin.updateUserById(existing.user_id, {
        password,
      });
      if (error) {
        results.push({ student_no: studentNo, ok: false, message: error.message });
        continue;
      }
      await admin
        .from("kairos_profiles")
        .update({
          name: s.name ?? "",
          grade: s.grade ?? "",
          klass: s.klass ?? "",
        })
        .eq("user_id", existing.user_id);
      results.push({
        student_no: studentNo,
        ok: true,
        message: "비밀번호를 새로 정했습니다.",
      });
      continue;
    }

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !created?.user) {
      results.push({
        student_no: studentNo,
        ok: false,
        message: error?.message ?? "계정을 만들지 못했습니다.",
      });
      continue;
    }

    const { error: profileError } = await admin.from("kairos_profiles").insert({
      user_id: created.user.id,
      student_no: studentNo,
      name: s.name ?? "",
      grade: s.grade ?? "",
      klass: s.klass ?? "",
    });
    if (profileError) {
      results.push({
        student_no: studentNo,
        ok: false,
        message: profileError.message,
      });
      continue;
    }

    results.push({ student_no: studentNo, ok: true, message: "등록했습니다." });
  }

  return NextResponse.json({ results });
}
