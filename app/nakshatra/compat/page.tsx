"use client";

import styles from '../library.module.css';
import { NAKSHATRA_COMPAT_PRICE_LABEL } from '../_lib/pricing';
import Link from "next/link";
import NakshatraCompatClient from "./NakshatraCompatClient";
import { useNakshatraCopy } from "../_lib/copy";

export default function NakshatraCompatPage() {
  const copy = useNakshatraCopy();
  return (
    <main className={styles.page}>

      <div className="mx-auto w-full max-w-2xl">
        <nav className="mb-6 text-sm">
          <Link href="/nakshatra" className="text-amber-100/80 transition hover:text-amber-100">{copy.backToHubLink}</Link>
        </nav>
        <img className={styles.banner} src="/images/nakshatra/moonlight-library-960.webp" srcSet="/images/nakshatra/moonlight-library-480.webp 480w, /images/nakshatra/moonlight-library-960.webp 960w, /images/nakshatra/moonlight-library-1672.webp 1672w" sizes="(max-width: 760px) calc(100vw - 40px), 900px" width="1672" height="941" alt="두 사람의 별을 펼치는 달빛 서고" />
        <header className="mb-7 text-center">
          <h1 className="mt-3 break-keep text-3xl font-bold leading-tight text-slate-50 md:text-4xl">{copy.compatPageQuestion || copy.compatPageHeading}</h1>
          <p className="mx-auto mt-4 max-w-md break-keep text-sm leading-7 text-slate-300">
            {copy.compatPageSub}
          </p>
        </header>
        <p className={styles.notice}>궁합 단건 {NAKSHATRA_COMPAT_PRICE_LABEL} · 개인 유료 상담 선구매 없이 이용할 수 있어요. 이용권·월정석 적용은 결제창에서 확인합니다.</p>
        <NakshatraCompatClient />
      </div>
    </main>
  );
}
