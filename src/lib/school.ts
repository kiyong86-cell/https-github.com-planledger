// 학교 전용 구역(/school) 공통 규칙.
// 학생은 이메일 대신 학번으로 로그인한다. Supabase Auth는 이메일 형식을 요구하므로
// 내부적으로 "학번@<도메인>" 형태로 바꿔서 쓴다. 학생에게는 보이지 않는다.

export const STUDENT_EMAIL_DOMAIN = "kairos.school";

export function studentEmail(studentNo: string): string {
  return `${studentNo.trim().toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
}

export function studentNoFromEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [id, domain] = email.split("@");
  return domain === STUDENT_EMAIL_DOMAIN ? id : email;
}

/** 교사 계정 이메일 목록. 쉼표로 구분해 환경변수에 넣는다. */
export function teacherEmails(): string[] {
  return (process.env.SCHOOL_TEACHER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isTeacherEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return teacherEmails().includes(email.toLowerCase());
}

export type StudentProfile = {
  user_id: string;
  student_no: string;
  name: string;
  grade: string;
  klass: string;
};
