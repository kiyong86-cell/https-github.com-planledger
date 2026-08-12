"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "./LangProvider";
import LangToggle from "./LangToggle";
import { getCurrentUser } from "@/lib/planStore";

const CLOUD_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [kairosOk, setKairosOk] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setEmail(u?.email ?? null))
      .catch(() => setEmail(null))
      .finally(() => setChecked(true));
  }, [pathname]);

  // KAIROS는 승인받은 사람에게만 메뉴에 보인다.
  useEffect(() => {
    if (!CLOUD_ENABLED) return;
    let alive = true;
    (async () => {
      const user = await getCurrentUser();
      if (!user) {
        if (alive) setKairosOk(false);
        return;
      }
      // 관리자(제작자)는 신청 기록이 없어도 항상 보인다.
      if (
        ADMIN_EMAIL &&
        user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      ) {
        if (alive) setKairosOk(true);
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const { data } = await createClient()
        .from("kairos_members")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const role = data?.role as string | undefined;
      if (alive) setKairosOk(role === "student" || role === "teacher" || role === "admin");
    })().catch(() => {
      if (alive) setKairosOk(false);
    });
    return () => {
      alive = false;
    };
  }, [pathname]);

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/business-plan", label: t("nav.plans") },
    { href: "/convert", label: t("nav.convert") },
    ...(kairosOk ? [{ href: "/school", label: "KAIROS" }] : []),
    { href: "/contact", label: t("nav.contact") },
  ];

  async function handleLogout() {
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    setEmail(null);
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="font-semibold text-slate-900">{t("nav.brand")}</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap ${
                  pathname === link.href
                    ? "font-medium text-slate-900"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <LangToggle />
          {CLOUD_ENABLED &&
            checked &&
            (email ? (
              <button
                onClick={handleLogout}
                className="text-sm text-slate-500 hover:text-slate-900"
                title={email}
              >
                {t("nav.logout")}
              </button>
            ) : (
              <Link
                href="/login"
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                {t("nav.login")}
              </Link>
            ))}
        </div>
      </div>
    </nav>
  );
}
