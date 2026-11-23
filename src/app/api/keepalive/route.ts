import { NextResponse } from "next/server";

// 데이터베이스(Supabase)를 깨어 있게 유지한다.
// 무료 요금제는 일정 기간 아무 접속이 없으면 프로젝트를 일시정지시키는데,
// 그러면 정직이들이 열리지 않는다. Vercel이 하루 한 번 이 주소를 불러
// 가벼운 조회를 한 번 해주면 "사용 중"으로 남는다.
//
// 방학처럼 학생들이 안 쓰는 기간에도 멈추지 않게 하는 장치다.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, reason: "설정 없음" },
      { status: 200 }
    );
  }

  const started = Date.now();
  try {
    // 가장 가벼운 조회 — 행 수만 센다 (내용은 가져오지 않는다)
    const res = await fetch(
      `${url}/rest/v1/kairos_weeks?select=id&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "count=none",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      }
    );

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "알 수 없는 오류",
      ms: Date.now() - started,
      at: new Date().toISOString(),
    });
  }
}
