import Link from "next/link";
import { redirect } from "next/navigation";
import InstallAppButton from "@/components/InstallAppButton";
import SchoolApply from "@/components/SchoolApply";
import SchoolHeader from "@/components/SchoolHeader";
import { getSchoolSession } from "@/lib/schoolAuth";
import { isCloudMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-md px-4 py-14">
        <h1 className="mb-1 text-2xl font-semibold tracking-wide text-slate-900">
          정직이들
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          학교 전용 주간 시간 계획표입니다.
        </p>
        {children}
      </main>
    </div>
  );
}

export default async function SchoolEntryPage() {
  if (!isCloudMode()) {
    return (
      <Shell>
        <p className="text-sm text-slate-500">
          계정 기능이 켜져 있어야 사용할 수 있습니다.
        </p>
      </Shell>
    );
  }

  const session = await getSchoolSession();

  // 1) 로그인 전 — 사이트 계정으로 먼저 로그인/가입
  if (!session) {
    return (
      <Shell>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-sm leading-relaxed text-slate-600">
            먼저 본인 이메일로 로그인해주세요. 계정이 없으면 같은 화면에서
            가입할 수 있습니다. 로그인한 뒤 정직이들 이용 신청을 하면 관리자가
            승인해 드립니다.
          </p>
          <Link
            href="/login?next=/school"
            className="mt-5 block rounded-md bg-slate-900 py-2 text-center text-sm font-medium text-white hover:bg-slate-700"
          >
            로그인 · 가입하러 가기
          </Link>
          <InstallAppButton />
        </div>
      </Shell>
    );
  }

  // 2) 승인된 사람 — 각자 화면으로
  if (session.isAdmin) redirect("/school/admin");
  if (session.role === "teacher") redirect("/school/teacher");
  if (session.role === "student") redirect("/school/kairos");

  // 3) 아직 신청 안 함
  if (!session.member) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SchoolHeader title="이용 신청" />
        <main className="mx-auto max-w-md px-4 py-10">
          <h1 className="mb-1 text-xl font-semibold text-slate-900">
            정직이들 이용 신청
          </h1>
          <p className="mb-5 text-sm text-slate-500">
            {session.email} 계정으로 신청합니다.
          </p>
          <SchoolApply userId={session.userId} email={session.email} />
        </main>
      </div>
    );
  }

  // 4) 신청은 했지만 아직 승인 전이거나 거절됨
  const rejected = session.member.role === "rejected";
  return (
    <div className="min-h-screen bg-slate-50">
      <SchoolHeader title="승인 대기" />
      <main className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-lg border bg-white p-6 text-center shadow-sm">
          <p className="text-3xl">{rejected ? "🚫" : "⏳"}</p>
          <h1 className="mt-3 text-lg font-semibold text-slate-900">
            {rejected ? "이용이 승인되지 않았습니다" : "승인을 기다리는 중입니다"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {rejected
              ? "담당 선생님이나 관리자에게 문의해주세요."
              : "관리자가 확인하면 바로 사용할 수 있습니다. 승인된 뒤 이 화면을 새로고침하세요."}
          </p>
          <dl className="mt-5 space-y-1 border-t pt-4 text-left text-xs text-slate-500">
            <div className="flex justify-between">
              <dt>이름</dt>
              <dd className="text-slate-900">{session.member.name || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>신청 구분</dt>
              <dd className="text-slate-900">
                {session.member.requested_role === "teacher" ? "교사" : "학생"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>이메일</dt>
              <dd className="text-slate-900">{session.email}</dd>
            </div>
          </dl>
          <InstallAppButton />
        </div>
      </main>
    </div>
  );
}
