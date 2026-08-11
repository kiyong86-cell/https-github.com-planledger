"use client";

// 관리자 화면 — KAIROS 이용 신청을 교사/학생으로 승인하거나 거절한다.
import { useCallback, useEffect, useState } from "react";
import SchoolHeader from "@/components/SchoolHeader";
import { createClient } from "@/lib/supabase/client";
import { KairosMember, KairosRole, ROLE_LABEL } from "@/lib/school";

const FILTERS: [string, string][] = [
  ["pending", "승인 대기"],
  ["all", "전체"],
];

export default function SchoolAdminClient() {
  const [members, setMembers] = useState<KairosMember[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMembers(null);
    const { data, error } = await createClient()
      .from("kairos_members")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError("명단을 불러오지 못했습니다. Supabase 설정(kairos.sql)을 확인해주세요.");
      setMembers([]);
      return;
    }
    setError(null);
    setMembers((data ?? []) as KairosMember[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setRole(member: KairosMember, role: KairosRole) {
    setBusy(member.user_id);
    const { error } = await createClient()
      .from("kairos_members")
      .update({
        role,
        approved_at: role === "pending" ? null : new Date().toISOString(),
      })
      .eq("user_id", member.user_id);
    setBusy(null);
    if (error) {
      setError("변경하지 못했습니다. 관리자 계정인지 확인해주세요.");
      return;
    }
    load();
  }

  const rows =
    members === null
      ? null
      : filter === "pending"
      ? members.filter((m) => m.role === "pending")
      : members;

  return (
    <div className="min-h-screen bg-slate-50">
      <SchoolHeader title="승인 관리" showTeacherLink showAdminLink={false} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              KAIROS 이용 승인
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              신청한 사람을 교사 또는 학생으로 승인하면 그때부터 들어올 수
              있습니다.
            </p>
          </div>
          <div className="flex gap-2">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value as "pending" | "all")}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  filter === value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
                {value === "pending" && members
                  ? ` (${members.filter((m) => m.role === "pending").length})`
                  : ""}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
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
                <th className="border-b px-3 py-2">현재 상태</th>
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
                      : "아직 신청한 사람이 없습니다."}
                  </td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.user_id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {m.name || "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{m.email}</td>
                    <td className="px-3 py-2 text-center">{m.student_no || "-"}</td>
                    <td className="px-3 py-2 text-center text-slate-500">
                      {[m.grade, m.klass].filter(Boolean).join("-") || "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {m.requested_role === "teacher" ? "교사" : "학생"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={
                          m.role === "pending"
                            ? "text-amber-600"
                            : m.role === "rejected"
                            ? "text-red-600"
                            : "text-emerald-700"
                        }
                      >
                        {ROLE_LABEL[m.role]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-center gap-1">
                        <button
                          disabled={busy === m.user_id || m.role === "student"}
                          onClick={() => setRole(m, "student")}
                          className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-30"
                        >
                          학생 승인
                        </button>
                        <button
                          disabled={busy === m.user_id || m.role === "teacher"}
                          onClick={() => setRole(m, "teacher")}
                          className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-30"
                        >
                          교사 승인
                        </button>
                        <button
                          disabled={busy === m.user_id || m.role === "rejected"}
                          onClick={() => setRole(m, "rejected")}
                          className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30"
                        >
                          거절
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          학생·교사에게 알려줄 주소: <b>planledger.co.kr/school</b> — 각자
          이메일로 가입하고 이용 신청을 하면 이 화면에 뜹니다.
        </p>
      </main>
    </div>
  );
}
