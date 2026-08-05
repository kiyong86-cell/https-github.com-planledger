import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Word 파일 한글(hwp) 변환 무료 — PlanLedger",
  description:
    "워드(.docx) 파일을 한글(.hwpx) 파일로 무료 변환합니다. 표의 행·열·병합과 셀 색상, 사진이 그대로 유지됩니다. AI가 만들어준 워드 파일을 한글로 옮길 때도 쓸 수 있어요. 회원가입 없이 바로 사용, 파일은 서버로 전송되지 않습니다.",
};

export default function ConvertLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
