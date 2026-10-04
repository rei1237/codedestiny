"use client";

import { STAGE } from "./chemiAssets";
import styles from "../../destiny-bias.module.css";
import art from "../../stage-art.module.css";

type Props = {
  groupNames: readonly string[];
  totalMembers: number;
  onStart: () => void;
};

export default function ChemiHook({ groupNames, totalMembers, onStart }: Props) {
  return (
    <section className={styles.hook} aria-labelledby="dbk-hook-title">
      <div className={art.hero}>
        <picture aria-hidden>
          <source media="(min-width: 768px)" srcSet={STAGE.hero} />
          <img className={art.heroImg} src={STAGE.heroTall} alt="" width={780} height={1170} decoding="async" fetchPriority="high" />
        </picture>
        <div className={art.heroCopy}>
          <p className={art.heroKicker}>최애운명 · Encore Night</p>
          <h1 id="dbk-hook-title" className={art.heroTitle}>
            내 최애가 내 현실 친구라면,
            <br />
            우리는 <em>무슨 조합</em>일까?
          </h1>
        </div>
      </div>

      <p className={styles.hookLead}>
        생년월일 하나로 나와 최애의 사주 명식(연·월·일주)을 겹쳐서, 케미 점수와 등급이 찍힌 포토카드 한 장으로 뽑아 드려요. 무료, 로그인 없이 바로.
      </p>

      <button type="button" className={`${styles.ctaPrimary} ${styles.inlineCta}`} onClick={onStart}>
        내 최애 고르기
      </button>

      <ul className={styles.hookFacts} aria-label="이용 안내">
        <li>
          <strong>{groupNames.length}그룹 {totalMembers}명</strong> 공식 프로필 생년월일 기준
        </li>
        <li>
          <strong>로그인 없이</strong> 바로 결과 · 저장만 로그인
        </li>
        <li>
          <strong>생일은 카드에 안 실려요</strong> · 공유는 유형과 한 줄만
        </li>
      </ul>
      <p className={styles.hookGroups}>
        지원 그룹 · {groupNames.join(" · ")}
      </p>
    </section>
  );
}
