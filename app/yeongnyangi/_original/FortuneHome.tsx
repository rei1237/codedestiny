"use client";
import Image from "next/image";
import NightHero from "../_components/NightHero";
import QuestionSkyEntry from "../_components/QuestionSkyEntry";
import FounderTrust from "@/app/components/FounderTrust";
import SessionControls from "./SessionControls";
import {products} from "@/worker/yeongnyangi/payments/catalog";
const packages={mackerel:products.find(p=>p.id==='saju_mackerel')!};
import FishCatalog from "./FishCatalog";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Bookmark,
  BriefcaseBusiness,
  ChevronRight,
  Circle,
  Compass,
  Copy,
  Eye,
  Heart,
  House,
  KeyRound,
  MessageCircle,
  Moon,
  PawPrint,
  Sparkles,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import CatMotion from "./CatMotion";
import {
  concerns,
  recommendations,
  services,
} from "./home-data";
import { topicHref } from "./topics";
import { ggulggulFortuneHref, loginHref, socialLoginHref, type SocialProvider } from "./service-links";

type Panel =
  | "auth"
  | "library"
  | "notifications"
  | "service"
  | "fusion"
  | null;
const imagePath = (name: string) => `/assets/yeongnyangi/original/${name}.webp`;
const concernIcons: Record<string, typeof Heart> = {
  heart: Heart,
  wallet: Wallet,
  rings: Circle,
  briefcase: BriefcaseBusiness,
  book: BookOpen,
  eyes: Eye,
  sparkles: Sparkles,
};

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
function SectionHeading({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      {aside}
    </div>
  );
}

