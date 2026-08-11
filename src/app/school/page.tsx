import { redirect } from "next/navigation";
import SchoolLogin from "@/components/SchoolLogin";
import { isTeacherEmail } from "@/lib/school";
import { isCloudMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

// 로그인 상태면 알맞은 화면으로 보내고, 아니면 로그인 폼을 띄운다.
export default async function SchoolEntryPage() {
  if (!isCloudMode()) {
    return (
      <div className="min-h-screen bg-slate-50 p-10 text-sm text-slate-500">
        학교 전용 구역은 계정 기능이 켜져 있어야 사용할 수 있습니다.
      </div>
    );
  }

  const { createClient } = await import("@/lib/supabase/server");
  const {
    data: { user },
  } = await createClient().auth.getUser();

  if (user) {
    redirect(isTeacherEmail(user.email) ? "/school/teacher" : "/school/kairos");
  }

  return <SchoolLogin />;
}
