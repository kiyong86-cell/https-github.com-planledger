// 클라이언트에서 사용 이벤트를 기록한다 (실패해도 조용히 무시).
export type TrackType =
  | "export_docx"
  | "export_hwpx"
  | "export_pdf"
  | "plan_created"
  | "receipt_created";

export function trackEvent(type: TrackType) {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 무시
  }
}
