"use client";
import { useEffect, useState, type ReactNode } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { productMasters } from "@/components/fortune/master-profiles";
import styles from "./consultation-master-intro.module.css";

const rooms = {
  karma: { title: "네오와 서한비의 붉은 실", label: "운명의 업 · 공동 마스터 상담", image: "karma-destiny-ai", alt: "네오와 서한비가 반복되는 관계를 상징하는 붉은 실의 매듭을 살피는 상담", lead: "반복되는 선택과 관계의 매듭을 살피고, 지금 바꿀 수 있는 한 걸음을 찾습니다." },
  vedic: { title: "윤달의 베다점 상담실", label: "베다점 전문가 상담 · 마스터 윤달", image: "vedic-ai", alt: "윤달이 베다 차트와 달의 별자리, 시기의 흐름을 살피는 상담", lead: "라그나·나크샤트라·다샤를 삶의 언어로 풀어, 지금 지나가는 시기와 선택의 방향을 읽습니다." },
};

const translated: Record<LoadingLocale, [string, string, string]> = {
  ko: [rooms.karma.title, rooms.vedic.title, "상담 준비하기"],
  en: ["Neo & Seo Hanbi: Red Thread", "Yun-dal’s Vedic Consultation", "Prepare your consultation"],
  ja: ["ネオとソ・ハンビの赤い糸", "ユンダルのヴェーダ占星術相談", "相談の準備をする"],
  "zh-CN": ["尼奥与徐韩妃的红线", "润月的吠陀占星咨询", "准备咨询"],
  "zh-TW": ["尼奧與徐韓妃的紅線", "潤月的吠陀占星諮詢", "準備諮詢"],
  vi: ["Sợi chỉ đỏ của Neo và Seo Hanbi", "Tư vấn Vệ Đà cùng Yun-dal", "Chuẩn bị tư vấn"],
  hi: ["नियो और सियो हानबी का लाल धागा", "युन-दल का वैदिक परामर्श", "परामर्श की तैयारी करें"],
  es: ["El hilo rojo de Neo y Seo Hanbi", "Consulta védica con Yun-dal", "Preparar la consulta"],
  fr: ["Le fil rouge de Neo et Seo Hanbi", "Consultation védique avec Yun-dal", "Préparer la consultation"],
  de: ["Der rote Faden von Neo und Seo Hanbi", "Vedische Beratung mit Yun-dal", "Beratung vorbereiten"],
  nl: ["De rode draad van Neo en Seo Hanbi", "Vedisch consult met Yun-dal", "Consult voorbereiden"],
  ms: ["Benang Merah Neo dan Seo Hanbi", "Konsultasi Veda Yun-dal", "Sediakan konsultasi"],
};
const masterNames: Record<string, string> = { "네오": "Neo", "서한비": "Seo Hanbi", "윤달": "Yun-dal" };
export const masterPreparationLabel = (locale: LoadingLocale) => translated[locale][2];

/** Presentation only: input, payment and delivered reading data stay with each route. */
export default function ConsultationMasterIntro({ kind, compact = false, children, lead, label, actionHref, actionId }: { kind: keyof typeof rooms; compact?: boolean; children?: ReactNode; lead?: string; label?: string; actionHref?: string; actionId?: string }) {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    sync();
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => { window.removeEventListener("languagechange", sync); window.removeEventListener("cd:locale-ready", sync); };
  }, []);
  const room = rooms[kind];
  const isKo = locale === "ko";
  const copy = translated[locale];
  const title = copy[kind === "karma" ? 0 : 1];
  return <section className={styles.room} data-master-room={kind} data-compact={compact || undefined} aria-label={title}>
    <img className={styles.art} src={`/images/service-introductions/${room.image}-640.webp`} srcSet={`/images/service-introductions/${room.image}-640.webp 640w, /images/service-introductions/${room.image}.webp 1536w`} sizes={compact ? "160px" : "(max-width: 960px) 100vw, 52vw"} width={1536} height={1024} alt={isKo ? room.alt : title} decoding="async" />
    <div className={styles.copy}>
      <p className={styles.eyebrow}>{isKo ? room.label : label || (kind === "karma" ? "Neo · Seo Hanbi" : "Yun-dal")}</p>
      <h2>{title}</h2>
      {!compact && <><p className={styles.lead}>{isKo ? room.lead : lead}</p><ul className={styles.masters} aria-label={isKo ? "이 상담의 마스터" : title}>{productMasters[kind].map(master => <li key={master.name}><img src={master.avatar} width={48} height={48} alt="" /><div><strong>{isKo ? master.name : (masterNames[master.name] || master.name)}</strong>{isKo && <><span>{master.role}</span><p>“{master.line}”</p></>}</div></li>)}</ul></>}
      {(children || actionHref) && <div className={styles.actions}>{actionHref && <a id={actionId} href={actionHref}>{copy[2]}</a>}{children}</div>}
    </div>
  </section>;
}
