// PlanLedger PWA 서비스워커 — 설치 가능성 + 정적 자원 캐싱.
// 로그인·데이터는 항상 최신이 필요하므로 네트워크 우선, 실패 시에만 캐시 사용.
const CACHE = "planledger-v1";
const PRECACHE = ["/icon-192.png", "/icon-512.png", "/apple-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // GET 요청만, 그리고 API·인증은 캐시하지 않고 항상 네트워크로
  if (req.method !== "GET" || req.url.includes("/api/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // 정적 자원(아이콘·_next 정적 파일)만 캐시에 저장
        if (
          req.url.includes("/_next/static/") ||
          req.url.endsWith(".png") ||
          req.url.endsWith(".ico")
        ) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
