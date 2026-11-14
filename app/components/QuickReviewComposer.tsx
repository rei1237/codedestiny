"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { trackEvent } from "@/lib/analytics";
import ReviewSocialFields, { type ReviewSocialProof } from "@/app/reviews/ReviewSocialFields";
import { REVIEW_IMPROVE_TAGS, REVIEW_POSITIVE_TAGS, REVIEW_RATING_LABELS, reviewWriteHref, safeReviewProductId, useReviewDraft, type ReviewDraft } from "./review/review-ui";

// 별점과 무관하게 긍정·아쉬움 태그를 같은 수로 늘 함께 보인다(감정별 초대 변경 금지).
const TAG_GROUPS = [
  { title: "좋았던 점", tags: REVIEW_POSITIVE_TAGS },
  { title: "아쉬웠던 점", tags: REVIEW_IMPROVE_TAGS },
] as const;

type EligibleProduct = { productId: string; productName: string; usedAt?: string };
type Stage = "loading" | "guest" | "empty" | "ready" | "submitted" | "error";
type Eligibility = "unknown" | "eligible" | "ineligible" | "error";
type FailureReason = "network" | "validation" | "ineligible" | "duplicate" | "server" | "unknown";

// S00 review_invite_view 중복 기준: 문서 생명주기 × surface × product_id × eligibility 당 1회.
const seenInvites = new Set<string>();

function eligibilityOf(stage: Stage): Eligibility {
  if (stage === "ready" || stage === "submitted") return "eligible";
  if (stage === "empty") return "ineligible";
  if (stage === "error") return "error";
  return "unknown";
}

function failureReason(status: number): FailureReason {
  if (status === 400 || status === 422) return "validation";
  if (status === 403) return "ineligible";
  if (status === 409) return "duplicate";
  if (status >= 500) return "server";
  return "unknown";
}

