"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ALL_TESTS, CATEGORIES } from "./data/testData";
import TestArtwork from "./TestArtwork";
import "./psychotest.css";

const TestPlayer = dynamic(() => import("./TestPlayer"), { loading: () => <p className="psy-loading" role="status">테스트를 준비하고 있어요.</p> });

export default function PsychotestExperience({ testId }: { testId?: string }) {
  const [category, setCategory] = useState("전체");
  const tests = ALL_TESTS.filter(test => category === "전체" || test.categories.includes(category));
  if (testId) return <main className="psy-experience"><TestPlayer key={testId} testId={testId} onBack={() => window.location.assign("/psychotest/")} /></main>;
  return <main className="psy-experience">
    <div className="psy-gallery">
      <Link href="/ggulggul/" className="psy-back">← 꿀꿀운세</Link>
      <section className="psy-hero">
        <div><h1>나는 어떤<br/><em>장면</em>을 닮았을까.</h1><p>익숙한 나에게서 발견하는 뜻밖의 한 조각.<br/>마음이 가는 테스트를 골라, 가볍게 시작해 보세요.</p><span className="psy-free">{ALL_TESTS.length}가지 심리테스트 · 모두 무료</span></div>
        <Link href="/psychotest/aura/" className="psy-featured"><Image src="/images/psychotest/yeoni-youngyangi-gallery-v1.webp" width={1200} height={800} alt="연이와 영냥이가 함께 카드를 펼치는 심리테스트 방" priority /><div><span>연이 · 영냥이와 함께</span><h2>오늘의 나를 만나는 시간</h2><p>3분의 작은 발견 <span aria-hidden="true">↗</span></p></div></Link>
      </section>
      <section aria-label="심리테스트 고르기">
        <div className="psy-filter" role="group" aria-label="테스트 주제">{CATEGORIES.map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <p className="psy-count" aria-live="polite">{category === "전체" ? "지금, 궁금한 나를 만나보세요" : `${category}에 관한 작은 발견`} <span>{tests.length}개</span></p>
        <div className="psy-grid">{tests.map(test => <Link key={test.id} href={`/psychotest/${test.id}/`} className="psy-test"><TestArtwork id={test.id}/><div className="psy-test-copy"><p>{test.categories.join(" · ")}<span>{test.time}</span></p><h2>{test.name}</h2><p className="psy-description">{test.desc}</p><span className="psy-card-price">무료</span><span className="psy-card-action">테스트 만나보기 <span aria-hidden="true">↗</span></span></div></Link>)}</div>
      </section>
      <aside className="psy-editorial"><h2>어떤 무료 심리테스트부터 해볼까요?</h2><p>평소 선택 습관이 궁금하다면 <Link href="/psychotest/mbti/">MBTI 성격 경향</Link>, 소음이나 분위기에 쉽게 지친다면 <Link href="/psychotest/hsp/">HSP·예민도 테스트</Link>에서 시작해 보세요. <Link href="/psychotest/mental/">정신연령 테스트</Link>는 생활 속 사고 습관을, <Link href="/psychotest/empathy/">공감 능력 테스트</Link>는 타인의 마음에 반응하는 방식을 돌아보는 질문입니다.</p><h3>연애와 일의 고민으로 이어가기</h3><p><Link href="/psychotest/romance/">연애 심리테스트</Link>로 표현 취향을 살핀 뒤 <Link href="/animal/mbti/">MBTI 연애 궁합</Link>에서 서로의 차이를 이야기해 보세요. 회사에서의 반응은 <Link href="/psychotest/office/">직장인 테스트</Link>, 출생정보로 보는 작업 성향은 <Link href="/saju/career-style/">가입 후 무료인 나의 일 스타일 리포트</Link>에서 탐색할 수 있습니다.</p><h3>출생정보로 나를 읽고 싶다면</h3><p><Link href="/human-design/guide/">휴먼 디자인 무료 차트 안내</Link>에서는 바디그래프·타입·권위를 읽는 순서를 소개합니다. 질문에 답하는 심리테스트와 출생정보를 쓰는 상징 해석은 서로 다른 방식입니다.</p><h3>결과는 꼬리표보다, 대화의 시작.</h3><p>지금의 기분이나 상황에 따라 답은 달라질 수 있어요. 나와 닮은 설명과 다른 설명을 함께 살펴보세요. 이 테스트는 자기이해를 위한 콘텐츠이며, 공식 MBTI 검사나 임상 심리검사·진단을 대신하지 않습니다.</p><Link href="/methodology/">콘텐츠 해석 기준 보기 ↗</Link></aside>
    </div>
  </main>;
}
