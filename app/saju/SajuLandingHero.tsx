import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import SeoLandingBirthForm from "../components/SeoLandingBirthForm";
import styles from "./saju-landing.module.css";

export default function SajuLandingHero() {
  return (
    <header className={styles.hero}>
      <div className={styles.intro}>
        <h1>무료 사주 풀이<span>나의 기질과<br />지금의 흐름을 읽다</span></h1>
        <p>태어난 날에 담긴 나의 강점과 반복되는 패턴.<br />명식과 오행으로 차근차근 살펴보세요.</p>
        <a className={styles.jump} href="#sajuBirthForm">내 사주 시작하기 <ArrowDown size={16} aria-hidden="true" /></a>
        <div className={styles.scope}>
          <strong>기본 명식 · 오행 · 십성</strong>
          <span>입력 후 로그인하면 무료로 확인해요. AI 심화 상담은 별도 선택입니다.</span>
        </div>
      </div>
      <div id="sajuBirthForm" className={styles.form}>
        <SeoLandingBirthForm
          heading="태어난 정보를 알려주세요"
          submitLabel="무료 사주 결과 보기"
          submitHref="/ggulggul/?action=checkPrivacyAndCalculate"
          fields={{ time: true, gender: true, calendar: true }}
          compact
        />
      </div>
      <Link className={styles.guide} href="/guides/complete-guide-to-saju">사주가 처음이라면, 명식 읽는 법 <ArrowRight size={16} aria-hidden="true" /></Link>
    </header>
  );
}
