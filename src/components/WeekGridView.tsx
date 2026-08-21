"use client";

// 저장된 주의 24시간 표를 보기 전용으로 그대로 보여준다.
// (내 기록, 교사가 보는 학생 기록에서 사용)
import {
  CATS,
  CAT_COLOR,
  DAY_KO,
  DAYS,
  END_HOUR,
  fmt,
  GridMode,
  gridTotals,
  SLOTS,
  START_HOUR,
  sumDay,
  WeekData,
} from "@/lib/kairos";

const MODES: [GridMode, string][] = [
  ["plan", "계획"],
  ["act", "실행"],
];

export default function WeekGridView({ data }: { data: WeekData }) {
  const totals = { plan: gridTotals(data, "plan"), act: gridTotals(data, "act") };

  // 이 주에 실제로 쓴 항목만 색 설명에 넣는다
  const used = new Set<string>();
  DAYS.forEach((d) =>
    (["plan", "act"] as GridMode[]).forEach((m) =>
      data.grid[m][d].forEach((k) => {
        if (k) used.add(k);
      })
    )
  );
  const legend = CATS.filter((c) => used.has(c.key));

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              <th className="w-10 border bg-slate-100 px-1 py-0.5 text-[10px]">
                요일
              </th>
              <th className="w-9 border bg-slate-100 px-1 py-0.5 text-[10px]" />
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                <th
                  key={i}
                  colSpan={2}
                  className="border bg-slate-100 px-0 py-0.5 text-[9px] font-normal text-slate-500"
                >
                  {String(START_HOUR + i).padStart(2, "0")}
                </th>
              ))}
              <th className="w-10 border bg-slate-100 px-1 py-0.5 text-[10px]">
                합계
              </th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d) =>
              MODES.map(([mode, label], mi) => (
                <tr key={d + mode}>
                  {mi === 0 && (
                    <td
                      rowSpan={2}
                      className="border bg-slate-50 px-1 text-center text-[11px] font-semibold"
                    >
                      {DAY_KO[d]}
                    </td>
                  )}
                  <td className="border bg-slate-50 px-1 text-center text-[10px] text-slate-500">
                    {label}
                  </td>
                  {Array.from({ length: SLOTS }, (_, i) => {
                    const key = data.grid[mode][d][i];
                    return (
                      <td
                        key={i}
                        title={
                          key
                            ? CATS.find((c) => c.key === key)?.ko ?? ""
                            : undefined
                        }
                        className={`h-4 border-y border-r p-0 ${
                          i % 2 === 0 ? "border-r-dashed" : ""
                        }`}
                        style={{
                          background: key ? CAT_COLOR[key] ?? "#fff" : "#fff",
                        }}
                      />
                    );
                  })}
                  <td className="border bg-slate-50 px-1 text-center text-[10px]">
                    {fmt(sumDay(totals[mode][d]))}h
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {legend.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
          {legend.map((c) => (
            <span key={c.key} className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: c.color }}
              />
              {c.ko}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
