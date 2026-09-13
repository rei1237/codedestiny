"use client";
import { useRef, useState } from "react";
import KakaoSdk from "@/app/components/KakaoSdk";
import { giftApi, type GiftView } from "./gift-client";

export default function GiftSharing({ gift, onChange }: { gift: GiftView; onChange: (gift: GiftView) => void }) {
  const [url, setUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const issue = async () => {
    if (lock.current) return;
    if (gift.hasLink && !window.confirm("새 링크를 만들면 이전에 보낸 링크는 사용할 수 없어요. 재발급할까요?")) return;
    lock.current = true; setBusy(true);
    try { const d = await giftApi(`/${encodeURIComponent(gift.giftId)}/link`, { tokenVersion: gift.tokenVersion || 0 }); if (d.gift && d.claimPath) { onChange(d.gift); setUrl(new URL(d.claimPath, window.location.origin).href); setNotice(""); } }
    catch (e) { setNotice(e instanceof Error ? e.message : "링크를 다시 확인해 주세요."); }
    finally { lock.current = false; setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setNotice("선물 링크를 복사했어요."); }
    catch { setNotice("아래 링크를 길게 눌러 복사해 주세요."); }
  };
  const share = async () => {
    try { if (navigator.share) await navigator.share({ title: "운명의 선물", text: "CODE DESTINY 이용권 선물이 도착했어요.", url }); else await copy(); }
    catch (e) { if (!(e instanceof Error && e.name === "AbortError")) await copy(); }
  };
  const kakao = () => {
    const sdk = (window as unknown as { Kakao?: { isInitialized?: () => boolean; Share?: { sendDefault: (data: object) => void } } }).Kakao;
    if (!sdk?.isInitialized?.() || !sdk.Share) { void share(); return; }
    try { sdk.Share.sendDefault({ objectType: "text", text: "소중한 사람에게 마음을 전하는 CODE DESTINY 선물이 도착했어요. 로그인 후 이용권을 받아보세요.", link: { mobileWebUrl: url, webUrl: url }, buttonTitle: "선물 확인하기" }); }
    catch { void share(); }
  };
  if (gift.status !== "PAID") return null;
  return <><KakaoSdk /><img src="/images/fortune-tea-house/flower-pig-honey-hug.webp" alt="선물을 소중히 안고 있는 꽃돼지" width={140} height={140} className="gift-pig" /><p className="gift-promo">소중한 사람에게 마음을 전해보세요</p><div className="gift-actions">{!url ? <button disabled={busy} onClick={() => void issue()}>{gift.hasLink ? "선물 링크 재발급" : "선물 링크 만들기"}</button> : <><button onClick={kakao}>카카오톡으로 보내기</button><button className="secondary" onClick={() => void copy()}>링크 복사</button><button className="secondary" onClick={() => void share()}>공유하기</button></>}</div>{notice && <p role="status">{notice}</p>}{url && <details><summary>선물 링크 보기</summary><p>{url}</p></details>}</>;
}
