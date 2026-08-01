"use client";

import { useEffect } from "react";

// 서비스워커를 등록해 PWA 설치를 가능하게 한다.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
