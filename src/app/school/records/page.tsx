import { redirect } from "next/navigation";
import RecordsClient from "@/components/RecordsClient";
import { getSchoolSession } from "@/lib/schoolAuth";
import { isApproved, isStaff } from "@/lib/school";

export const dynamic = "force-dynamic";

// 내가 저장한 주간 기록 모아보기
export default async function MyRecordsPage() {
  const session = await getSchoolSession();
  if (!session) redirect("/school");
  if (!isApproved(session.role)) redirect("/school");

  return (
    <RecordsClient
      canWriteFeedback={false}
      myName={session.member?.name || session.email}
      isStaff={isStaff(session.role)}
      isAdmin={session.isAdmin}
    />
  );
}
