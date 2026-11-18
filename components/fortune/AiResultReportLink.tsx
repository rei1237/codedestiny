"use client";

import { useEffect, useState } from "react";
import { currentFortuneSharedCopy } from "./_lib/fortune-shared-copy";

// Google Play AI 생성 콘텐츠 정책: 앱을 떠나지 않고 AI 결과를 신고할 수 있어야 한다.
// 눈에 띄지 않되 찾을 수 있게, 결과 끝에 작은 링크 하나로 둔다. 신고는 기존 피드백의
// ai-quality 카테고리로 받는다(worker/lib/feedback-models.js). 언어 전환은 경로 이동이라
// 렌더 시점에 한 번 읽으면 충분하다(_lib/fortune-shared-copy.ts 주석).
const COPY = currentFortuneSharedCopy();
const BASE_HREF = "/feedback/?category=ai-quality";

export default function AiResultReportLink({ className = "" }: { className?: string }) {
  const [href, setHref] = useState(BASE_HREF);

  useEffect(() => {
    try {
      setHref(`${BASE_HREF}&from=${encodeURIComponent(window.location.href.slice(0, 1000))}`);
    } catch {
      // 주소를 못 읽어도 카테고리만 고른 신고 화면으로 간다.
    }
  }, []);

  return (
    <p className={className} style={{ margin: "12px 0 0", textAlign: "center", fontSize: 12, lineHeight: 1.5 }}>
      <a
        href={href}
        data-cd-ai-report=""
        style={{ display: "inline-block", padding: "12px 8px", color: "inherit", opacity: 0.72, textDecoration: "underline", textUnderlineOffset: 3 }}
      >
        {COPY.aiReportLabel}
      </a>
    </p>
  );
}
