"use client";
import {BUSINESS_IDENTITY} from '@/lib/site-policy-config.js';
import SessionControls from './SessionControls';
import { useEffect, useState } from "react";
import { Mail, MapPin, PawPrint, ShieldCheck, Sparkles } from "lucide-react";
import { ggulggulFortuneHref, legalLinks, loginHref, mainServiceLinks } from "./service-links";

export default function ServiceNavigation() {
  const [login, setLogin] = useState(loginHref("/yeongnyangi/fortune/"));
  const [ggulggul, setGgulggul] = useState(ggulggulFortuneHref("/yeongnyangi/fortune/"));
  useEffect(() => {
    setLogin(loginHref(window.location.pathname + window.location.search));
    setGgulggul(ggulggulFortuneHref("/yeongnyangi/fortune/"));
  }, []);
  return <footer className="service-navigation">
    <SessionControls />
    <div className="service-navigation__brand">
      <span className="service-navigation__avatar" aria-hidden="true">
        <img src="/assets/yeongnyangi/original/avatar.webp" width="54" height="44" alt="" loading="lazy" decoding="async" />
      </span>
      <div>
        <strong>사주보는 고양이 영냥이</strong>
        <p>달빛 점술방의 안내와 권리 정보를 한곳에 정리했어요.</p>
      </div>
    </div>

    <div className="service-navigation__links">
      <nav aria-label="영냥이 서비스 연결">
        {mainServiceLinks.map(link => <a key={link.label} href={link.href}>{link.label}</a>)}
        <a href={login}>Code Destiny 로그인</a>
        <a href={ggulggul}>꿀꿀 운세 바로가기</a>
      </nav>
      <nav aria-label="법적 안내">
        {legalLinks.map(link => <a key={link.label} href={link.href}>{link.label}</a>)}
      </nav>
    </div>

    <div className="service-navigation__notice">
      <ShieldCheck size={18} aria-hidden="true" />
      <p>영냥이 운세 콘텐츠는 오락 및 자기 성찰 목적의 참고 정보이며, 확정된 미래나 전문 자문을 보장하지 않습니다.</p>
    </div>

    <div className="service-navigation__partner">
      <img src="/assets/yeongnyangi/original/ggulggul-fortune.webp" width="512" height="512" alt="" loading="lazy" decoding="async" />
      <p><strong>꿀꿀 운세</strong>와 연결해 둘러볼 수 있지만, 영냥이 상담의 결제와 이용 권리는 별도 기준으로 운영해요.</p>
    </div>

    <dl className="service-navigation__business" aria-label="사업자 정보">
      <div><dt>상호</dt><dd>{BUSINESS_IDENTITY.companyName} · 대표 {BUSINESS_IDENTITY.representative}</dd></div>
      <div><dt>사업자등록번호</dt><dd>{BUSINESS_IDENTITY.registrationNumber}</dd></div>
      <div><dt>통신판매업 신고번호</dt><dd>{BUSINESS_IDENTITY.mailOrderNumber}</dd></div>
      <div><dt><MapPin size={14} aria-hidden="true" /> 주소</dt><dd>{BUSINESS_IDENTITY.address}</dd></div>
      <div><dt><Mail size={14} aria-hidden="true" /> 문의</dt><dd>{BUSINESS_IDENTITY.phone} · {BUSINESS_IDENTITY.email}</dd></div>
    </dl>

    <p className="service-navigation__fineprint">
      <PawPrint size={14} aria-hidden="true" />
      Code Destiny 계정과 프로필을 함께 사용하며, 영냥이 상담은 Family 이용권 또는 생선 상품별 단건 결제로 이용합니다.
      <Sparkles size={14} aria-hidden="true" />
    </p>
  </footer>;
}
