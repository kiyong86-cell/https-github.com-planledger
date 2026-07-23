"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/business-plan", label: "기획안" },
  { href: "/receipts", label: "영수증" },
  { href: "/support", label: "후원" },
];

// NEXT_PUBLIC_ 환경변수는 빌드 시 클라이언트에도 주입된다
const CLOUD_MODE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-slate-900">
            기획안 &amp; 영수증
          </span>
          <div className="flex gap-4 text-sm">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname === link.href
                    ? "font-medium text-slate-900"
                    : "text-slate-500 hover:text-slate-900"
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        {CLOUD_MODE && (
          <button
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            로그아웃
          </button>
        )}
      </div>
    </nav>
  );
}
