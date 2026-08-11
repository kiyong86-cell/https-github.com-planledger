import { redirect } from "next/navigation";
import KairosClient from "@/components/KairosClient";
import { getSchoolSession } from "@/lib/schoolAuth";
import { isApproved, isStaff } from "@/lib/school";

export const dynamic = "force-dynamic";

export default async function KairosPage() {
  const session = await getSchoolSession();
  if (!session) redirect("/school");
  if (!isApproved(session.role)) redirect("/school");

  return <KairosClient isStaff={isStaff(session.role)} />;
}
