import { NextResponse } from "next/server";
import { deletePlan, getPlan, updatePlan } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const plan = await getPlan(params.id);
  if (!plan) {
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(plan);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const plan = await updatePlan(
      params.id,
      body.title ?? "제목 없음",
      body.content ?? {}
    );
    if (!plan) {
      return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ok = await deletePlan(params.id);
    if (!ok) {
      return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
