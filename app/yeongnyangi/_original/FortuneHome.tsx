"use client";
import Image from "next/image";
import QuestionJourney from "@/app/components/QuestionJourney";
import NightHero from "../_components/NightHero";
import FirstVisitGuide from "../_components/FirstVisitGuide";
import HeavenLightCinema from "../_components/HeavenLightCinema";
import SessionControls from "./SessionControls";
import type {ProductOffers} from '../_components/ProductGuide';
import {useReadingLanguage} from '../_lib/use-reading-language';
import LocalizedFortuneHome from '../_components/LocalizedFortuneHome';
import {LocaleSwitcher} from '@/app/components/LocaleSwitcher';

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Bookmark, ChevronRight, House, KeyRound, PawPrint, X } from "lucide-react";
import { ggulggulFortuneHref, loginHref, socialLoginHref, type SocialProvider } from "./service-links";

// 2026-10-28 단순화: 한국어 홈은 히어로 → 뮤직비디오 → 고민으로 시작하기 → 가격·결제 전 안내 → 꿀꿀운세 한 줄 순서다.
// 상담 방식 3지선다(영냥이·꿀꿀·네오)와 첫 방문 인라인 그림 안내는 홈에서 뺐다. 네오 작전 결정서는 꿀꿀운세 /neo-consultation/ 소속이다.
// 체계 카드·초융합·추천·영냥이의 방 같은 블록은 홈에서 뺐다. 각 주소(/yeongnyangi/room/ 등)는 그대로 열린다.
// 가격표·상담 예시·FAQ 는 page.tsx 가 홈 아래에 붙이는 YeongnyangiGuide 가 맡는다.
type Panel = "auth" | null;
const imagePath = (name: string) => `/assets/yeongnyangi/original/${name}.webp`;

