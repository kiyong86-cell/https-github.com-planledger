// 학교 전용 구역(/school) 공통 규칙.
// 사이트 계정(이메일)은 누구나 만들 수 있고, KAIROS는 관리자가 승인한 사람만 들어간다.

export type KairosRole =
  | "pending" // 신청함, 승인 대기
  | "student"
  | "teacher"
  | "admin"
  | "rejected";

export type KairosMember = {
  user_id: string;
  email: string;
  name: string;
  grade: string;
  klass: string;
  requested_role: "student" | "teacher";
  role: KairosRole;
  created_at: string;
  approved_at: string | null;
};

/** 교사·관리자 — 학생 기록을 볼 수 있는 사람 */
export function isStaff(role: KairosRole | null | undefined): boolean {
  return role === "teacher" || role === "admin";
}

/** KAIROS 화면에 들어갈 수 있는 사람 */
export function isApproved(role: KairosRole | null | undefined): boolean {
  return role === "student" || role === "teacher" || role === "admin";
}

export const ROLE_LABEL: Record<KairosRole, string> = {
  pending: "승인 대기",
  student: "학생",
  teacher: "교사",
  admin: "관리자",
  rejected: "거절됨",
};
