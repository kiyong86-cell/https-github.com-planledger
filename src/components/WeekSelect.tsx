"use client";

// 주 고르는 칸. 브라우저 기본 표시("2026, 34번째 주") 대신
// "8월 3주"처럼 읽기 쉬운 말로 보여준다.
import { currentWeekValue, shiftWeek, weekLabel } from "@/lib/kairos";

const BACK = 26; // 지난 26주까지
const FORWARD = 4; // 앞으로 4주까지

export default function WeekSelect({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (week: string) => void;
  className?: string;
}) {
  const base = value || currentWeekValue();
  const options: string[] = [];
  for (let i = FORWARD; i >= -BACK; i--) options.push(shiftWeek(base, i));

  // 고른 주가 목록에 없으면(아주 예전 기록) 앞에 넣어준다
  if (!options.includes(base)) options.unshift(base);

  return (
    <select
      value={base}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-md border bg-white px-2 py-1.5 text-sm ${className}`}
    >
      {options.map((w) => (
        <option key={w} value={w}>
          {weekLabel(w, true)}
        </option>
      ))}
    </select>
  );
}
