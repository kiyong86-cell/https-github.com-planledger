import { redirect } from "next/navigation";
import SchoolTeacherClient from "@/components/SchoolTeacherClient";
import { getSchoolSession } from "@/lib/schoolAuth";
import { isStaff } from "@/lib/school";

export const dynamic = "force-dynamic";

export default async function SchoolTeacherPage() {
  const session = await getSchoolSession();
  if (!session) redirect("/school");
  if (!isStaff(session.role)) redirect("/school");

  return <SchoolTeacherClient isAdmin={session.isAdmin} />;
}
