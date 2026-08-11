"use client";

// KAIROS 이용 신청 — 사이트에 로그인한 사람이 이름·구분을 적어 신청한다.
// 관리자가 승인해야 실제로 들어갈 수 있다.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SchoolApply({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [requestedRole, setRequestedRole] = useState<"student" | "teacher">(
    "student"
  );
  const [studentNo, setStudentNo] = useState("");
  const [grade, setGrade] = useState("");
  const [klass, setKlass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("이름을 적어주세요.");
      return;
    }

    setSending(true);
    const { error } = await createClient().from("kairos_members").insert({
      user_id: userId,
      email,
      name: name.trim(),
      student_no: studentNo.trim(),
      grade: grade.trim(),
      klass: klass.trim(),
      requested_role: requestedRole,
      role: "pending",
    });

    if (error) {
      // 표가 아직 없으면(설치 전) 무엇을 해야 하는지 바로 알려준다.
      const missingTable =
        error.code === "PGRST205" ||
        error.code === "42P01" ||
        /kairos_members/.test(error.message ?? "");
      setError(
        missingTable
          ? "아직 준비가 끝나지 않았습니다. 관리자가 Supabase에서 kairos.sql을 실행해야 신청할 수 있어요."
          : `신청을 보내지 못했습니다. (${error.message})`
      );
      setSending(false);
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm text-slate-700">이름</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          placeholder="예) 김학생"
        />
      </div>

      <div>
        <span className="mb-1 block text-sm text-slate-700">구분</span>
        <div className="flex gap-2">
          {(
            [
              ["student", "학생"],
              ["teacher", "교사"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRequestedRole(value)}
              className={`flex-1 rounded-md border px-4 py-2 text-sm ${
                requestedRole === value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {requestedRole === "student" && (
        <div className="grid grid-cols-3 gap-2">
          <label className="col-span-3">
            <span className="mb-1 block text-sm text-slate-700">학번</span>
            <input
              value={studentNo}
              onChange={(e) => setStudentNo(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="예) 20261234"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm text-slate-700">학년</span>
            <input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="2"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm text-slate-700">반</span>
            <input
              value={klass}
              onChange={(e) => setKlass(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="3"
            />
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {sending ? "보내는 중..." : "이용 신청하기"}
      </button>
      <p className="text-xs text-slate-400">
        신청하면 관리자가 확인 후 승인합니다. 승인되면 이 화면에서 바로 시간표를
        쓸 수 있어요.
      </p>
    </form>
  );
}
