"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/LangProvider";
import LangToggle from "@/components/LangToggle";

// 로그인 성공 시 profiles 테이블에 이름/이메일을 동기화한다.
async function syncProfile(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    display_name: (user.user_metadata?.display_name as string) || null,
  });
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "signup" && !agreed) {
      setError(t("login.agreeRequired"));
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
        setError(
          error.message === "Invalid login credentials"
            ? t("login.invalidCred")
            : error.message
        );
        setLoading(false);
        return;
      }
      await syncProfile(supabase);
      router.push("/");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        await syncProfile(supabase);
        router.push("/");
        router.refresh();
        return;
      }

      setMessage(t("login.confirmSent"));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">
            {t("app.name")}
          </h1>
          <LangToggle />
        </div>
        <p className="mb-6 text-sm text-slate-500">
          {mode === "login" ? t("login.continue") : t("login.createAccount")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm text-slate-700">
                {t("login.name")}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder={t("login.namePlaceholder")}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-slate-700">
              {t("login.email")}
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
              {t("login.password")}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder={t("login.passwordPlaceholder")}
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
                {t("login.agreePrefix")}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-slate-900 underline"
                >
                  {t("login.agreeLink")}
                </Link>
                {t("login.agreeSuffix")}
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
              ? t("login.processing")
              : mode === "login"
                ? t("login.loginBtn")
                : t("login.signupBtn")}
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
          {mode === "login" ? t("login.toSignup") : t("login.toLogin")}
        </button>
      </div>
    </div>
  );
}
