// 교사가 학생의 한 주 기록에 남기는 피드백.
// 쓰기는 교사·관리자만, 읽기는 본인(학생)과 교사·관리자.
import { createClient } from "./supabase/client";

export type Feedback = {
  student_id: string;
  week: string;
  teacher_name: string;
  text: string;
  updated_at: string;
};

/** 학생 한 명의 특정 주 피드백 */
export async function loadFeedback(
  studentId: string,
  week: string
): Promise<Feedback | null> {
  const { data } = await createClient()
    .from("kairos_feedback")
    .select("student_id, week, teacher_name, text, updated_at")
    .eq("student_id", studentId)
    .eq("week", week)
    .maybeSingle();
  return (data as Feedback) ?? null;
}

/** 내(학생) 피드백 — 로그인한 본인 것을 가져온다. */
export async function loadMyFeedback(week: string): Promise<Feedback | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return loadFeedback(user.id, week);
}

/** 그 주에 피드백이 있는 학생 목록 (교사 화면에서 한 번에 불러온다) */
export async function loadFeedbackForWeek(
  week: string
): Promise<Map<string, Feedback>> {
  const { data } = await createClient()
    .from("kairos_feedback")
    .select("student_id, week, teacher_name, text, updated_at")
    .eq("week", week);
  const map = new Map<string, Feedback>();
  ((data ?? []) as Feedback[]).forEach((f) => map.set(f.student_id, f));
  return map;
}

/** 교사가 피드백을 쓰거나 고친다. */
export async function saveFeedback(
  studentId: string,
  week: string,
  text: string,
  teacherName: string
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("kairos_feedback").upsert(
    {
      student_id: studentId,
      week,
      text,
      teacher_id: user?.id ?? null,
      teacher_name: teacherName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,week" }
  );
  if (error) throw new Error(error.message);
}
