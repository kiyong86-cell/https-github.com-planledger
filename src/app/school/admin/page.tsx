import { redirect } from "next/navigation";
import SchoolAdminClient from "@/components/SchoolAdminClient";
import { getSchoolSession } from "@/lib/schoolAuth";

export const dynamic = "force-dynamic";

export default async function SchoolAdminPage() {
  const session = await getSchoolSession();
  if (!session) redirect("/school");
  if (!session.isAdmin) redirect("/school");

  return <SchoolAdminClient myEmail={session.email} />;
}