export default function QuickReviewComposer({ brand = "ggulggul", rewardLabel, reviewProductId }: { brand?: "ggulggul" | "yeongnyangi"; rewardLabel: string; reviewProductId?: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [eligible, setEligible] = useState<EligibleProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [reviewId, setReviewId] = useState("");
  const [publicConsent, setPublicConsent] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [inView, setInView] = useState(false);
  const [socialProof, setSocialProof] = useState<ReviewSocialProof>({ platform: "", url: "", disclosed: false });
  const startedAt = useRef(Date.now());
  const hostRef = useRef<HTMLDivElement>(null);
  const submissionRef = useRef<{ id: string; payload: string } | null>(null);
  const submitLock = useRef(false);
  const drafts = useRef<Record<string, ReviewDraft>>({});
  const writeStarted = useRef(new Set<string>());
  const draftStore = useReviewDraft(productId);
  const preferredProductId = safeReviewProductId(reviewProductId);
  const selectedProduct = eligible.find((item) => item.productId === productId);

  // 분석 공통 payload. 본문·제목·별점은 싣지 않는다.
  function s00(eligibility: Eligibility) {
    return { service: brand, product_id: productId || preferredProductId || "unknown", surface: "paid_result", eligibility, metric_version: 1 };
  }

  useEffect(() => {
    const controller = new AbortController();
    void authFetch("/api/reviews/eligibility", { method: "GET", signal: controller.signal }).then(async (response) => {
      if (response.status === 401) { setStage("guest"); return; }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setStage("error"); return; }
      const items: EligibleProduct[] = Array.isArray(data.items) ? data.items : [];
      const preferred = items.find((item) => item.productId === preferredProductId);
      setEligible(items); setProductId(preferred?.productId || items[0]?.productId || ""); setStage(items.length ? "ready" : "empty");
    }).catch(() => { if (!controller.signal.aborted) setStage("error"); });
    return () => controller.abort();
  }, [preferredProductId]);

  // 상품이 정해지거나 바뀌면 그 상품의 작성 내용을 되살린다(이 화면 메모 → 이 기기 초안 순).
  useEffect(() => {
    if (!productId) return;
    const memo = drafts.current[productId];
    const saved = memo || draftStore.read();
    setRating(saved?.rating || 0); setTags(saved?.tags || []); setBody(saved?.body || "");
    setRestored(!memo && Boolean(saved));
  }, [productId, draftStore]);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      trackEvent("review_ui_view", { surface: "result_inline", brand, eligible_count: eligible.length });
      setInView(true);
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [brand, eligible.length]);

  useEffect(() => {
    if (!inView || stage === "loading" || stage === "submitted") return;
    const payload = { service: brand, product_id: productId || preferredProductId || "unknown", surface: "paid_result", eligibility: eligibilityOf(stage), metric_version: 1 };
    const key = `${payload.surface}|${payload.product_id}|${payload.eligibility}`;
    if (seenInvites.has(key)) return;
    seenInvites.add(key);
    trackEvent("review_invite_view", payload);
  }, [inView, stage, brand, productId, preferredProductId]);

  // 사용자가 별점·본문을 처음 직접 고쳤을 때만. 복원·기본값으로는 보내지 않는다.
  function markWriteStart() {
    if (!productId || writeStarted.current.has(productId)) return;
    writeStarted.current.add(productId);
    trackEvent("review_write_start", s00("eligible"));
  }

  function editDraft(patch: Partial<ReviewDraft>) {
    const next = { rating, tags, body, ...patch };
    if (patch.rating !== undefined) setRating(next.rating);
    if (patch.tags) setTags(next.tags);
    if (patch.body !== undefined) setBody(next.body);
    setRestored(false);
    draftStore.save(next);
  }

  function chooseRating(value: number) {
    editDraft({ rating: value }); setNotice("");
    markWriteStart();
    trackEvent("review_rating_select", { surface: "result_inline", brand, rating: value });
  }

  function toggleTag(tag: string) {
    editDraft({ tags: tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag] });
  }

  function changeBody(value: string) {
    editDraft({ body: value });
    markWriteStart();
  }

  function selectProduct(value: string) {
    drafts.current[productId] = { rating, tags, body };
    setProductId(value); setPublicConsent(false); setNotice("");
  }

  async function submit() {
    if (!productId || rating < 1 || submitLock.current) return;
    submitLock.current = true;
    setBusy(true); setNotice("");
    const payload = JSON.stringify({ productId, rating, quickTags: tags, body: body.trim(), publicConsent, socialProof: { platform: "", url: "", disclosed: false } });
    if (!submissionRef.current || submissionRef.current.payload !== payload) submissionRef.current = { id: crypto.randomUUID().replaceAll("-", "").slice(0, 24), payload };
    trackEvent("review_submit_attempt", s00("eligible"));
    try {
      const response = await authFetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(payload), submissionId: submissionRef.current.id }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        trackEvent("review_submit_failed", { ...s00("eligible"), reason: failureReason(response.status) });
        setNotice(String(data.message || "후기를 등록하지 못했어요. 잠시 후 다시 시도해 주세요."));
        return;
      }
      trackEvent("review_submit_success", { ...s00("eligible"), review_status: "pending" });
      draftStore.clear(); delete drafts.current[productId]; setRestored(false);
      setReviewId(String(data.id || submissionRef.current.id)); setPublicConsent(data.publicConsent === true && !data.privacyHold); setStage("submitted");
      setNotice(data.privacyHold ? "개인정보로 보이는 내용이 있어 비공개로 접수했어요." : data.publicConsent === true ? "익명 공개 검토 대기 중이에요. 아직 공개되지 않았어요." : data.publicConsent === false ? "비공개로 접수했어요. 내 후기에서 나중에 공개 동의를 선택할 수 있어요." : "접수됐어요. 공개 여부는 내 후기에서 확인해 주세요.");
      trackEvent("review_submit", { surface: "result_inline", brand, rating, quick_tag_count: tags.length, has_comment: Boolean(body.trim()), duration_ms: Math.max(0, Date.now() - startedAt.current), reward_status: data.rewardStatus || "pending_review" });
    } catch {
      trackEvent("review_submit_failed", { ...s00("eligible"), reason: "network" });
      setNotice("연결이 잠시 끊겼어요. 작성 내용은 이 화면에 보관했으니 다시 등록해 주세요.");
    }
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

  const writeHref = reviewWriteHref(preferredProductId);
  return <div ref={hostRef} className="cd-quick-review" data-stage={stage}>
    {stage === "loading" && <p role="status">작성 가능한 상담을 확인하는 중이에요.</p>}
    {stage === "guest" && <p><a className="cd-review-invite__action" href={`/login/?next=${encodeURIComponent(writeHref)}`} onClick={() => trackEvent("review_invite_click", s00("unknown"))}>로그인하고 후기 남기기</a></p>}
    {stage === "empty" && <p>지금은 후기 작성이 가능한 상담 내역이 없어요.</p>}
    {stage === "error" && <p role="alert">작성 가능한 상담을 확인하지 못했어요. <a href={writeHref} onClick={() => trackEvent("review_invite_click", s00("error"))}>후기 페이지에서 다시 확인하기</a></p>}
    {stage === "ready" && <>
      <div className="cd-quick-review__heading"><div><h3>{brand === "yeongnyangi" ? "영냥이의 풀이, 어떠셨냥?" : "연이의 풀이, 어떠셨나요?"}</h3><p>맞았던 부분도, 아쉬웠던 부분도 알려주세요. 별점 하나만 선택해도 바로 접수돼요.</p></div><span>{eligible.length}건 작성 가능</span></div>
      <p className="cd-quick-review__reward"><strong>{rewardLabel}</strong><span>관리자 승인 후 지급 · 지급일부터 30일 · 별점과 무관</span></p>
      {eligible.length > 1 && <label className="cd-quick-review__select">후기를 남길 상담<select value={productId} disabled={busy} onChange={(event) => selectProduct(event.target.value)}>{eligible.map((item) => <option key={item.productId} value={item.productId}>{item.productName}</option>)}</select><ChevronDown size={18} aria-hidden="true" /></label>}
      <fieldset className="cd-quick-review__stars"><legend>별점 선택</legend>{[1,2,3,4,5].map((star) => <button key={star} type="button" aria-label={`별점 ${star}점`} aria-pressed={rating === star} onClick={() => chooseRating(star)} className={star <= rating ? "is-active" : ""}>★</button>)}</fieldset>
      <p className="cd-quick-review__rating-word" aria-live="polite">{rating ? `${rating}점 · ${REVIEW_RATING_LABELS[rating]}` : "별을 눌러 골라 주세요"}</p>
      <div className="cd-quick-review__tags" aria-label="빠른 후기 선택">{TAG_GROUPS.map((group) => <div key={group.title} role="group" aria-label={group.title} className="cd-quick-review__tag-group"><span>{group.title}</span>{group.tags.map((tag) => <button key={tag} type="button" aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)}>{tags.includes(tag) && <Check size={15} aria-hidden="true" />}{tag}</button>)}</div>)}</div>
      <label className="cd-quick-review__comment">한 줄 후기 <span>(선택)</span><textarea value={body} onChange={(event) => changeBody(event.target.value)} maxLength={1000} rows={2} placeholder="마음에 남은 점을 짧게 적어주세요." /></label>
      {restored && <p role="status" className="cd-quick-review__privacy">이 기기에 저장해 둔 작성 내용을 불러왔어요.</p>}
      <label className="cd-review-consent"><input type="checkbox" checked={publicConsent} disabled={busy} onChange={(event) => setPublicConsent(event.target.checked)} /><span>익명으로 공개하는 데 동의해요 <small>(선택)</small></span></label>
      <p className="cd-review-preview">공개 작성자: 익명의 운세손님<br />별점·선택한 태그·작성한 글이 공개될 수 있어요. 이름, 연락처, 생년월일 등 개인정보는 쓰지 마세요.</p>
      <button type="button" className="cd-quick-review__submit" disabled={rating < 1 || busy} onClick={() => void submit()}>{busy ? "후기 등록 중" : "후기 등록하기"}</button>
      <p className="cd-quick-review__privacy">공개 동의 없이도 등록할 수 있어요. 동의한 후기만 관리자 검토 후 공개될 수 있어요. 작성 중인 내용은 이 기기에만 7일 동안 보관돼요. 이용권 구매·현금 교환에는 사용할 수 없어요.</p>
      {notice && <p role="alert" className="cd-quick-review__notice">{notice}</p>}
    </>}
    {stage === "submitted" && <div className="cd-quick-review__thanks" aria-live="polite">
      <Image className="cd-review-thanks-image" src={brand === "yeongnyangi" ? "/assets/yeongnyangi/original/hero-480.webp" : "/images/reviews/yeoni-moonstone-gift-v1.webp"} width={120} height={120} alt="" /><h3>{brand === "yeongnyangi" ? "이야기 들려줘서 고맙다냥!" : "소중한 이야기, 잘 받았어요"}</h3><p>후기는 안전하게 접수됐어요.</p>
      <ol className="cd-quick-review__timeline" aria-label="후기 처리 순서">
        <li data-state="done"><strong>접수</strong><span>방금 접수됐어요</span></li>
        <li data-state="current" aria-current="step"><strong>관리자 검토</strong><span>운영진이 내용을 확인해요</span></li>
        <li data-state="next"><strong>{publicConsent ? "익명 공개·월정석 지급" : "지급 상태 갱신"}</strong><span>{publicConsent ? "승인되면 익명으로 공개되고 월정석이 지급돼요" : "검토가 끝나면 내 후기에서 지급 상태를 확인할 수 있어요. 공개 동의한 후기만 공개돼요"}</span></li>
      </ol>
      <div className="cd-quick-review__next"><button type="button" onClick={() => setStage("empty")}>여기서 마치기</button><a href="/reviews/#my-reviews">내 후기 확인하기</a><button type="button" onClick={() => { setShareOpen(true); trackEvent("review_share_select", { surface: "result_inline", brand }); }}>SNS에 후기 공유하기</button></div>
      {shareOpen && <div className="cd-quick-review__share"><ReviewSocialFields body={body || tags.join(", ")} productName={selectedProduct?.productName || ""} value={socialProof} onChange={setSocialProof} /><button type="button" className="cd-quick-review__submit" disabled={busy || !socialProof.url || !socialProof.disclosed} onClick={() => void saveSocialProof()}>SNS 후기 인증 접수하기</button></div>}
      {notice && <p role="status" className="cd-quick-review__notice">{notice}</p>}
    </div>}
  </div>;
}