export default function FortuneHome() {
  const [panel, setPanel] = useState<Panel>(null);
  const [serviceId, setServiceId] = useState("saju");
  const [concern, setConcern] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [notice, setNotice] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("night");
  const [activeNav, setActiveNav] = useState("home");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const selectedConcern = concerns.find((item) => item.id === concern);
  const service = services.find((item) => item.id === serviceId) || services[0];
  const returnTo = typeof window === "undefined" ? "/yeongnyangi/fortune/" : window.location.pathname + window.location.search;
  const socialProviders: { id: SocialProvider; label: string }[] = [
    { id: "google", label: "Google" },
    { id: "naver", label: "네이버" },
    { id: "kakao", label: "카카오" },
  ];

  useEffect(() => {
    const now = new Date();
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        hour12: false,
      }).format(now),
    );
    setTimeOfDay(hour >= 7 && hour < 19 ? "day" : "night");
  }, []);

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

  function openPanel(next: Panel) {
    setNotice("");
    setPanel(next);
  }
  function closePanel() {
    setPanel(null);
    setNotice("");
    setActiveNav(
      window.scrollY <
        (document.getElementById("readings")?.offsetTop || 900) - 100
        ? "home"
        : "readings",
    );
  }
  function openService(id: string) {
    setServiceId(id);
    openPanel("service");
  }
  function navigate(id: string) {
    if (id === "chat") { window.location.assign("/yeongnyangi/room/"); return; }
    if (id === "home" || id === "readings") {
      closePanel();
      setActiveNav(id);
      document
        .getElementById(id === "home" ? "home" : "readings")
        ?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
    } else {
      setActiveNav(id);
      if(id==="cat")window.location.assign("/yeongnyangi/room/#daily");else window.location.assign("/yeongnyangi/library/");
    }
  }
  const titles: Record<Exclude<Panel, null>, string> = {
    auth: "달빛 점술방의 문",
    library: "나의 보관함",
    notifications: "점술방 소식",
    service: service.name,
    fusion: "영냥이의 초융합 운세",
  };

  return (
    <>
      <a className="skip-link" href="#readings">
        운세 목록으로 건너뛰기
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
            <a href="#readings"><Image src="/assets/yeongnyangi/ui/nav-readings.webp" width={28} height={28} alt=""/><span>운세 골라보기</span></a>
            <a href="/yeongnyangi/room/"><Image src="/assets/yeongnyangi/ui/nav-room.webp" width={28} height={28} alt=""/><span>영냥이의 방</span></a>
            <a href="#recommendations"><Image src="/assets/yeongnyangi/ui/nav-recommendations.webp" width={28} height={28} alt=""/><span>영냥이 추천</span></a>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button bell"
              aria-label="알림 보기"
              onClick={() => openPanel("notifications")}
            >
              <Bell size={21} />
            </button>
            <SessionControls compact onLogin={()=>{setAuthMode("login");openPanel("auth");}} />
          </div>
        </header>

        <main>
          <NightHero/>
              <nav className="hero-secondary-links" aria-label="다른 서비스와 상담 기록">
                <a href="/yeongnyangi/room/#daily">무료 운세</a>
                <a href="/yeongnyangi/library/">내 상담 기록</a>
                <a href="/ggulggul/">다른 운세 둘러보기</a>
                <a href="#founder-records">상담사 경력과 공개 예측 기록</a>
              </nav>

          <div className="main-content">
            <section
              className="concern-section"
              aria-labelledby="concern-title"
            >
              <div className="section-heading">
                <h2 id="concern-title">지금 뭐가 궁금해?</h2>
                <PawPrint size={19} className="gold" />
              </div>
              <p className="section-description">
                어려운 건 몰라도 돼. 네 고민부터 골라봐.
              </p>
              <div className="concern-chips">
                {concerns.map((item) => {
                  const Icon = concernIcons[item.icon];
                  return (
                    <button
                      key={item.id}
                      aria-pressed={concern === item.id}
                      onClick={() =>
                        setConcern(concern === item.id ? null : item.id)
                      }
                    >
                      <Icon size={17} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              {selectedConcern && (
                <div className="concern-answer" aria-live="polite">
                  <p>{selectedConcern.line}</p>
                  <div>
                    {selectedConcern.ids.map((id) => (
                      <button key={id} onClick={() => openService(id)}>
                        {services.find((x) => x.id === id)?.name} 살펴보기
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section
              className="readings-section"
              id="readings"
              aria-labelledby="readings-title"
            >
              <div className="section-heading">
                <h2 id="readings-title">운세 골라보기</h2>
                <span className="section-aside">여섯 가지 운명의 언어</span>
              </div>
              <div className="service-grid">
                {services.map((item) => (
                  <button
                    className={`service-card ${item.id === "ziwei" ? "ivory-art" : ""} ${selectedConcern && (selectedConcern.ids as readonly string[]).includes(item.id) ? "is-recommended" : ""}`}
                    key={item.id}
                    onClick={() => openService(item.id)}
                  >
                    <div className="service-image">
                      <Art
                        name={item.image}
                        alt={`${item.name}를 보는 영냥이`}
                      />
                      <span className="card-ornament" aria-hidden="true">
                        ✧
                      </span>
                    </div>
                    <div className="service-copy">
                      <h3>{item.name}</h3>
                      <p>{item.subtitle}</p>
                      <span>
                        보러가기 <ArrowRight size={14} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>


            <QuestionSkyEntry/>
            <button
              className="prologue-banner"
              onClick={() => window.location.assign("/yeongnyangi/room/")}
            >
              <Art name="story-mirror" className="prologue-backdrop" />
              <span className="prologue-copy">
                <span className="small-label">
                  <BookOpen size={14} /> 영냥이의 방 · 프롤로그
                </span>
                <strong>
                  두 대통령의 운명을 맞힌 밤, <br />나는 고양이가 됐다.
                </strong>
                <span className="text-link">
                  그날의 이야기 <ArrowRight size={15} />
                </span>
              </span>
              <Art
                name="surprised"
                className="prologue-cat"
                width={480}
                height={640}
              />
            </button>

            <FounderTrust/>
            <aside className="starter-invitation">
              <h2>{Number(packages.mackerel.priceKRW) === 1000 ? "천원부터 시작하는 운세" : `${packages.mackerel.priceKRW.toLocaleString("ko-KR")}원부터 시작하는 운세`}</h2>
              <p>가볍게 시작해도, 네 이야기는 깊이 있게. 기질과 고민의 흐름을 읽고 오늘 해볼 작은 행동까지 짚어줄게.</p>
              <a href="/yeongnyangi/fortune/?domain=saju&fish=mackerel">{packages.mackerel.priceKRW.toLocaleString("ko-KR")}원 상담 알아보기 →</a>
              {" · "}
              <a href="/yeongnyangi/1000-won-fortune/">천원사주 안내 보기</a>
              {" · "}<a href="/yeongnyangi/1000-won-fortune/#example">결제 전 상담 예시 읽기</a>
            </aside>


            <section className="ggulggul-bridge" aria-labelledby="ggulggul-title">
              <div className="ggulggul-bridge__art">
                <img
                  src="/assets/yeongnyangi/original/ggulggul-fortune.webp"
                  width="512"
                  height="512"
                  alt="연꽃 위에서 웃고 있는 꿀꿀 운세 꽃돼지"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="ggulggul-bridge__copy">
                <span>Code Destiny 연결</span>
                <h2 id="ggulggul-title">연이의 따뜻한 운세도 만나봐.</h2>
                <p>
                  Code Destiny의 꽃돼지 연이가 전하는 또 다른 이야기. 상담과 이용 방식은 각 서비스에서 확인해 줘.
                </p>
                <div>
                  <a className="outlined-cta" href="/points/">
                    꽃돼지 이용권 알아보기 <ArrowRight size={17} />
                  </a>
                  <a className="text-link" href={ggulggulFortuneHref("/yeongnyangi/fortune/")}>
                    꿀꿀 운세로 이동 <ChevronRight size={15} />
                  </a>
                </div>
              </div>
            </section>
            <section className="fusion-section" aria-labelledby="fusion-title">
              <div className="fusion-card">
                <Art name="story-curse" className="fusion-art" />
                <div className="fusion-shade" />
                <div className="fusion-top">
                  <Sparkles size={18} aria-hidden="true" />
                  <Moon size={25} />
                </div>
                <h2 id="fusion-title">
                  흩어진 운명을,
                  <br />
                  <span>하나의 이야기로.</span>
                </h2>
                <p className="fusion-name">영냥이의 초융합 운세</p>
                <p className="fusion-description">
                  서로 다른 운세의 시선을 모아
                  <br />
                  나를 더 깊이 이해하는 시간.
                </p>
                <div className="fusion-systems">
                  사주 · 자미두수 · 숙요 · 베다 · 점성술 · 타로
                </div>
                <button
                  className="outlined-cta"
                  onClick={() => openPanel("fusion")}
                >
                  내 운명 깊게 보기 <ArrowRight size={17} />
                </button>
              </div>
            </section>

            <section
              className="recommendations-section"
              id="recommendations"
              aria-labelledby="recommendations-title"
            >
              <div className="section-heading">
                <h2 id="recommendations-title">영냥이가 골라봤어</h2>
                <button
                  className="icon-button"
                  aria-label="다음 추천 보기"
                  onClick={() =>
                    carouselRef.current?.scrollBy({
                      left: 245,
                      behavior: matchMedia("(prefers-reduced-motion: reduce)")
                        .matches
                        ? "instant"
                        : "smooth",
                    })
                  }
                >
                  <ArrowRight size={20} />
                </button>
              </div>
              <div
                className="recommendation-carousel"
                ref={carouselRef}
                tabIndex={0}
                aria-label="추천 운세 가로 목록"
              >
                {recommendations.map((item) => (
                  <a
                    className="recommendation-card"
                    key={item.title}
                    href={topicHref(item.target, item.topic)}
                    aria-label={`${item.category} · ${item.title} 상담 시작`}
                  >
                    <Art name={item.image} />
                    <span className="recommendation-copy">
                      <span>{item.category}</span>
                      <strong>{item.title}</strong>
                      <span className="recommendation-link">
                        이야기 살펴보기 <ArrowRight size={14} />
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </section>

            <section
              className="room-section"
              id="room"
              aria-labelledby="room-title"
            >
              <SectionHeading>운세가 끝나도, 머물러도 돼.</SectionHeading>
              <div className="room-note">
                <CatMotion daytime={timeOfDay === "day"} />
                <div className="room-note-copy">
                  <span className="room-time">
                    {timeOfDay === "day" ? (
                      <Sun size={14} />
                    ) : (
                      <Moon size={14} />
                    )}
                    {timeOfDay === "day"
                      ? "잠깐 쉬어가는 오후"
                      : "모두 잠든 뒤의 점술방"}
                  </span>
                  <h3 id="room-title">…한마디 더 해줄까.</h3>
                  <p>
                    운명은 읽는 거지만,
                    <br />네 하루를 사는 건 너니까.
                  </p>
                  <button
                    className="text-link"
                    onClick={() => window.location.assign("/yeongnyangi/room/")}
                  >
                    영냥이의 방 들어가기 <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </section>

            <footer className="footer">
              <PawPrint size={22} />
              <strong>사주보는 영냥이</strong>
              <p>네 이야기에, 작은 달빛 하나.</p>
              <span>FORTUNE SOUL CAT</span>
              <a href="#home">
                처음으로 <ArrowDown size={13} className="up-arrow" />
              </a>
            </footer>
          </div>
        </main>
      </div>

      <nav className="bottom-nav" aria-label="하단 메뉴">
        {[
          { id: "home", label: "홈", icon: House },
          { id: "readings", label: "운세", icon: Compass },
          { id: "cat", label: "영냥이", icon: PawPrint },
          { id: "chat", label: "수다방", icon: MessageCircle },
          { id: "library", label: "보관함", icon: Bookmark },
        ].map((item) => (
          <button
            key={item.id}
            className={`${item.id === "cat" ? "center-nav" : ""} ${activeNav === item.id ? "active" : ""}`}
            aria-current={activeNav === item.id ? "page" : undefined}
            onClick={() => navigate(item.id)}
          >
            {item.id === "cat" ? (
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
              <span id="panel-title">{panel ? titles[panel] : ""}</span>
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

          {panel === "service" && (
            <div className="service-panel panel-body">
              <Art
                eager
                name={service.image}
                className={`detail-art ${service.id === "ziwei" ? "ivory-detail" : ""}`}
                alt={`${service.name}를 보는 영냥이`}
              />
              <h2>{service.subtitle}</h2>
              <a className="outlined-cta" href={`/yeongnyangi/fortune/?domain=${service.id}`}>상담 살펴보기 <ArrowRight size={18} /></a>
              <p>{service.description}</p>
              <ul>
                {service.details.map((item) => (
                  <li key={item}>
                    <Sparkles size={15} />
                    {item}
                  </li>
                ))}
              </ul>
              </div>
          )}

          {panel === "fusion" && (
            <div className="panel-body">
              <FishCatalog fusionOnly layout="list" />
            </div>
          )}

          {panel === "library" && (
            <div className="library-panel panel-body">
              <Art
                eager
                name="night-read"
                className="empty-art"
                width={310}
                height={325}
              />
              <h2>네 이야기를 위한 서랍.</h2>
              <p>
                운세 리포트를 다시 펼쳐볼 수 있는
                <br />
                보관함을 준비하고 있어요.
              </p>
              <button
                className="outlined-cta"
                onClick={() => navigate("readings")}
              >
                운세 둘러보기
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {panel === "notifications" && (
            <div className="panel-body notifications-panel">
              <Moon size={38} className="gold" />
              <h2>점술방에 어서 와.</h2>
              <p>
                새로운 소식이 생기면 여기에 전할게.
                <br />
                오늘은 내 이야기부터 들어볼래?
              </p>
              <button
                className="outlined-cta"
                onClick={() => window.location.assign("/yeongnyangi/room/")}
              >
                영냥이의 이야기 보기
                <ArrowRight size={18} />
              </button>
            </div>
          )}
          {notice && (
            <p className="status-notice" role="status">
              {notice}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
