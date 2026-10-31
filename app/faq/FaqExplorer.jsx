"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { PolicyAccordion } from "../components/PolicyGuide";
import styles from "./faq.module.css";
import { attachFaqSearch } from "../../js/faq-search.mjs";

export default function FaqExplorer({ items }) {
  const inputId = useId();
  const rootRef = useRef(null);
  useEffect(() => attachFaqSearch(rootRef.current), []);

  return (
    <section ref={rootRef} data-faq-search id="faq-list" className={styles.explorer} aria-labelledby="faq-heading">
      <div className={styles.heading}>
        <h2 id="faq-heading">어떤 점이 궁금하세요?</h2>
        <p>질문과 답변에서 찾아드려요. 궁금한 질문을 펼쳐 읽어보세요.</p>
      </div>
      <div data-faq-controls hidden className={styles.search} role="search" aria-label="자주 묻는 질문 검색">
        <label htmlFor={inputId}>궁금한 내용 검색</label>
        <div className={styles.inputRow}>
          <input id={inputId} type="search" data-faq-input placeholder="예: 결제, 태어난 시간, 결과" aria-controls="faq-results" autoComplete="off" />
          <button data-faq-clear hidden type="button">전체 보기</button>
        </div>
      </div>
      <p data-faq-count className={styles.count} role="status">전체 질문 {items.length}개</p>
      <div id="faq-results" className={styles.results}>
        {items.map(item => <PolicyAccordion key={item.question} title={item.question}><p>{item.answer}</p>{item.links?.length > 0 && <div className="cd-chip-wrap">{item.links.map(link => <Link className="cd-chip" key={link.href} href={link.href}>{link.label}</Link>)}</div>}</PolicyAccordion>)}
        <div data-faq-empty hidden className={styles.empty}><h3>일치하는 질문이 없어요</h3><p>짧은 단어로 다시 검색하거나 문의로 상황을 알려주세요.</p><Link href="/contact/" className="cd-yehwa-button cd-yehwa-button--secondary">문의하기</Link></div>
      </div>
      <aside className={styles.next}>
        <div><h2>궁금증이 풀렸다면, 나의 흐름을 만나보세요</h2><p>사주로 기질을 살피고, 타로로 지금의 고민을 정리해 보세요.</p></div>
        {/* 정적 셸은 RSC 경로가 아니므로 문서 이동을 유지합니다. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/ggulggul/" className="cd-yehwa-button cd-yehwa-button--primary">운세 둘러보기</a>
        <Link href="/contact/">아직 궁금한 점 문의하기</Link>
      </aside>
    </section>
  );
}
