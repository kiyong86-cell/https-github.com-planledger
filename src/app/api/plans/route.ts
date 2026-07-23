import { NextResponse } from "next/server";
import { createPlan, listPlans } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listPlans());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plan = await createPlan(body.title ?? "새 기획안", body.content ?? {});
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
