"use client";

import { ASSETS, stickerSrc } from "./chemiAssets";
import styles from "../../destiny-bias.module.css";

type Props = {
  groupNames: readonly string[];
  totalMembers: number;
  onStart: () => void;
};

export default function ChemiHook({ groupNames, totalMembers, onStart }: Props) {
  return (
    <section className={styles.hook} aria-labelledby="dbk-hook-title">
      <div className={styles.hookArt} aria-hidden>
        <picture>
          <source media="(min-width: 768px)" srcSet={ASSETS.hero} />
          <img src={ASSETS.heroMobile} alt="" width={780} height={520} decoding="async" fetchPriority="high" />
        </picture>
        <img className={`${styles.sticker} ${styles.stickerA}`} src={stickerSrc(1)} alt="" width={96} height={96} />
        <img className={`${styles.sticker} ${styles.stickerB}`} src={stickerSrc(4)} alt="" width={72} height={72} />
      </div>

      <p className={styles.kicker}>최애운명 · 무료 · 카드 공유</p>
      <h1 id="dbk-hook-title" className={styles.hookTitle}>
        내 최애가 내 현실 친구라면,
        <br />
        우리는 무슨 조합일까?
      </h1>
      <p className={styles.hookLead}>
        생년월일 하나로 두 사람의 사주 명식(연·월·일주)을 겹쳐 보고, 9가지 케미 유형 중 하나로 풀어 드려요. 점수 대신 유형, 예언 대신 상상 장면.
      </p>

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

      <button type="button" className={`${styles.ctaPrimary} ${styles.inlineCta}`} onClick={onStart}>
        내 최애 고르기
      </button>
      <p className={styles.hookGroups}>
        지원 그룹 · {groupNames.join(" · ")}
      </p>
    </section>
  );
}
