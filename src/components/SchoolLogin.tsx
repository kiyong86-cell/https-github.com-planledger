"use client";

// 학생은 학번 + 비밀번호로, 교사는 이메일 + 비밀번호로 로그인한다.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { studentEmail } from "@/lib/school";

export default function SchoolLogin() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // "@"가 있으면 교사 이메일, 없으면 학번으로 본다.
    const email = id.includes("@") ? id.trim() : studentEmail(id);
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("학번(또는 이메일)이나 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }
    router.push("/school");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-1 text-2xl font-semibold tracking-wide text-slate-900">
          KAIROS
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          학교 전용 주간 시간 계획표입니다. 선생님께 받은 학번과 비밀번호로
          들어오세요.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-sm text-slate-700">학번</label>
            <input
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="예) 20261234"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "확인 중..." : "들어가기"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400">
          비밀번호를 잊었으면 담당 선생님께 말씀드리세요. 선생님이 새 비밀번호로
          바꿔줄 수 있습니다.
        </p>
      </main>
    </div>
  );
}
