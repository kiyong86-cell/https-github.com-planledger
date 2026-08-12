"use client";

// 관리자 화면 — 가입자 전체를 보고 KAIROS 권한을 준다.
// 학생 승인 / 교사 승인 / 관리자 임명 / 거절 / 해제.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SchoolHeader from "@/components/SchoolHeader";
import { createClient } from "@/lib/supabase/client";
import { KairosMember, KairosRole, ROLE_LABEL } from "@/lib/school";

type Person = {
  user_id: string;
  email: string;
  name: string;
  student_no: string;
  grade: string;
  klass: string;
  requested_role: string;
  role: KairosRole | null; // null = KAIROS 신청 안 함
  created_at: string;
};

type Filter = "pending" | "kairos" | "all";

const FILTERS: [Filter, string][] = [
  ["pending", "승인 대기"],
  ["kairos", "KAIROS 사용자"],
  ["all", "전체 가입자"],
];

export default function SchoolAdminClient({ myEmail }: { myEmail: string }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPeople(null);
    const supabase = createClient();
    const [members, profiles] = await Promise.all([
      supabase.from("kairos_members").select("*"),
      supabase.from("profiles").select("id, email, display_name, created_at"),
    ]);

    if (members.error) {
      setError(
        "명단을 불러오지 못했습니다. Supabase에서 kairos.sql이 실행됐는지 확인해주세요."
      );
      setPeople([]);
      return;
    }
    setError(
      profiles.error
        ? "가입자 목록은 아직 보이지 않습니다. supabase/kairos_admin.sql을 한 번 실행해주세요."
        : null
    );

    const byUser = new Map<string, Person>();

    ((profiles.data ?? []) as {
      id: string;
      email: string | null;
      display_name: string | null;
      created_at: string;
    }[]).forEach((p) => {
      byUser.set(p.id, {
        user_id: p.id,
        email: p.email ?? "",
        name: p.display_name ?? "",
        student_no: "",
        grade: "",
        klass: "",
        requested_role: "",
        role: null,
        created_at: p.created_at,
      });
    });

    ((members.data ?? []) as KairosMember[]).forEach((m) => {
      const existing = byUser.get(m.user_id);
      byUser.set(m.user_id, {
        user_id: m.user_id,
        email: m.email || existing?.email || "",
        name: m.name || existing?.name || "",
        student_no: m.student_no,
        grade: m.grade,
        klass: m.klass,
        requested_role: m.requested_role,
        role: m.role,
        created_at: existing?.created_at ?? m.created_at,
      });
    });

    setPeople(
      [...byUser.values()].sort((a, b) => {
        // 승인 대기가 항상 위로
        const rank = (p: Person) => (p.role === "pending" ? 0 : 1);
        return rank(a) - rank(b) || b.created_at.localeCompare(a.created_at);
      })
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setRole(person: Person, role: KairosRole) {
    setBusy(person.user_id);
    setNotice(null);
    const { error } = await createClient()
      .from("kairos_members")
      .upsert(
        {
          user_id: person.user_id,
          email: person.email,
          name: person.name,
          student_no: person.student_no,
          grade: person.grade,
          klass: person.klass,
          requested_role: person.requested_role || "student",
          role,
          approved_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    setBusy(null);

    if (error) {
      setError(`변경하지 못했습니다. (${error.message})`);
      return;
    }
    setError(null);
    setNotice(
      role === "admin"
        ? `${person.email} 을(를) 관리자로 임명했습니다.`
        : `${person.email} → ${ROLE_LABEL[role]} 로 변경했습니다.`
    );
    load();
  }

  const rows =
    people === null
      ? null
      : filter === "pending"
      ? people.filter((p) => p.role === "pending")
      : filter === "kairos"
      ? people.filter(
          (p) => p.role && p.role !== "pending" && p.role !== "rejected"
        )
      : people;

  const pendingCount = people?.filter((p) => p.role === "pending").length ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <SchoolHeader title="관리자" showKairosLink showTeacherLink />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              가입자 · 권한 관리
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              가입한 사람에게 KAIROS 권한을 줍니다. 관리자로 임명하면 이 화면을
              같이 쓸 수 있어요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  filter === value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
                {value === "pending" && pendingCount ? ` (${pendingCount})` : ""}
              </button>
            ))}
            <Link
              href="/admin"
              className="rounded-md border bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              사용 통계
            </Link>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
            {notice}
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="border-b px-3 py-2 text-left">이름</th>
                <th className="border-b px-3 py-2 text-left">이메일</th>
                <th className="border-b px-3 py-2">학번</th>
                <th className="border-b px-3 py-2">학년/반</th>
                <th className="border-b px-3 py-2">신청</th>
                <th className="border-b px-3 py-2">권한</th>
                <th className="border-b px-3 py-2">처리</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    {filter === "pending"
                      ? "승인을 기다리는 신청이 없습니다."
                      : "표시할 사람이 없습니다."}
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const me = p.email.toLowerCase() === myEmail.toLowerCase();
                  return (
                    <tr key={p.user_id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {p.name || "-"}
                        {me && (
                          <span className="ml-1 text-xs text-slate-400">(나)</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{p.email || "-"}</td>
                      <td className="px-3 py-2 text-center">
                        {p.student_no || "-"}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500">
                        {[p.grade, p.klass].filter(Boolean).join("-") || "-"}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500">
                        {p.requested_role === "teacher"
                          ? "교사"
                          : p.requested_role === "student"
                          ? "학생"
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {p.role === null ? (
                          <span className="text-slate-400">신청 안 함</span>
                        ) : (
                          <span
                            className={
                              p.role === "pending"
                                ? "text-amber-600"
                                : p.role === "rejected"
                                ? "text-red-600"
                                : p.role === "admin"
                                ? "text-indigo-700 font-medium"
                                : "text-emerald-700"
                            }
                          >
                            {ROLE_LABEL[p.role]}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap justify-center gap-1">
                          <button
                            disabled={busy === p.user_id || p.role === "student"}
                            onClick={() => setRole(p, "student")}
                            className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-30"
                          >
                            학생
                          </button>
                          <button
                            disabled={busy === p.user_id || p.role === "teacher"}
                            onClick={() => setRole(p, "teacher")}
                            className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-30"
                          >
                            교사
                          </button>
                          <button
                            disabled={busy === p.user_id || p.role === "admin"}
                            onClick={() => {
                              if (
                                confirm(
                                  `${p.email} 을(를) 관리자로 임명합니다.\n이 사람도 가입자 전체와 권한을 관리할 수 있게 됩니다. 진행할까요?`
                                )
                              )
                                setRole(p, "admin");
                            }}
                            className="rounded border px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50 disabled:opacity-30"
                          >
                            관리자
                          </button>
                          <button
                            disabled={
                              busy === p.user_id || p.role === "rejected" || me
                            }
                            onClick={() => setRole(p, "rejected")}
                            className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30"
                            title={me ? "본인 권한은 해제할 수 없습니다" : ""}
                          >
                            해제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          가입자 목록에는 <b>이 사이트에 로그인한 적이 있는 사람</b>이 나타납니다.
          예전에 가입만 하고 최근에 로그인하지 않은 사람은 다음 로그인 때
          목록에 추가됩니다.
        </p>
      </main>
    </div>
  );
}
