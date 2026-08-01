"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./LangProvider";
import LangToggle from "./LangToggle";

export default function Nav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/business-plan", label: t("nav.plans") },
    { href: "/convert", label: t("nav.convert") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-slate-900">{t("nav.brand")}</span>
          <div className="flex gap-4 text-sm">
            {links.map((link) => (
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
        <LangToggle />
      </div>
    </nav>
  );
}
