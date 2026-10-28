"use client";

import { useState } from "react";
import { Copy, Download, ExternalLink, Share2 } from "lucide-react";
import { REVIEW_REWARD_IMAGE } from "@/js/review-reward-copy.mjs";
import { REVIEW_SOCIAL_CHANNELS, REVIEW_REWARD_DISCLOSURE, buildReviewShareText, reviewShareUrl } from "@/js/review-sharing.mjs";

export type ReviewSocialProof = { platform: string; url: string; disclosed: boolean };

export default function ReviewSocialFields({ body, productName, value, onChange }: {
  body: string; productName: string; value: ReviewSocialProof; onChange: (value: ReviewSocialProof) => void;
}) {
  const [notice, setNotice] = useState("");
  const text = buildReviewShareText(body, productName);
  async function copyText() {
    try { await navigator.clipboard.writeText(text); setNotice("후기와 보상 참여 안내를 복사했어요. 게시 화면에 붙여 넣어 주세요."); }
    catch { setNotice("자동 복사가 어려워요. 아래 공유 문구를 선택해 직접 복사해 주세요."); }
  }
  async function share() {
    if (!navigator.share) { await copyText(); return; }
    try { await navigator.share({ title: "꿀꿀 운세 이용 후기", text }); setNotice("게시를 마쳤다면 아래에 후기 주소를 입력해 주세요."); }
    catch (error) { if ((error as Error).name !== "AbortError") setNotice("공유창을 열지 못했어요. 문구 복사와 SNS 바로가기를 이용해 주세요."); }
  }
  return <section className="cd-review-social" aria-labelledby="review-social-title">
    <h3 id="review-social-title">SNS에도 경험을 나눠보세요</h3>
    <p>작성 시점이나 참여 횟수 제한은 없어요. 좋은 점과 아쉬운 점을 자유롭게 적고, 보상 이벤트 참여 사실을 함께 밝혀 주세요.</p>
    <div className="cd-review-social__actions">
      <button type="button" onClick={() => void copyText()}><Copy size={18} aria-hidden="true" />문구 복사하기</button>
      <button type="button" onClick={() => void share()}><Share2 size={18} aria-hidden="true" />기기 공유창 열기</button>
      <a href={REVIEW_REWARD_IMAGE} download="꽃돼지와-영냥이-후기-이벤트.webp"><Download size={18} aria-hidden="true" />이미지 저장하기</a>
    </div>
    <details>
      <summary>복사할 공유 문구 확인하기</summary>
      <textarea aria-label="SNS 공유 문구" readOnly value={text} rows={6} onFocus={(event) => event.target.select()} />
    </details>
    <nav className="cd-review-social__channels" aria-label="후기 공유 SNS">
      {REVIEW_SOCIAL_CHANNELS.map((channel) => <a key={channel.id} href={reviewShareUrl(channel.id, text)} target="_blank" rel="noopener noreferrer" onClick={() => onChange({ ...value, platform: channel.id })}>
        {channel.label}<ExternalLink size={15} aria-hidden="true" />
      </a>)}
    </nav>
    <p className="cd-review-social__hint">네이버·스레드는 공유창으로 이동해요. 인스타그램·다음 카페는 문구를 복사하고 이미지를 저장한 뒤 직접 게시해 주세요. 네이버 카페는 공유창에서 카페를 선택해 주세요.</p>
    <p role="status" aria-live="polite">{notice}</p>
    <label htmlFor="review-social-platform">게시한 SNS <span>(선택)</span></label>
    <select id="review-social-platform" value={value.platform} onChange={(event) => onChange({ platform: event.target.value, url: "", disclosed: false })}>
      <option value="">서비스 안에만 후기 남기기</option>
      {REVIEW_SOCIAL_CHANNELS.map((channel) => <option key={channel.id} value={channel.id}>{channel.label}</option>)}
    </select>
    {value.platform && <>
      <label htmlFor="review-social-url">게시한 후기 주소</label>
      <input id="review-social-url" type="url" inputMode="url" placeholder="https://" maxLength={2000} value={value.url} onChange={(event) => onChange({ ...value, url: event.target.value })} aria-describedby="review-social-privacy" />
      <p id="review-social-privacy" className="cd-review-social__hint">게시글의 공유 링크를 붙여 넣어 주세요. 주소는 본인과 관리자만 확인해요. 비공개 글은 검수가 어려울 수 있어요.</p>
      <label className="cd-review-social__consent"><input type="checkbox" checked={value.disclosed} onChange={(event) => onChange({ ...value, disclosed: event.target.checked })} /><span>후기에 보상 이벤트 참여 사실을 표시했어요.</span></label>
      <p className="cd-review-social__hint">{REVIEW_REWARD_DISCLOSURE}</p>
    </>}
  </section>;
}
