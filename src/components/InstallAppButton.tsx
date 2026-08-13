"use client";

// 폰·태블릿 홈 화면에 "정직이들" 앱으로 설치하도록 안내한다.
// 안드로이드·크롬: 설치 버튼이 뜬다. 아이폰(사파리): 직접 하는 방법을 안내한다.
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 이미 앱으로 실행 중이면 안내를 감춘다
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) return null;

  if (promptEvent) {
    return (
      <button
        onClick={async () => {
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice.outcome === "accepted") setInstalled(true);
          setPromptEvent(null);
        }}
        className="mt-4 w-full rounded-md border border-slate-300 bg-white py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
      >
        📱 홈 화면에 앱으로 추가하기
      </button>
    );
  }

  if (isIos) {
    return (
      <p className="mt-4 rounded-md border bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        📱 앱처럼 쓰려면 아래 <b>공유 버튼</b>을 누르고{" "}
        <b>&quot;홈 화면에 추가&quot;</b>를 선택하세요. 홈 화면에 정직이들
        아이콘이 생깁니다.
      </p>
    );
  }

  return null;
}
