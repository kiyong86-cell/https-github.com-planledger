"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { studentNoFromEmail } from "@/lib/school";

export default function SchoolHeader({ title }: { title: string }) {
  const router = useRouter();
  const [who, setWho] = useState("");

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setWho(studentNoFromEmail(data.user?.email)))
      .catch(() => setWho(""));
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/school");
    router.refresh();
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <span className="font-semibold tracking-wide text-slate-900">
          KAIROS <span className="text-sm font-normal text-slate-400">{title}</span>
        </span>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          {who && <span>{who}</span>}
          <button onClick={logout} className="hover:text-slate-900">
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
