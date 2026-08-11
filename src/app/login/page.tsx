"use client";

// 선택 로그인 — 로그인 없이도 사이트를 쓸 수 있고,
// 여러 기기에서 문서를 보고 싶은 사람만 가입한다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useI18n } from "@/components/LangProvider";
import { createClient } from "@/lib/supabase/client";
import { countLocalPlans, migrateLocalPlansToCloud } from "@/lib/planStore";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    countLocalPlans().then(setLocalCount).catch(() => setLocalCount(0));
  }, []);

  // 로그인 성공 후: 브라우저에 있던 문서를 계정으로 옮기고 목록으로 이동
  async function afterSignIn() {
    try {
      const moved = await migrateLocalPlansToCloud();
      if (moved > 0) {
        alert(t("auth.migrated").replace("{n}", String(moved)));
      }
    } catch {
      // 이전 실패해도 로그인 자체는 계속 진행
    }
    try {
      const { migrateLocalWeeksToCloud } = await import("@/lib/kairosStore");
      await migrateLocalWeeksToCloud();
    } catch {
      // KAIROS 주간 데이터 이전 실패도 로그인을 막지 않는다
    }
    router.push("/business-plan");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "signup" && !agreed) {
      setError(t("auth.agreeRequired"));
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(t("auth.invalidCred"));
        setLoading(false);
        return;
      }
      await afterSignIn();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        await afterSignIn();
        return;
      }
      setMessage(t("auth.confirmSent"));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-slate-900">
            {mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}
          </h1>
          <p className="mb-6 text-sm text-slate-500">{t("auth.why")}</p>

          {mode === "signup" && localCount > 0 && (
            <p className="mb-4 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800">
              {t("auth.willMigrate").replace("{n}", String(localCount))}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-700">
                {t("auth.email")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">
                {t("auth.password")}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder={t("auth.passwordPlaceholder")}
              />
            </div>

            {mode === "signup" && (
              <label className="flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-slate-900 underline"
                  >
                    {t("auth.agreeLink")}
                  </Link>
                  {t("auth.agreeSuffix")}
                </span>
              </label>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading
                ? t("auth.processing")
                : mode === "login"
                  ? t("auth.loginBtn")
                  : t("auth.signupBtn")}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setMessage(null);
            }}
            className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-900"
          >
            {mode === "login" ? t("auth.toSignup") : t("auth.toLogin")}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/business-plan"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            {t("auth.skip")}
          </Link>
        </div>
      </main>
    </div>
  );
}
