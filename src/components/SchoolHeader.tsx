"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SchoolHeader({
  title,
  showTeacherLink = false,
  showAdminLink = false,
}: {
  title: string;
  showTeacherLink?: boolean;
  showAdminLink?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? ""))
      .catch(() => setEmail(""));
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/school");
    router.refresh();
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/school" className="font-semibold tracking-wide text-slate-900">
            KAIROS
          </Link>
          <span className="text-sm text-slate-400">{title}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          {showTeacherLink && (
            <Link href="/school/teacher" className="hover:text-slate-900">
              학생 현황
            </Link>
          )}
          {showAdminLink && (
            <Link href="/school/admin" className="hover:text-slate-900">
              승인 관리
            </Link>
          )}
          {email && <span className="hidden sm:inline">{email}</span>}
          <button onClick={logout} className="hover:text-slate-900">
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