function Art({
  name,
  alt = "",
  className = "",
  width = 460,
  height = 300,
  eager = false,
}: {
  name: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
}) {
  return (
    <img
      src={imagePath(name)}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}

export default function FortuneHome({offers,guide,passBenefits}:{offers:ProductOffers;guide?:ReactNode;passBenefits?:ReactNode}) {
  const {siteLocale}=useReadingLanguage();
  const [panel, setPanel] = useState<Panel>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [activeNav, setActiveNav] = useState("home");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const returnTo = typeof window === "undefined" ? "/yeongnyangi/fortune/" : window.location.pathname + window.location.search;
  const socialProviders: { id: SocialProvider; label: string }[] = [
    { id: "google", label: "Google" },
    { id: "naver", label: "네이버" },
    { id: "kakao", label: "카카오" },
  ];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panel) {
      if (!dialog.open) {
        openerRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        dialog.showModal();
      }
      dialog.scrollTop = 0;
      dialog
        .querySelector<HTMLButtonElement>(".dialog-header button")
        ?.focus({ preventScroll: true });
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    if (dialog.open) dialog.close();
    openerRef.current?.focus({ preventScroll: true });
  }, [panel]);

  function closePanel() {
    setPanel(null);
  }
  function navigate(id: string) {
    if (id === "library") { window.location.assign("/yeongnyangi/library/"); return; }
    closePanel();
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  if(siteLocale!=='ko')return <LocalizedFortuneHome locale={siteLocale} offers={offers}/>;
  return (
    <>
      <a className="skip-link" href="#questions">
        질문 고르기로 건너뛰기
      </a>
      <div className="site-shell" id="home">
        <header className="header">
          <a href="#home" className="brand">
            <img src={imagePath("avatar")} width="42" height="34" alt="" />
            <span>
              사주보는 <strong>영냥이</strong>
              <small>FORTUNE SOUL CAT</small>
            </span>
          </a>
          <nav className="desktop-nav" aria-label="주 메뉴">
            <a href="#questions"><Image src="/assets/yeongnyangi/ui/nav-readings.webp" width={28} height={28} alt=""/><span>질문 고르기</span></a>
            <a href="#yn-prices"><Image src="/assets/yeongnyangi/ui/nav-recommendations.webp" width={28} height={28} alt=""/><span>상담 가격</span></a>
            <a href="/yeongnyangi/library/"><Image src="/assets/yeongnyangi/ui/nav-room.webp" width={28} height={28} alt=""/><span>내 상담</span></a>
          </nav>
          <div className="header-actions">
            <LocaleSwitcher preservePath locale={siteLocale}/>
            <SessionControls compact onLogin={()=>{setAuthMode("login");setPanel("auth");}} />
          </div>
        </header>

        <main>
          {passBenefits}
          <NightHero/>
          <HeavenLightCinema/>
          <FirstVisitGuide/>
          <QuestionJourney source="home"/>
          {guide}
          <div className="main-content">
            <section className="ggulggul-bridge" aria-labelledby="ggulggul-title">
              <div className="ggulggul-bridge__art">
                <img
                  src="/images/home/yeoni-pass-mascot-480.webp"
                  srcSet="/images/home/yeoni-pass-mascot-240.webp 240w, /images/home/yeoni-pass-mascot-480.webp 480w"
                  sizes="(max-width: 560px) 148px, 168px"
                  width="480"
                  height="480"
                  alt="연꽃을 달고 달빛 운세 카드를 든 꽃돼지 연이"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="ggulggul-bridge__copy">
                <h2 id="ggulggul-title">달빛 따라, <span>꿀꿀운세로.</span></h2>
                <div className="ggulggul-bridge__actions">
                  <a className="ggulggul-bridge__entry" href={ggulggulFortuneHref("/yeongnyangi/fortune/")}>
                    연이의 꽃정원 둘러보기 <ArrowRight size={17} aria-hidden="true" />
                  </a>
                  <a className="text-link" href="/points/">
                    이용권 알아보기 <ChevronRight size={15} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <nav className="bottom-nav" aria-label="하단 메뉴">
        {[
          { id: "home", label: "홈", icon: House },
          { id: "questions", label: "상담하기", icon: PawPrint },
          { id: "library", label: "내 상담", icon: Bookmark },
        ].map((item) => (
          <button
            key={item.id}
            className={`${item.id === "questions" ? "center-nav" : ""} ${activeNav === item.id ? "active" : ""}`}
            aria-current={activeNav === item.id ? "page" : undefined}
            onClick={() => navigate(item.id)}
          >
            {item.id === "questions" ? (
              <span className="nav-avatar">
                <img src={imagePath("avatar")} width="45" height="38" alt="" />
              </span>
            ) : (
              <item.icon size={22} />
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <dialog
        ref={dialogRef}
        className="experience-dialog"
        aria-labelledby="panel-title"
        onCancel={closePanel}
        onClick={(event) => {
          if (event.target === event.currentTarget) closePanel();
        }}
      >
        <div className="dialog-inner">
          <div className="dialog-header">
            <span>
              <PawPrint size={17} />
              <span id="panel-title">{panel === "auth" ? "달빛 점술방의 문" : ""}</span>
            </span>
            <button
              className="icon-button"
              aria-label="닫기"
              onClick={closePanel}
            >
              <X size={22} />
            </button>
          </div>

          {panel === "auth" && (
            <div className="auth-panel panel-body">
              <div className="auth-tabs" aria-label="계정 메뉴">
                <button
                  aria-pressed={authMode === "login"}
                  onClick={() => setAuthMode("login")}
                >
                  로그인
                </button>
                <button
                  aria-pressed={authMode === "signup"}
                  onClick={() => setAuthMode("signup")}
                >
                  회원가입
                </button>
              </div>
              <Art
                eager
                name={authMode}
                className="auth-art"
                width={440}
                height={560}
                alt={
                  authMode === "login"
                    ? "달빛 문을 살짝 열고 기다리는 영냥이"
                    : "황금 열쇠를 들고 반기는 영냥이"
                }
              />
              <h2>
                {authMode === "login" ? "흥, 다시 왔네." : "처음 왔어? 반가워."}
              </h2>
              <p>
                네 이야기를 간직할 자리를
                <br />
                Code Destiny 계정으로 열어둘게.
              </p>
              <div className="social-auth-list" aria-label={`${authMode === "login" ? "로그인" : "회원가입"} 방식`}>
                {socialProviders.map((provider) => (
                  <a
                    key={provider.id}
                    className={`social-auth-button social-auth-button--${provider.id}`}
                    href={socialLoginHref(provider.id, returnTo, authMode)}
                  >
                    <KeyRound size={17} />
                    {provider.label}로 {authMode === "login" ? "로그인" : "시작하기"}
                  </a>
                ))}
              </div>
              <div className="availability-note">
                <KeyRound size={18} />
                <span>
                  Code Destiny의 기존 Google·네이버·카카오 로그인으로 연결해요.
                  <br />
                  로그인 뒤 이 화면으로 돌아와 보관함과 구매 권리를 확인할 수 있어요.
                </span>
              </div>
              <a className="primary-cta" href={loginHref(returnTo)}>
                Code Destiny 로그인 화면 열기
                <ArrowRight size={18} />
              </a>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
