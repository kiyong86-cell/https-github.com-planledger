import { NextResponse } from "next/server";
import { getReceipt, readUpload } from "@/lib/backend";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const receipt = await getReceipt(params.id);
  if (!receipt?.image_path) {
    return NextResponse.json({ error: "첨부 파일이 없습니다." }, { status: 404 });
  }

  const buffer = await readUpload(receipt.image_path);
  if (!buffer) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const ext = receipt.image_path
    .slice(receipt.image_path.lastIndexOf("."))
    .toLowerCase();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
