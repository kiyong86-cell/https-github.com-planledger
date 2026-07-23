import { NextResponse } from "next/server";
import { deleteReceipt } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ok = await deleteReceipt(params.id);
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
