import { ArrowUpRight } from "lucide-react";
import { PriceBadge } from "../components/PriceBadge";
import { SAJU_SERVICE_GROUPS, SAJU_SERVICE_ITEMS } from "../../lib/saju/saju-service-catalog.mjs";
import styles from "./saju-service-catalog.module.css";

const numerals = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];

function Price({ item }) {
  if (item.featureKey) return <PriceBadge featureKey={item.featureKey} className={styles.price} />;
  return item.free ? <span className={styles.free}>무료</span> : null;
}

/**
 * /saju/#services — 사주 기능 전체 목록(정본: lib/saju/saju-service-catalog.mjs).
 * 강약: 대표 상담만 타로 카드, 나머지는 압축 행. 채움 버튼은 두지 않는다 — 이 페이지의 채움
 * 행동은 히어로 폼의 제출 하나다. 링크는 전부 서버 HTML <a> 라 내부 링크 깊이 가드가 읽는다.
 */
export default function SajuServiceCatalog() {
  return (
    <section id="services" aria-labelledby="sajuServicesTitle" className={styles.catalog}>
      <div className={styles.head}>
        <h2 id="sajuServicesTitle">사주 서비스 한눈에 보기</h2>
        <p>꿀꿀운세의 사주 기능 {SAJU_SERVICE_ITEMS.length}가지를 한곳에 모았어요. 대표 상담부터 무료 풀이, 리포트, 공부까지.</p>
      </div>
      <nav aria-label="사주 서비스 묶음" className={styles.chips}>
        {SAJU_SERVICE_GROUPS.map((group) => <a key={group.id} href={`#${group.id}`}>{group.title}</a>)}
      </nav>
      {SAJU_SERVICE_GROUPS.map((group, groupIndex) => (
        <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className={styles.group}>
          <h3 id={`${group.id}-title`}>{group.title}</h3>
          <p className={styles.lead}>{group.lead}</p>
          {groupIndex === 0 ? (
            <ul className={styles.deck}>
              {group.items.map((item, index) => (
                <li key={item.href} className={styles.tarot} style={{ "--tarot-hue": item.hue }}>
                  <a href={item.href}>
                    <span className={styles.numeral} aria-hidden="true">{numerals[index]}</span>
                    <img src={item.image} alt="" width="1200" height="675" loading="lazy" decoding="async" />
                    <span className={styles.tarotBody}>
                      <h4>{item.name}</h4>
                      <span className={styles.line}>{item.line}</span>
                      <Price item={item} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={styles.rows}>
              {group.items.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>
                    <span className={styles.rowBody}>
                      <h4>{item.name}</h4>
                      <span className={styles.line}>{item.line}</span>
                    </span>
                    <Price item={item} />
                    <ArrowUpRight className={styles.arrow} size={16} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </section>
  );
}
