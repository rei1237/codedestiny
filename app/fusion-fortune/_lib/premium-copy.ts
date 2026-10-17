import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

const COPY = {
  ko: {
    expandAll: "전체 펼치기", collapseAll: "전체 접기",
    heading: "여섯 관점이 하나의 답으로",
    description: "각 체계의 해석을 모아, 같은 방향과 서로 다른 조건을 살펴보고 있어요.",
    completed: "해석 완료", active: "해석 중", pending: "준비 중", paused: "이어받기 대기",
    center: "교차 종합", composing: "답을 엮는 중", ready: "종합 완료",
    count: "완료한 체계", read: "도착한 해석 읽기", pause: "움직임 멈추기", resume: "움직임 켜기",
    progress: "완료한 분석 묶음", repair: "내용 확인 중", art: "챕터 분위기를 위한 상징 이미지",
    domainHeading: "영역별 상담", domainIntro: "여섯 체계가 함께 가리키는 신호를 삶의 영역별로 다시 읽었어요.", domainPending: "이 장은 보강 중이에요", domainShort: "영역별 상담",
    domainLabels: ["타고난 성향","인생의 시기","연애","결혼·배우자","재물","직업·일","건강·생활 리듬","인간관계"],
  },
  en: {
    expandAll: "Expand all", collapseAll: "Collapse all",
    heading: "Six perspectives, one considered answer",
    description: "Bringing the readings together to explore shared directions and different conditions.",
    completed: "Reading complete", active: "Reading", pending: "Preparing", paused: "Waiting to resume",
    center: "Synthesis", composing: "Connecting insights", ready: "Synthesis complete",
    count: "Systems complete", read: "Read available insights", pause: "Pause motion", resume: "Enable motion",
    progress: "Analysis groups complete", repair: "Reviewing content", art: "Symbolic chapter artwork",
    domainHeading: "Life-area chapters", domainIntro: "The signals the six systems share, read again for each area of life.", domainPending: "This chapter is still being completed", domainShort: "Life areas",
    domainLabels: ["Innate nature","Life seasons","Love","Marriage & partner","Wealth","Career & work","Health & daily rhythm","Relationships"],
  },
  ja: {
    expandAll: "すべて開く", collapseAll: "すべて閉じる",
    heading: "六つの視点から、一つの答えへ",
    description: "それぞれの解釈を合わせ、共通する方向と異なる条件を読み解いています。",
    completed: "解釈完了", active: "解釈中", pending: "準備中", paused: "再開待ち",
    center: "交差総合", composing: "答えを編集中", ready: "総合完了",
    count: "完了した体系", read: "届いた解釈を読む", pause: "動きを止める", resume: "動きを再開",
    progress: "完了した分析グループ", repair: "内容を確認中", art: "章の雰囲気を表す象徴的な画像",
    domainHeading: "分野別の相談", domainIntro: "六つの体系が共に示すサインを、人生の分野ごとに読み直しました。", domainPending: "この章は補完中です", domainShort: "分野別",
    domainLabels: ["生まれ持った気質","人生の時期","恋愛","結婚・配偶者","金運","仕事","健康・生活リズム","人間関係"],
  },
  zh: {
    expandAll: "全部展开", collapseAll: "全部收起",
    heading: "六种视角，汇成一个答案",
    description: "汇集各体系的解读，梳理共同方向与不同的适用条件。",
    completed: "解读完成", active: "解读中", pending: "准备中", paused: "等待继续",
    center: "交叉综合", composing: "正在整理答案", ready: "综合完成",
    count: "已完成体系", read: "阅读已完成的解读", pause: "暂停动画", resume: "开启动画",
    progress: "已完成分析组", repair: "正在核对内容", art: "营造章节氛围的象征性图片",
    domainHeading: "分领域解读", domainIntro: "把六大体系共同指向的信号，按人生领域重新解读。", domainPending: "本章仍在补充中", domainShort: "分领域",
    domainLabels: ["天生性格","人生阶段","恋爱","婚姻与伴侣","财运","事业与工作","健康与生活节奏","人际关系"],
  },
};

export function useFusionPremiumCopy() {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  const key = locale === "zh-CN" || locale === "zh-TW" ? "zh" : locale;
  return COPY[key as keyof typeof COPY] || COPY.en;
}
