"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { trackEvent } from "@/lib/analytics";
import ReviewSocialFields, { type ReviewSocialProof } from "@/app/reviews/ReviewSocialFields";

const QUICK_TAGS = ["풀이가 자세해서 좋아요", "조금 아쉬웠어요"] as const;

type EligibleProduct = { productId: string; productName: string; usedAt?: string };
type Stage = "loading" | "guest" | "empty" | "ready" | "submitted" | "error";

export default function QuickReviewComposer({ brand = "ggulggul", rewardLabel }: { brand?: "ggulggul" | "yeongnyangi"; rewardLabel: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [eligible, setEligible] = useState<EligibleProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [reviewId, setReviewId] = useState("");
  const [publicConsent, setPublicConsent] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [socialProof, setSocialProof] = useState<ReviewSocialProof>({ platform: "", url: "", disclosed: false });
  const startedAt = useRef(Date.now());
  const hostRef = useRef<HTMLDivElement>(null);
  const submissionRef = useRef<{ id: string; payload: string } | null>(null);
  const submitLock = useRef(false);
  const drafts = useRef<Record<string, { rating: number; tags: string[]; body: string }>>({});
  const selectedProduct = eligible.find((item) => item.productId === productId);

  useEffect(() => {
    const controller = new AbortController();
    void authFetch("/api/reviews/eligibility", { method: "GET", signal: controller.signal }).then(async (response) => {
      if (response.status === 401) { setStage("guest"); return; }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setStage("error"); return; }
      const items = Array.isArray(data.items) ? data.items : [];
      setEligible(items); setProductId(items[0]?.productId || ""); setStage(items.length ? "ready" : "empty");
    }).catch(() => { if (!controller.signal.aborted) setStage("error"); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      trackEvent("review_ui_view", { surface: "result_inline", brand, eligible_count: eligible.length });
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [brand, eligible.length]);



  function chooseRating(value: number) {
    setRating(value); setNotice("");
    trackEvent("review_rating_select", { surface: "result_inline", brand, rating: value });
  }

  function toggleTag(tag: string) {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  async function submit() {
    if (!productId || rating < 1 || submitLock.current) return;
    submitLock.current = true;
    setBusy(true); setNotice("");
    const payload = JSON.stringify({ productId, rating, quickTags: tags, body: body.trim(), publicConsent, socialProof: { platform: "", url: "", disclosed: false } });
    if (!submissionRef.current || submissionRef.current.payload !== payload) submissionRef.current = { id: crypto.randomUUID().replaceAll("-", "").slice(0, 24), payload };
    try {
      const response = await authFetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(payload), submissionId: submissionRef.current.id }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(String(data.message || "후기를 등록하지 못했어요. 잠시 후 다시 시도해 주세요.")); return; }
      setReviewId(String(data.id || submissionRef.current.id)); setPublicConsent(data.publicConsent === true && !data.privacyHold); setStage("submitted");
      setNotice(data.privacyHold ? "개인정보로 보이는 내용이 있어 비공개로 접수했어요." : data.publicConsent === true ? "익명 공개 검토 대기 중이에요. 아직 공개되지 않았어요." : data.publicConsent === false ? "비공개로 접수했어요. 내 후기에서 나중에 공개 동의를 선택할 수 있어요." : "접수됐어요. 공개 여부는 내 후기에서 확인해 주세요.");
      trackEvent("review_submit", { surface: "result_inline", brand, rating, quick_tag_count: tags.length, has_comment: Boolean(body.trim()), duration_ms: Math.max(0, Date.now() - startedAt.current), reward_status: data.rewardStatus || "pending_review" });
    } catch { setNotice("연결이 잠시 끊겼어요. 작성 내용은 이 화면에 보관했으니 다시 등록해 주세요."); }
    finally { submitLock.current = false; setBusy(false); }
  }

  async function saveSocialProof() {
    if (!reviewId || submitLock.current) return;
    submitLock.current = true;
    setBusy(true); setNotice("");
    try {
      const response = await authFetch(`/api/reviews/${reviewId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ socialProof }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(String(data.message || "SNS 후기 주소를 저장하지 못했어요.")); return; }
      setNotice("SNS 후기 인증을 접수했어요. 관리자 검토 후 지급 상태가 갱신돼요.");
      trackEvent("review_sns_proof_submit", { surface: "result_inline", brand, platform: socialProof.platform });
    } catch { setNotice("SNS 후기 주소를 저장하지 못했어요. 잠시 후 다시 시도해 주세요."); }
    finally { submitLock.current = false; setBusy(false); }
  }

  return <div ref={hostRef} className="cd-quick-review" data-stage={stage}>
    {stage === "loading" && <p role="status">작성 가능한 상담을 확인하는 중이에요.</p>}
    {stage === "guest" && <p><a className="cd-review-invite__action" href="/login/?next=%2Freviews%2F%3Fwrite%3D1">로그인하고 후기 남기기</a></p>}
    {stage === "empty" && <p>지금은 후기 작성이 가능한 상담 내역이 없어요.</p>}
    {stage === "error" && <p role="alert">작성 가능한 상담을 확인하지 못했어요. <a href="/reviews/?write=1">후기 페이지에서 다시 확인하기</a></p>}
    {stage === "ready" && <>
      <div className="cd-quick-review__heading"><div><h3>{brand === "yeongnyangi" ? "영냥이의 풀이, 어떠셨냥?" : "연이의 풀이, 어떠셨나요?"}</h3><p>맞았던 부분도, 아쉬웠던 부분도 알려주세요. 별점 하나만 선택해도 바로 접수돼요.</p></div><span>{eligible.length}건 작성 가능</span></div>
      <p className="cd-quick-review__reward"><strong>{rewardLabel}</strong><span>관리자 승인 후 지급 · 지급일부터 30일 · 별점과 무관</span></p>
      {eligible.length > 1 && <label className="cd-quick-review__select">후기를 남길 상담<select value={productId} disabled={busy} onChange={(event) => { drafts.current[productId] = { rating, tags, body }; const next = drafts.current[event.target.value]; setProductId(event.target.value); setRating(next?.rating || 0); setTags(next?.tags || []); setBody(next?.body || ""); setPublicConsent(false); setNotice(""); }}>{eligible.map((item) => <option key={item.productId} value={item.productId}>{item.productName}</option>)}</select><ChevronDown size={18} aria-hidden="true" /></label>}
      <fieldset className="cd-quick-review__stars"><legend>별점 선택</legend>{[1,2,3,4,5].map((star) => <button key={star} type="button" aria-label={`별점 ${star}점`} aria-pressed={rating === star} onClick={() => chooseRating(star)} className={star <= rating ? "is-active" : ""}>★</button>)}</fieldset>
      <div className="cd-quick-review__tags" aria-label="빠른 후기 선택">{QUICK_TAGS.map((tag) => <button key={tag} type="button" aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)}>{tags.includes(tag) && <Check size={15} aria-hidden="true" />}{tag}</button>)}</div>
      <label className="cd-quick-review__comment">한 줄 후기 <span>(선택)</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} rows={2} placeholder="마음에 남은 점을 짧게 적어주세요." /></label>
      <label className="cd-review-consent"><input type="checkbox" checked={publicConsent} disabled={busy} onChange={(event) => setPublicConsent(event.target.checked)} /><span>익명으로 공개하는 데 동의해요 <small>(선택)</small></span></label>
      <p className="cd-review-preview">공개 작성자: 익명의 운세손님<br />별점·선택한 태그·작성한 글이 공개될 수 있어요. 이름, 연락처, 생년월일 등 개인정보는 쓰지 마세요.</p>
      <button type="button" className="cd-quick-review__submit" disabled={rating < 1 || busy} onClick={() => void submit()}>{busy ? "후기 등록 중" : "후기 등록하기"}</button>
      <p className="cd-quick-review__privacy">공개 동의 없이도 등록할 수 있어요. 동의한 후기만 관리자 검토 후 공개될 수 있어요. 이용권 구매·현금 교환에는 사용할 수 없어요.</p>
      {notice && <p role="alert" className="cd-quick-review__notice">{notice}</p>}
    </>}
    {stage === "submitted" && <div className="cd-quick-review__thanks" aria-live="polite">
      <Image className="cd-review-thanks-image" src={brand === "yeongnyangi" ? "/assets/yeongnyangi/original/hero-480.webp" : "/images/reviews/yeoni-moonstone-gift-v1.webp"} width={120} height={120} alt="" /><h3>{brand === "yeongnyangi" ? "이야기 들려줘서 고맙다냥!" : "소중한 이야기, 잘 받았어요"}</h3><p>후기는 안전하게 접수됐어요. 기존 정책에 따라 관리자 검토 후 지급 상태가 갱신돼요.</p>
      <div className="cd-quick-review__next"><button type="button" onClick={() => setStage("empty")}>여기서 마치기</button><a href="/reviews/#my-reviews">내 후기 확인하기</a><button type="button" onClick={() => { setShareOpen(true); trackEvent("review_share_select", { surface: "result_inline", brand }); }}>SNS에 후기 공유하기</button></div>
      {shareOpen && <div className="cd-quick-review__share"><ReviewSocialFields body={body || tags.join(", ")} productName={selectedProduct?.productName || ""} value={socialProof} onChange={setSocialProof} /><button type="button" className="cd-quick-review__submit" disabled={busy || !socialProof.url || !socialProof.disclosed} onClick={() => void saveSocialProof()}>SNS 후기 인증 접수하기</button></div>}
      {notice && <p role="status" className="cd-quick-review__notice">{notice}</p>}
    </div>}
  </div>;
}
