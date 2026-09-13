"use client";

import { useRef, useState } from "react";
import { prepareKakao, shareThrough } from "@/js/share-service.mjs";
import { buildDynamicOgImageUrl } from "@/lib/seo/dynamicOgImage";
import { trackShareEvent } from "@/lib/share.v2";
import styles from "./fortune-chat.module.css";

/**
 * 수호신 운세 결과를 공개 스냅샷으로 굳혀 카카오톡으로 내보낸다.
 *
 * 🔴 ShareWidget 을 쓰지 않는 이유 — lib/share.v2.ts 의 `shareable` 은 isPrivateRoute() 로
 * /fortune-chat 같은 결과 화면을 전부 막아 위젯이 null 을 반환한다. 그 게이트를 넓히면
 * 사설 라우트가 통째로 공유 대상이 되므로, 결과 화면 전용 버튼을 따로 둔다.
 *
 * 🔴 유료 결과는 여기 도달하지 않는다. shareDraftToken 은 worker/lib/guardian-fortune-generate.js
 * 가 `reservation.source !== "paid"` 일 때만 발급하므로, 토큰이 없으면 이 버튼이 렌더되지 않고
 * 설령 위조해도 POST /guardian/share 의 서명 검증을 통과할 수 없다.
 */
type GuardianShareButtonProps = {
  apiBase: string;
  token: string;
};

type ShareSnapshot = { shareUrl: string; shareText: string; title: string };

const ANALYTICS_PAYLOAD = { contentType: "result", source: "fortune_chat_result", feature: "guardian-fortune" };

export function GuardianShareButton({ apiBase, token }: GuardianShareButtonProps) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  // 스냅샷은 공유 1건당 한 번만 만든다. 서버가 같은 초안 토큰에 같은 shareId 를 돌려주지만
  // (reused), 왕복을 아끼고 연타로 레이트 리밋을 태우지 않기 위해 결과를 붙들어 둔다.
  const snapshotRef = useRef<ShareSnapshot | null>(null);
  const sharingRef = useRef(false);

  async function createSnapshot(): Promise<ShareSnapshot | null> {
    if (snapshotRef.current) return snapshotRef.current;
    const response = await fetch(`${apiBase}/api/fortune/guardian/share`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareDraftToken: token }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok || typeof payload.shareUrl !== "string") {
      setStatus(String(payload?.message || "공유 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요."));
      return null;
    }
    snapshotRef.current = {
      shareUrl: payload.shareUrl,
      shareText: String(payload.shareText || ""),
      title: String(payload.title || "오늘의 수호신 운세"),
    };
    return snapshotRef.current;
  }

  async function runShare() {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setBusy(true);
    setStatus("");
    trackShareEvent("share_click", { ...ANALYTICS_PAYLOAD, shareChannel: "kakao" });
    try {
      // SDK 는 사용자 제스처 안에서 미리 띄운다. 스냅샷 왕복을 기다렸다가 로드하면 팝업
      // 차단에 걸리는 브라우저가 있다.
      const [snapshot, kakaoReady] = await Promise.all([
        createSnapshot(),
        prepareKakao(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY),
      ]);
      if (!snapshot) return;

      const share = {
        title: snapshot.title,
        text: snapshot.shareText,
        url: snapshot.shareUrl,
        image: buildDynamicOgImageUrl({ title: snapshot.title, description: snapshot.shareText, badge: "fortune" }),
      };
      // 카카오가 없으면(SDK 차단·PC 브라우저) 네이티브 공유 → 링크 복사로 내려간다.
      const outcome = kakaoReady
        ? await shareThrough("kakao", share)
        : { status: "unavailable" as const };
      const fallback = outcome.status === "unavailable" || outcome.status === "failed"
        ? await shareThrough("native", share)
        : outcome;
      const final = fallback.status === "unavailable" || fallback.status === "failed"
        ? await shareThrough("copy", share)
        : fallback;

      if (final.status === "opened") setStatus("카카오톡에서 보낼 대화방을 선택해 주세요.");
      else if (final.status === "shared") setStatus("공유했어요.");
      else if (final.status === "copied") setStatus("링크를 복사했어요. 단톡방에 붙여 넣어 주세요.");
      else if (final.status === "cancelled") setStatus("공유를 취소했어요.");
      else setStatus(`공유 창을 열지 못했어요. 이 링크를 복사해 주세요 — ${snapshot.shareUrl}`);
      trackShareEvent("share_result", { ...ANALYTICS_PAYLOAD, outcome: final.status });
    } catch {
      setStatus("공유 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      sharingRef.current = false;
      setBusy(false);
    }
  }

  return <div className={styles.shareRow}>
    <div className={styles.actions}>
      <button type="button" onClick={() => void runShare()} disabled={busy}>
        {busy ? "공유 준비 중" : "이 결과 카톡으로 공유하기"} <span aria-hidden>💬</span>
      </button>
    </div>
    <p className={styles.shareHint}>
      {status || "친구는 내 결과 요약을 보고 바로 자기 운세를 볼 수 있어요. 생년월일 같은 개인정보는 담기지 않아요."}
    </p>
  </div>;
}
