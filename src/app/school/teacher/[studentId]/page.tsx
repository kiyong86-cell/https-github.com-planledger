import { redirect } from "next/navigation";
import RecordsClient from "@/components/RecordsClient";
import { getSchoolSession } from "@/lib/schoolAuth";
import { isStaff } from "@/lib/school";

export const dynamic = "force-dynamic";

// 교사·관리자가 보는 학생 한 명의 주간 기록 + 피드백
export default async function StudentRecordsPage({
  params,
  searchParams,
}: {
  params: { studentId: string };
  searchParams: { name?: string };
}) {
  const session = await getSchoolSession();
  if (!session) redirect("/school");
  if (!isStaff(session.role)) redirect("/school");

  return (
    <RecordsClient
      studentId={params.studentId}
      studentName={searchParams.name || "학생"}
      canWriteFeedback
      myName={session.member?.name || session.email}
      isStaff
      isAdmin={session.isAdmin}
    />
  );
}
