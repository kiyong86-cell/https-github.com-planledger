import { NextResponse } from "next/server";
import { createReceipt, listReceipts, saveUpload } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listReceipts());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    let imagePath: string | null = null;
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      imagePath = await saveUpload(buffer, file.name);
    }

    const receipt = await createReceipt({
      receipt_date:
        String(form.get("receipt_date") || "") ||
        new Date().toISOString().slice(0, 10),
      vendor: String(form.get("vendor") || "") || null,
      amount: Number(form.get("amount")) || 0,
      category: String(form.get("category") || "") || null,
      memo: String(form.get("memo") || "") || null,
      image_path: imagePath,
    });

    return NextResponse.json(receipt);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
