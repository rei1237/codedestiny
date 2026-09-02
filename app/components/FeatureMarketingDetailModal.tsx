"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { useBodyScrollLock } from "@/app/_lib/body-scroll-lock";
import { useServerPrice } from "@/app/hooks/useServerPrice";
import { useT, useTPick, type Translate, type TranslatePick } from "@/lib/i18n/useT";

type FeatureMarketingBadge = {
  text?: string;
  tone?: string;
};

export type FeatureMarketingTarget = {
  title: string;
  description?: string;
  subtitle?: string;
  href: string;
  slug?: string;
  featureKey?: string;
  category?: string;
  accessType?: string;
  priceLabel?: string;
  coinPrice?: number | null;
  badges?: FeatureMarketingBadge[];
};

type FeatureMarketingResultPreview = {
  lines: string[];
  caption?: string;
};

/* 소제목이 붙은 샘플 리포트. 예전에는 resultPreview 를 blur 로 가렸지만, 가려진 결과는
   호기심이 아니라 "일부러 숨긴다"는 인상을 만들어 신뢰를 깎았다. 이제 그대로 읽히게 둔다.
   정본은 정적 셸 index.html 의 FEATURE_MARKETING_COPY 이며 여기는 /app 허브용 사본이다. */
type FeatureMarketingSampleReport = {
  sections: { heading?: string; body: string }[];
  continuation?: string;
  caption?: string;
};

type FeatureMarketingCopy = {
  category: string;
  badge: string;
  headline: string;
  subheadline: string;
  painPoints: string[];
  unlockBenefits: string[];
  previewText: string;
  trustNotes: string[];
  recommendedFor?: string[];
  resultPreview?: FeatureMarketingResultPreview;
  sampleReport?: FeatureMarketingSampleReport;
  /* 분석 깊이는 사람이 실측해 적은 양의 정수만 넣는다. 값이 없으면 섹션을 렌더하지 않는다. */
  reportScale?: { chapters?: number; sections?: number; dataPoints?: number; minWords?: number; readMinutes?: number };
  answersQuestions?: string[];
  analysisSteps?: { label: string; detail?: string }[];
  valueCompare?: { rows: { axis: string; free?: string; premium: string }[] };
  faq?: { q: string; a: string }[];
  ctaNote?: string;
  ctaLabel: string;
};

const SCALE_LABELS: [keyof NonNullable<FeatureMarketingCopy["reportScale"]>, string][] = [
  ["chapters", "preview.scaleChapters"],
  ["sections", "preview.scaleSections"],
  ["dataPoints", "preview.scaleDataPoints"],
  ["minWords", "preview.scaleMinWords"],
  ["readMinutes", "preview.scaleReadMinutes"],
];

/* 숫자 자릿수 구분은 기존 동작(ko-KR)을 그대로 둔다 — 하드코딩된 로케일 포맷 정리는
   별건(PR #983)이고, 이 칩의 값 범위에서는 서식이 갈리지 않는다. */
function scaleChips(scale: FeatureMarketingCopy["reportScale"], t: Translate): string[] {
  if (!scale) return [];
  return SCALE_LABELS.flatMap(([key, translationKey]) => {
    const value = scale[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return [];
    return [t(translationKey, { count: value.toLocaleString("ko-KR") })];
  });
}

type FeatureMarketingLinkProps = {
  target: FeatureMarketingTarget;
  href?: string;
  className?: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  "aria-label"?: string;
};

const SAFE_TRUST_NOTES = [
  "결제 전 기능 내용을 먼저 확인할 수 있어요.",
  "이용권·월정석·단건결제 판단은 기존 서비스 기준을 그대로 따릅니다.",
  "운세 결과는 참고용이며, 중요한 선택은 현실적인 판단과 함께 확인해 주세요.",
];

const CATEGORY_COPY: Record<string, Omit<FeatureMarketingCopy, "ctaLabel">> = {
  saju: {
    category: "사주",
    badge: "심화 해석",
    headline: "내 사주가 반복해서 보내는 신호를 조금 더 깊게 읽어보세요.",
    subheadline: "기질과 흐름, 반복되는 선택 패턴을 함께 정리하는 해석입니다.",
    painPoints: ["같은 고민이 계속 반복될 때", "내 장점과 약점이 헷갈릴 때", "지금 운의 압박이 어디서 오는지 알고 싶을 때"],
    unlockBenefits: ["기질의 핵심 흐름", "현재 시기에 강하게 작용하는 포인트", "조심해야 할 선택 패턴", "현실적인 행동 기준"],
    previewText: "사주 해석은 길흉을 겁주듯 말하지 않고, 지금의 흐름과 선택 기준을 차분히 드러냅니다.",
    recommendedFor: ["타고난 기질과 지금 흐름을 함께 보고 싶은 분","같은 고민이 반복되는 이유를 알고 싶은 분","선택을 앞두고 판단 기준이 필요한 분"],
    answersQuestions: ["지금 하는 일을 계속 밀어붙여도 될까요?", "같은 문제가 자꾸 반복되는 이유가 뭘까요?", "올해 안에 결정을 내려도 괜찮을까요?"],
    analysisSteps: [{ label: "명식 계산", detail: "생년월일시로 사주 원국과 대운·세운을 계산합니다." }, { label: "기질 정리", detail: "오행의 강약과 십성 배치에서 타고난 성향을 뽑아냅니다." }, { label: "흐름 대조", detail: "지금 지나는 운이 그 기질을 어디서 밀고 당기는지 맞춰봅니다." }, { label: "해석 작성", detail: "읽을 수 있는 문장으로 정리해 결과 화면에 담습니다." }],
    valueCompare: { rows: [{ axis: "분석 범위", free: "기본 명식과 성향 요약", premium: "원국·대운·세운을 함께 엮은 해석" }, { axis: "질문 반영", free: "없음", premium: "입력한 고민을 중심으로 다시 구성" }, { axis: "조언 형태", free: "일반적인 성향 설명", premium: "지금 무엇을 하고 무엇을 미룰지" }] },
    faq: [{ q: "무료 결과와 무엇이 다른가요?", a: "무료는 명식과 성향 요약까지입니다. 유료는 지금 지나는 운까지 함께 놓고, 입력한 고민에 맞춰 해석을 다시 씁니다." }, { q: "태어난 시간을 모르면 못 보나요?", a: "시주를 뺀 상태로 계산합니다. 일주 중심 해석은 그대로 나오지만, 시간을 아는 쪽이 더 정확합니다." }, { q: "결과는 저장되나요?", a: "재열람 가능 여부는 기능마다 다릅니다. 결제 화면의 안내를 확인해 주세요." }],
    sampleReport: { sections: [{ heading: "타고난 성향", body: "일간을 중심으로 보면 당신은 먼저 재고 나중에 움직이는 쪽입니다. 결정이 느린 게 아니라 확인이 끝나야 손이 나가는 구조입니다." }, { heading: "지금의 흐름", body: "지금 지나는 운은 벌리는 힘보다 정리하는 힘이 강합니다. 새로 시작한 일이 유독 더디게 느껴지는 이유가 여기 있습니다." }, { heading: "선택 기준", body: "두 가지를 동시에 붙들면 둘 다 늦어집니다. 먼저 끝낼 하나를 정하고 나머지는 시기를 미루세요." }], caption: "실제 사주 해석 결과의 도입부를 그대로 옮긴 샘플입니다. 본인 명식에 따라 문장과 결론은 달라집니다." },
    trustNotes: SAFE_TRUST_NOTES,
  },
  tarot: {
    category: "타로",
    badge: "카드 리딩",
    headline: "지금 마음에 남은 질문을 카드의 상징으로 펼쳐보세요.",
    subheadline: "현재 감정과 가까운 흐름, 선택의 힌트를 짧고 선명하게 읽는 리딩입니다.",
    painPoints: ["마음은 급한데 답이 흐릿할 때", "상대의 감정이나 가까운 흐름이 궁금할 때", "선택 전에 마음을 정리하고 싶을 때"],
    unlockBenefits: ["현재 분위기 해석", "감정의 온도와 흐름", "조심해야 할 반응", "다음 행동 힌트"],
    previewText: "타로 리딩은 결과를 확정하지 않고, 지금 질문 주변에 떠오르는 상징과 흐름을 비춥니다.",
    recommendedFor: ["답이 흐릿해 마음부터 정리하고 싶은 분","상대의 감정이나 가까운 흐름이 궁금한 분","짧고 선명한 조언이 필요한 분"],
    answersQuestions: ["그 사람은 지금 어떤 마음일까요?", "지금 연락해도 괜찮을까요?", "이 선택을 밀어붙여도 될까요?"],
    analysisSteps: [{ label: "질문 정리", detail: "무엇을 묻고 싶은지 한 문장으로 좁힙니다." }, { label: "카드 배열", detail: "질문에 맞는 스프레드로 카드를 뽑고 자리마다 의미를 배정합니다." }, { label: "상징 해석", detail: "카드의 상징과 자리의 뜻을 지금 상황에 맞춰 연결합니다." }, { label: "리딩 작성", detail: "무엇을 하고 무엇을 참을지까지 문장으로 정리합니다." }],
    valueCompare: { rows: [{ axis: "카드 수", free: "한 장 뽑기", premium: "질문에 맞춘 스프레드 전체" }, { axis: "해석 깊이", free: "카드의 기본 의미", premium: "자리별 의미와 카드 사이의 관계까지" }, { axis: "조언", free: "짧은 한 줄", premium: "지금 할 말과 아낄 말을 나눠서" }] },
    faq: [{ q: "카드는 직접 뽑나요?", a: "네. 결제 후 화면에서 직접 뽑고, 뽑힌 카드에 맞춰 해석이 만들어집니다." }, { q: "같은 질문을 또 물어도 되나요?", a: "가능하지만 권하지 않습니다. 상황이 그대로인데 반복하면 결과만 흔들리고 판단은 더 어려워집니다." }, { q: "미래가 확정되나요?", a: "아니요. 타로는 지금 흐름에서 보이는 방향을 읽는 것이지 결과를 확정하지 않습니다." }],
    sampleReport: { sections: [{ heading: "지금의 분위기", body: "뽑힌 카드는 정면 충돌보다 서로 눈치를 보는 상태를 가리킵니다. 두 사람 다 상대가 먼저 움직이길 기다리고 있습니다." }, { heading: "감정의 흐름", body: "상대의 마음이 식은 게 아니라 표현의 속도가 느립니다. 재촉하면 그 속도는 더 느려집니다." }, { heading: "지금 할 일", body: "이번 주에 건넬 말과 아껴야 할 말이 나뉩니다. 순서만 지켜도 거리가 좁혀집니다." }], caption: "실제 타로 리딩 결과의 도입부를 그대로 옮긴 샘플입니다. 직접 뽑은 카드에 따라 내용은 달라집니다." },
    trustNotes: SAFE_TRUST_NOTES,
  },
  sukuyo: {
    category: "숙요점",
    badge: "관계 해석",
    headline: "두 사람 사이의 끌림과 거리감을 좋고 나쁨보다 섬세하게 읽어보세요.",
    subheadline: "관계의 결, 충돌 패턴, 인연의 리듬을 중심으로 정리하는 해석입니다.",
    painPoints: ["이상하게 끌리지만 자주 부딪힐 때", "상대와의 관계 패턴을 알고 싶을 때", "오래 갈 수 있는 인연인지 궁금할 때"],
    unlockBenefits: ["두 사람의 기본 관계성", "가까워질 때 생기는 장점", "충돌이 생기는 지점", "관계를 부드럽게 만드는 조언"],
    previewText: "숙요점은 궁합을 좋다/나쁘다로만 단정하지 않고, 관계가 움직이는 거리감을 먼저 비춥니다.",
    recommendedFor: ["상대와 가까워질수록 자꾸 부딪히는 분","관계의 패턴을 이름 붙여 이해하고 싶은 분","오래 갈 인연인지 판단이 필요한 분"],
    answersQuestions: ["이 사람과 계속 만나도 될까요?", "왜 가까워질수록 자꾸 부딪힐까요?", "연락 타이밍을 어떻게 잡아야 할까요?"],
    analysisSteps: [{ label: "본명숙 산출", detail: "두 사람의 생년월일로 27수 가운데 본명숙을 각각 계산합니다." }, { label: "관계 유형 판정", detail: "두 본명숙이 이루는 관계 유형을 확정합니다." }, { label: "거리감 해석", detail: "끌림과 충돌이 어디서 생기고 리듬이 어떻게 어긋나는지 풀어냅니다." }, { label: "조언 정리", detail: "지금 꺼낼 말과 미룰 말을 순서대로 정리합니다." }],
    valueCompare: { rows: [{ axis: "대상", free: "내 본명숙 요약", premium: "두 사람의 관계 유형 전체" }, { axis: "해석 범위", free: "성향 설명", premium: "끌림·충돌·회복 리듬까지" }, { axis: "시기 조언", free: "없음", premium: "언제 다가서고 언제 물러설지" }] },
    faq: [{ q: "상대 생년월일을 몰라도 되나요?", a: "궁합 해석은 상대의 생년월일이 있어야 계산됩니다. 없으면 내 본명숙 해석까지만 가능합니다." }, { q: "궁합이 나쁘면 헤어져야 하나요?", a: "아니요. 숙요는 좋고 나쁨이 아니라 거리감의 성격을 봅니다. 어려운 유형일수록 지켜야 할 선이 오히려 분명해집니다." }, { q: "결과는 다시 볼 수 있나요?", a: "재열람 가능 여부는 기능마다 다릅니다. 결제 화면의 안내를 확인해 주세요." }],
    sampleReport: { sections: [{ heading: "두 사람의 자리", body: "두 분의 본명숙은 서로를 끌어당기되 같은 속도로 걷지 않는 자리입니다. 어긋남은 여기서 시작됩니다." }, { heading: "충돌이 생기는 곳", body: "가까워질수록 상대는 거리를 재고 당신은 확인을 원합니다. 이 어긋난 리듬이 다툼의 진짜 원인입니다." }, { heading: "관계 조언", body: "먼저 꺼내야 할 말과 절대 꺼내면 안 되는 말이 나뉩니다. 순서만 지켜도 결과가 달라집니다." }], caption: "실제 숙요 관계 해석의 도입부를 그대로 옮긴 샘플입니다. 두 분의 본명숙에 따라 내용은 달라집니다." },
    trustNotes: SAFE_TRUST_NOTES,
  },
  ziwei: {
    category: "자미두수",
    badge: "심화 해석",
    headline: "명반 안에서 인생 구조와 지금의 방향성을 차분히 읽어보세요.",
    subheadline: "궁별 흐름과 별의 배치를 따라 장기 방향을 살피는 해석입니다.",
    painPoints: ["내 인생의 구조를 큰 틀에서 보고 싶을 때", "일·돈·관계의 중심축이 궁금할 때", "장기 흐름과 현재 선택을 함께 보고 싶을 때"],
    unlockBenefits: ["명궁과 주요 궁의 흐름", "궁별로 강하게 떠오르는 포인트", "장기 방향성과 주의 패턴", "다음 선택을 위한 기준"],
    previewText: "자미두수 해석은 별의 배치를 따라, 지금 내 삶의 구조에서 무엇이 강하게 움직이는지 살핍니다.",
    recommendedFor: ["인생 구조를 큰 틀에서 보고 싶은 분","일·돈·관계의 중심축이 궁금한 분","장기 방향과 지금 선택을 함께 보고 싶은 분"],
    answersQuestions: ["지금 이직해도 괜찮을까요?", "돈과 일 중 어디에 무게를 둬야 할까요?", "올해 큰 결정을 내려도 될까요?"],
    analysisSteps: [{ label: "명반 작성", detail: "생년월일시로 12궁에 주성과 사화를 배치합니다." }, { label: "궁 강약 판정", detail: "명궁을 기준으로 어느 궁에 힘이 실리고 어디가 비었는지 가립니다." }, { label: "질문 연결", detail: "지금 고민이 어느 궁의 압박과 닿아 있는지 맞춰봅니다." }, { label: "상담문 작성", detail: "궁의 구조를 근거로 판단 기준과 다음 행동을 정리합니다." }],
    valueCompare: { rows: [{ axis: "분석 범위", free: "명궁·신궁 요약", premium: "12궁 전체와 대한 흐름" }, { axis: "질문 반영", free: "없음", premium: "고민을 해당 궁에 연결해 다시 구성" }, { axis: "시기", free: "없음", premium: "대한·유년으로 본 움직일 시기" }] },
    faq: [{ q: "사주와 무엇이 다른가요?", a: "사주가 기운의 강약을 본다면 자미두수는 12개 영역에 별을 배치해 구조로 봅니다. 같은 사람도 보이는 각도가 다릅니다." }, { q: "유파에 따라 결과가 다르지 않나요?", a: "다를 수 있습니다. 본 서비스는 한 가지 계산 기준을 일관되게 적용합니다." }, { q: "태어난 시간이 꼭 필요한가요?", a: "네. 시간이 바뀌면 명궁 자체가 옮겨가므로 자미두수는 출생 시간의 영향이 특히 큽니다." }],
    sampleReport: { sections: [{ heading: "명궁이 말하는 기질", body: "명궁에 놓인 별의 배치는 당신이 결정을 내리는 속도와 방식을 먼저 설명합니다. 지금 고민이 무겁게 느껴지는 이유도 여기서 시작됩니다." }, { heading: "재물과 일의 흐름", body: "재백궁의 흐름은 올해 하반기를 지나며 방향을 바꿉니다. 이 시기에 벌릴 일과 정리할 일을 구분해야 손실이 줄어듭니다." }, { heading: "반복되는 패턴", body: "관록궁과 명궁이 만나는 자리에서 같은 패턴이 반복됩니다. 이 패턴을 알아채는 순간 선택의 폭이 달라집니다." }], caption: "실제 자미두수 해석의 도입부를 그대로 옮긴 샘플입니다. 본인 명반에 따라 내용은 달라집니다." },
    trustNotes: SAFE_TRUST_NOTES,
  },
  astrology: {
    category: "점성술",
    badge: "별자리 해석",
    headline: "별자리와 행성 흐름이 지금 마음에 비추는 방향을 확인해보세요.",
    subheadline: "심리 흐름과 시기의 감각을 함께 읽는 점성술 해석입니다.",
    painPoints: ["감정과 선택의 타이밍이 궁금할 때", "내 별자리 흐름을 더 구체적으로 보고 싶을 때", "지금의 방향성을 차분히 정리하고 싶을 때"],
    unlockBenefits: ["별자리와 행성 흐름의 핵심", "심리적으로 강하게 작용하는 포인트", "주의해야 할 선택 패턴", "다음 시기를 준비하는 힌트"],
    previewText: "점성술 해석은 별의 상징을 통해, 지금 마음과 선택의 방향을 부드럽게 비춥니다.",
    recommendedFor: ["감정과 상황이 따로 논다고 느끼는 분","움직일 시기를 정해야 하는 분","별자리 해석이 늘 겉핥기로 끝났던 분"],
    answersQuestions: ["왜 마음과 상황이 따로 놀까요?", "언제 움직이는 게 좋을까요?", "사람들에게 나는 어떻게 보일까요?"],
    analysisSteps: [{ label: "출생 차트 계산", detail: "생년월일시와 출생지로 행성 위치와 하우스를 계산합니다." }, { label: "세 축 정리", detail: "태양·달·상승궁으로 겉모습, 속마음, 첫인상의 축을 나눕니다." }, { label: "현재 흐름 대조", detail: "지금 지나는 행성이 어느 자리를 건드리는지 맞춰봅니다." }, { label: "해석 작성", detail: "심리 상태와 현실 타이밍을 하나로 묶어 정리합니다." }],
    valueCompare: { rows: [{ axis: "분석 범위", free: "태양·달·상승궁 요약", premium: "전체 행성 배치와 현재 흐름" }, { axis: "시기", free: "없음", premium: "움직이기 좋은 시기와 미룰 시기" }, { axis: "조언", free: "성격 설명", premium: "지금 무엇을 결정할지" }] },
    faq: [{ q: "출생 시간을 모르면 어떻게 되나요?", a: "상승궁과 하우스 계산이 부정확해집니다. 태양·달 중심 해석은 나오지만 시기 조언의 정밀도가 떨어집니다." }, { q: "별자리 운세와 무엇이 다른가요?", a: "태양 별자리 하나만 보는 게 아니라, 태어난 순간의 하늘 전체를 놓고 봅니다." }, { q: "결과가 부정적이면 어떡하죠?", a: "차트는 피할 일을 미리 알려주는 쪽에 가깝습니다. 겁주는 문장 대신 무엇을 준비할지로 정리해 드립니다." }],
    sampleReport: { sections: [{ heading: "타고난 기질", body: "상승궁이 만드는 첫인상과 실제 기질 사이에 간격이 있습니다. 사람들이 당신을 오해하는 지점이 여기입니다." }, { heading: "감정의 회복 방식", body: "달의 자리가 감정의 회복 방식을 정합니다. 혼자 삭이는 편이 빠른지, 말로 풀어야 하는지가 여기서 갈립니다." }, { heading: "지금의 시기", body: "지금 지나는 행성 흐름은 확장보다 정리에 가깝습니다. 새로 벌이기 전에 매듭지을 것이 남아 있습니다." }], caption: "실제 점성술 해석의 도입부를 그대로 옮긴 샘플입니다. 본인 출생 차트에 따라 내용은 달라집니다." },
    trustNotes: SAFE_TRUST_NOTES,
  },
  vedic: {
    category: "베다점",
    badge: "시점 해석",
    headline: "질문이 떠오른 지금의 시점과 내면의 흐름을 함께 살펴보세요.",
    subheadline: "베다점의 상징과 시간 감각으로 선택의 방향을 정리하는 해석입니다.",
    painPoints: ["지금 선택의 의미가 궁금할 때", "마음속 질문이 쉽게 내려놓아지지 않을 때", "시기와 방향을 함께 보고 싶을 때"],
    unlockBenefits: ["질문의 핵심 흐름", "시점과 내면의 상징 해석", "선택을 막는 걸림돌", "현실적인 다음 기준"],
    previewText: "베다점은 질문이 열린 시점의 결을 따라, 지금 필요한 기준을 차분히 가리킵니다.",
    recommendedFor: ["지금 선택의 의미를 확인하고 싶은 분","내려놓지 못한 질문이 하나 남아 있는 분","시기와 방향을 함께 보고 싶은 분"],
    answersQuestions: ["지금 내린 결정이 장기 흐름과 맞을까요?", "왜 노력의 타이밍이 자꾸 어긋날까요?", "이 시기에 무엇을 준비해야 할까요?"],
    analysisSteps: [{ label: "차트 계산", detail: "출생 정보로 라시 차트와 달의 나크샤트라를 산출합니다." }, { label: "다샤 확인", detail: "지금 어느 행성의 시기를 지나고 있는지 확인합니다." }, { label: "질문 대조", detail: "그 시기가 지금 고민에 어떤 압력을 주는지 맞춰봅니다." }, { label: "해석 작성", detail: "무엇을 지금 하고 무엇을 다음 시기로 넘길지 정리합니다." }],
    valueCompare: { rows: [{ axis: "분석 범위", free: "라시·나크샤트라 요약", premium: "차트 전체와 다샤 흐름" }, { axis: "시간표", free: "없음", premium: "다샤 기간별 기회와 시련" }, { axis: "질문 반영", free: "없음", premium: "입력한 고민 기준으로 다시 구성" }] },
    faq: [{ q: "서양 점성술과 무엇이 다른가요?", a: "별자리 기준점이 다르고, 다샤라는 시기 개념을 씁니다. 성격보다 시간의 흐름을 읽는 데 강합니다." }, { q: "전생이나 업이 사실인가요?", a: "상징적 개념으로 다룹니다. 사실 판정이 아니라 반복되는 패턴을 설명하는 틀입니다." }, { q: "출생 시간이 꼭 필요한가요?", a: "네. 라그나와 하우스가 시간에 따라 바뀌므로 정확도가 크게 달라집니다." }],
    sampleReport: { sections: [{ heading: "타고난 배치", body: "라그나를 기준으로 보면 당신은 시작보다 마무리에서 힘이 붙는 배치입니다. 초반의 더딤을 실패로 읽지 마세요." }, { heading: "지금의 다샤", body: "지금 지나는 다샤는 관계보다 실력을 쌓는 구간입니다. 이 시기에 급하게 벌린 인연은 오래 남지 않습니다." }, { heading: "감정의 리듬", body: "달이 놓인 나크샤트라가 감정의 회복 속도를 정합니다. 무너진 뒤 다시 서기까지의 리듬이 여기 있습니다." }], caption: "실제 베다 점성술 해석의 도입부를 그대로 옮긴 샘플입니다. 본인 출생 정보에 따라 내용은 달라집니다." },
    trustNotes: SAFE_TRUST_NOTES,
  },
  oracle: {
    category: "오라클",
    badge: "상징 리딩",
    headline: "지금 놓치기 쉬운 신호를 상징의 언어로 짧게 확인해보세요.",
    subheadline: "선택 앞의 마음을 정리하는 신탁형 리딩입니다.",
    painPoints: ["결정은 해야 하는데 확신이 부족할 때", "반복되는 신호가 있다고 느낄 때", "짧지만 선명한 상징 해석이 필요할 때"],
    unlockBenefits: ["현재 질문의 상징 메시지", "놓치기 쉬운 포인트", "주의해야 할 흐름", "다음 행동을 위한 힌트"],
    previewText: "오라클은 미래를 확정하지 않고, 지금 질문 주변에 떠오르는 상징을 비춥니다.",
    recommendedFor: ["결정은 해야 하는데 확신이 부족한 분","반복되는 신호가 있다고 느끼는 분","짧지만 선명한 상징 해석이 필요한 분"],
    answersQuestions: ["지금 이 선택이 맞는 방향일까요?", "내가 놓치고 있는 신호는 뭘까요?", "이번 일을 밀어붙일까요, 기다릴까요?"],
    analysisSteps: [{ label: "질문 봉인", detail: "묻고 싶은 것을 한 문장으로 좁혀 고정합니다." }, { label: "상징 추출", detail: "그 질문에 응답하는 상징을 뽑습니다." }, { label: "의미 연결", detail: "뽑힌 상징을 지금 상황의 맥락에 붙여 읽습니다." }, { label: "신탁 정리", detail: "지금 취할 태도와 피할 태도로 정리합니다." }],
    valueCompare: { rows: [{ axis: "상징 수", free: "한 개", premium: "질문에 맞춘 상징 조합 전체" }, { axis: "해석", free: "상징의 기본 뜻", premium: "지금 상황에 붙인 맥락 해석" }, { axis: "조언", free: "한 줄 메시지", premium: "취할 태도와 피할 태도를 나눠서" }] },
    faq: [{ q: "오라클은 점인가요?", a: "미래를 맞히는 도구가 아니라, 지금 마음이 놓친 신호를 상징으로 되짚는 방식입니다." }, { q: "결과가 마음에 안 들면요?", a: "상징은 판결이 아닙니다. 같은 상징도 상황에 따라 다르게 작동하니 조언의 방향만 참고해 주세요." }, { q: "얼마나 자주 봐도 되나요?", a: "질문이 실제로 바뀌었을 때 보는 편이 좋습니다. 같은 질문을 반복하면 판단만 흐려집니다." }],
    sampleReport: { sections: [{ heading: "지금 떠오른 신호", body: "뽑힌 상징은 앞으로 나아가라는 신호가 아니라, 이미 지나온 자리를 한 번 더 보라는 쪽을 가리킵니다." }, { heading: "놓치고 있던 것", body: "결정을 막고 있는 건 정보 부족이 아니라 이미 알고 있는 사실을 인정하지 않는 마음입니다." }, { heading: "지금의 태도", body: "서두르면 같은 자리로 돌아옵니다. 이번만은 한 박자 늦게 답해도 늦지 않습니다." }], caption: "실제 오라클 리딩의 도입부를 그대로 옮긴 샘플입니다. 뽑히는 상징에 따라 내용은 달라집니다." },
    trustNotes: SAFE_TRUST_NOTES,
  },
  report: {
    category: "프리미엄 리포트",
    badge: "심화 상담형",
    headline: "흩어진 생각을 하나의 해석으로 묶어보세요.",
    subheadline: "현재 고민과 흐름을 더 구체적으로 정리해보는 프리미엄 해석입니다.",
    painPoints: ["같은 고민이 반복된다고 느낄 때", "단순 요약보다 구체적인 흐름이 필요할 때", "선택 전에 내 생각을 정리하고 싶을 때"],
    unlockBenefits: ["핵심 흐름 요약", "주제별 해석 포인트", "조심해야 할 패턴", "다음 행동 기준"],
    previewText: "프리미엄 해석은 결과를 과장하지 않고, 지금 필요한 질문의 결을 차분히 정리합니다.",
    recommendedFor: ["흩어진 고민을 한 번에 정리하고 싶은 분","요약보다 구체적인 흐름이 필요한 분","선택 전에 생각을 매듭짓고 싶은 분"],
    answersQuestions: ["여러 고민 중 무엇부터 손대야 할까요?", "왜 노력해도 한 영역만 계속 막힐까요?", "지금 버틸 것과 바꿀 것을 어떻게 나눌까요?"],
    analysisSteps: [{ label: "입력 정보 확인", detail: "생년 정보와 지금의 고민을 함께 받습니다." }, { label: "운세 체계 분석", detail: "해당 리포트가 쓰는 계산 체계로 기질과 흐름을 산출합니다." }, { label: "고민 연결", detail: "산출된 결과 가운데 지금 질문과 맞닿는 지점을 추립니다." }, { label: "리포트 작성", detail: "우선순위와 다음 행동이 보이도록 하나의 문서로 정리합니다." }],
    valueCompare: { rows: [{ axis: "분량", free: "핵심 요약", premium: "주제별로 나뉜 심층 리포트" }, { axis: "개인화", free: "일반적인 설명", premium: "입력한 정보와 고민 기준으로 작성" }, { axis: "조언", free: "방향 제시", premium: "무엇부터 할지 순서까지" }] },
    faq: [{ q: "무료와 무엇이 다른가요?", a: "무료는 핵심 요약입니다. 프리미엄은 입력한 정보를 바탕으로 주제별 심층 분석과 구체적인 조언까지 담습니다." }, { q: "AI가 자동으로 만드나요?", a: "입력하신 정보를 바탕으로 맞춤 리포트를 생성합니다. 같은 정보라도 질문이 달라지면 내용이 달라집니다." }, { q: "결과는 저장되나요?", a: "재열람 가능 여부는 기능마다 다릅니다. 결제 화면의 안내를 확인해 주세요." }],
    sampleReport: { sections: [{ heading: "타고난 성향", body: "당신은 결정을 미루는 사람이 아니라 정보를 너무 오래 모으는 사람입니다. 기준부터 정해야 속도가 붙습니다." }, { heading: "지금 막힌 지점", body: "지금 밀리고 있는 전선은 일이 아니라 관계입니다. 여기서 새는 힘이 나머지를 전부 갉아먹습니다." }, { heading: "다음 행동", body: "다음 석 달 안에 하나를 접어야 나머지가 삽니다. 무엇을 접을지는 이미 정해져 있습니다." }], caption: "실제 프리미엄 리포트의 도입부를 그대로 옮긴 샘플입니다. 입력한 정보와 질문에 따라 내용은 달라집니다." },
    trustNotes: SAFE_TRUST_NOTES,
  },
};

const EXPLICIT_COPY: Record<string, Partial<FeatureMarketingCopy>> = {
  "life-book-ai-consultation": {
    category: "프리미엄 리포트",
    badge: "전문가 상담형",
    headline: "내 삶의 큰 흐름을 한 번 깊게 정리해두는 시간을 가져보세요.",
    subheadline: "사주 흐름을 바탕으로 인생의 방향과 반복 패턴을 상담형으로 풀어보는 프리미엄 기능입니다.",
    painPoints: ["삶의 방향을 큰 틀에서 정리하고 싶을 때", "반복되는 선택 패턴의 이유가 궁금할 때", "지금의 전환점을 더 깊게 읽고 싶을 때"],
    recommendedFor: [
      "30대·40대 전환점에서 방향을 다시 잡아야 하는 분",
      "같은 실패가 반복되는 이유를 근본에서 확인하고 싶은 분",
      "짧은 운세 말고 인생 전체 흐름을 한 번에 훑어보고 싶은 분",
    ],
    resultPreview: {
      lines: [
        "당신의 일간은 조용히 스며드는 물의 기운입니다. 겉으로는 유연해 보이지만 방향이 정해지면 좀처럼 되돌리지 않습니다.",
        "첫 번째 큰 전환점은 이미 지나왔습니다. 그때 내린 선택이 지금의 자리와 어떻게 이어져 있는지부터 짚습니다.",
        "반복되는 굴레의 근원은 재물의 기운과 책임의 기운이 부딪히는 자리에 있습니다. 이 지점을 풀면 다음 장이 열립니다.",
      ],
      caption: "실제 인생의 책 도입부 예시입니다. 결제 후에는 본인 사주로 계산된 전 챕터와 시기별 전략까지 이어집니다.",
    },
    ctaLabel: "인생의 책 열람하기",
  },
  // 인생 총운은 인생의 책과 별도 SKU(50,000원)다. 분량이 3배(30,000자)이고 서사보다 진단이 중심이라
  // 카피도 따로 간다 — 카테고리 폴백으로 떨어지면 5만원짜리에 일반 문구가 붙는다.
  "life-fortune-ai-consultation": {
    category: "프리미엄 리포트",
    badge: "전문가 상담형",
    headline: "삶, 일, 재물, 관계의 큰 흐름을 명식 근거로 끝까지 짚어드립니다.",
    subheadline: "인생의 책이 이야기라면, 인생 총운은 진단입니다. 열 장 전부에 일간·용신·십성·대운의 근거를 붙여 3만 자 분량으로 풀어냅니다.",
    painPoints: ["지금이 밀어붙일 때인지 버틸 때인지 모를 때", "강점과 리스크를 근거까지 함께 보고 싶을 때", "대운·세운이 바뀌는 시기를 정확히 알고 싶을 때"],
    recommendedFor: [
      "덕담이 아니라 근거 있는 진단을 원하는 분",
      "일·재물·관계·건강을 어떤 순서로 조율할지 정해야 하는 분",
      "가까운 5년의 기회와 주의 시기를 미리 잡아두고 싶은 분",
    ],
    resultPreview: {
      lines: [
        "경금 일간이 사월(巳月)에 태어나 조후가 급합니다. 뜨거운 자리에서 단단해지는 대신, 식히는 기운이 없으면 쉽게 지칩니다.",
        "재성은 강한데 비겁이 그것을 나눠 갖는 구조입니다. 돈이 들어오는 속도보다 새어 나가는 경로를 먼저 막아야 합니다.",
        "현재 대운은 관성이 힘을 얻는 구간입니다. 책임이 늘어나는 시기이며, 그 무게를 받아낼 인성을 함께 세워야 합니다.",
      ],
      caption: "실제 인생 총운 도입부 예시입니다. 결제 후에는 열 장 전체와 명식 깊은 판독 네 편이 이어집니다.",
    },
    ctaLabel: "인생 총운 열람하기",
  },
  "ziwei-ai-consultation": {
    category: "자미두수",
    badge: "전문가 상담형",
    headline: "별의 배치가 지금의 질문을 어디로 이끄는지 차분히 읽어보세요.",
    subheadline: "명궁과 12궁의 흐름을 바탕으로, 고민의 중심과 다음 선택 기준을 정리하는 상담형 해석입니다.",
    recommendedFor: [
      "이직·이사·결혼처럼 큰 결정을 앞두고 판단 근거가 필요한 분",
      "노력은 계속하는데 성과가 한 곳으로 모이지 않는다고 느끼는 분",
      "단편적인 오늘 운세 말고 인생 구조를 한 번 정리하고 싶은 분",
    ],
    resultPreview: {
      lines: [
        "명궁에 놓인 별의 배치는 당신이 결정을 내리는 속도와 방식을 먼저 설명합니다. 지금 고민이 무겁게 느껴지는 이유도 여기서 시작됩니다.",
        "재백궁의 흐름은 올해 하반기를 지나며 방향을 바꿉니다. 이 시기에 벌리는 일과 정리하는 일을 구분해야 손실이 줄어듭니다.",
        "관록궁과 명궁이 만나는 자리에서 같은 패턴이 반복됩니다. 이 패턴을 알아채는 순간 선택의 폭이 달라집니다.",
      ],
      caption: "실제 상담 결과 화면의 예시입니다. 결제 후에는 본인 명식으로 계산된 12궁 전체 해석과 이어지는 질문까지 확인할 수 있어요.",
    },
    ctaLabel: "자미두수 상담 열기",
  },
  "neo-operation-room-consultation": {
    category: "프리미엄 리포트",
    badge: "전략 상담형",
    headline: "흩어진 고민을 하나의 작전 지도로 정리해보세요.",
    subheadline: "사주와 별자리 흐름을 함께 놓고, 지금 밀리는 지점과 다시 잡아야 할 기준을 읽어주는 전략형 상담입니다.",
    recommendedFor: ["위로보다 냉정한 진단이 필요한 분","고민이 여러 개 얽혀 우선순위가 안 잡히는 분","사주와 별자리를 한 번에 묶어서 보고 싶은 분"],
    resultPreview: { lines: ["지금 밀리고 있는 전선은 일이 아니라 관계입니다. 여기서 새는 힘이 나머지를 전부 갉아먹습니다.","당신은 결정을 미루는 사람이 아니라 정보를 너무 오래 모으는 사람입니다. 기준부터 정해야 합니다.","다음 석 달 안에 하나를 접어야 나머지가 삽니다. 무엇을 접을지는 이미 정해져 있습니다."], caption: "실제 작전실 상담 결과의 도입부 예시입니다. 결제 후에는 본인 명식과 별자리를 묶은 전체 전략과 행동 순서가 이어집니다." },
    ctaLabel: "작전실 열기",
  },
  "loveSimulation": {
    category: "사주",
    badge: "연애 시뮬레이션",
    headline: "내 연애 패턴이 어떤 장면에서 빛나고 흔들리는지 확인해보세요.",
    subheadline: "사주 오행과 일간 흐름을 바탕으로 관계의 케미와 대화 포인트를 시뮬레이션처럼 보여줍니다.",
    recommendedFor: ["연애가 매번 비슷한 방식으로 끝나는 분","내가 어떤 사람에게 약한지 알고 싶은 분","다음 연애에서는 다르게 해보고 싶은 분"],
    resultPreview: { lines: ["당신은 처음부터 마음을 다 여는 편이 아니라, 한 번 열면 되돌리지 못하는 쪽입니다.","끌리는 유형과 잘 맞는 유형이 다릅니다. 이 간격에서 반복이 생깁니다.","관계가 흔들리는 시점은 대체로 세 번째 고비에서 옵니다."], caption: "실제 LOVE CODE 결과의 도입부 예시입니다. 결제 후에는 본인 사주로 계산된 연애 패턴 전체를 확인할 수 있어요." },
    ctaLabel: "LOVE CODE 열람하기",
  },
  "destiny_meeting_place": {
    category: "사주",
    badge: "장소 리딩",
    headline: "내 인연이 머무르기 쉬운 장소의 결을 살펴보세요.",
    subheadline: "사주 흐름을 바탕으로 인연과 장소, 타이밍의 상징을 정리하는 리딩입니다.",
    recommendedFor: ["어디서 인연을 만날지 감이 안 오는 분","활동 반경을 바꿔볼 생각이 있는 분","만남의 시기와 장소를 함께 보고 싶은 분"],
    resultPreview: { lines: ["당신의 인연은 넓은 자리보다 좁고 반복되는 자리에서 열립니다.","방향으로는 지금 사는 곳을 기준으로 한쪽이 뚜렷하게 유리합니다.","사람이 몰리는 시기보다 한 박자 비켜난 시기에 만남이 잡힙니다."], caption: "실제 인연의 장소 결과의 도입부 예시입니다. 결제 후에는 본인 사주로 계산된 장소·방향·시기 해석을 확인할 수 있어요." },
    ctaLabel: "인연의 장소 열람하기",
  },
  "destiny-bias-analyze": {
    category: "사주",
    badge: "포토카드 리딩",
    headline: "최애와 나 사이에 떠오르는 무드와 감정 코드를 한 장씩 펼쳐보세요.",
    subheadline: "팬심과 관계 상상을 카드형 문장으로 정리해, 지금의 설렘과 거리감을 가볍게 읽는 리딩입니다.",
    recommendedFor: ["최애와 나 사이의 거리를 재미있게 보고 싶은 분","팬심을 카드 형태로 남기고 싶은 분","가볍게 즐길 리딩을 찾는 분"],
    resultPreview: { lines: ["두 사람의 기운은 정면으로 부딪히기보다 서로를 비추는 배치입니다.","당신이 끌리는 지점은 화려함이 아니라 견디는 태도입니다.","올해 이 마음이 가장 짙어지는 시기가 따로 있습니다."], caption: "실제 최애운명 결과의 도입부 예시입니다. 결제 후에는 카드 전체와 무드 해석을 확인할 수 있어요." },
    ctaLabel: "최애운명 열람하기",
  },
  "tarot-prompt-maker": {
    category: "타로",
    badge: "프롬프트형",
    headline: "내 질문에 맞는 타로 상담의 문장을 먼저 정리해보세요.",
    subheadline: "카드 해석을 더 깊게 이어가기 위한 질문과 상담 흐름을 프롬프트로 묶는 기능입니다.",
    recommendedFor: ["타로를 자주 보는데 늘 답이 얕게 느껴지는 분","상담 전에 질문을 정리하고 싶은 분","스스로 리딩을 이어가 보고 싶은 분"],
    resultPreview: { lines: ["지금 상황에서는 \"이 사람이 나를 좋아할까\"보다 \"무엇이 이 관계를 멈춰 세우고 있나\"가 더 잘 열립니다.","첫 질문이 열리면 이어서 물을 두 번째·세 번째 질문이 준비되어 있습니다.","카드가 애매하게 나왔을 때 다시 묻는 문장도 따로 담겨 있습니다."], caption: "실제 프롬프트 결과의 도입부 예시입니다. 결제 후에는 상황에 맞춘 질문 세트와 프롬프트 원문 전체를 받아보실 수 있어요." },
    ctaLabel: "프롬프트 열람하기",
  },
  "stonehengeRunes": {
    category: "오라클",
    badge: "룬 리딩",
    headline: "지금 선택 앞에 떠오른 룬의 상징을 조용히 펼쳐보세요.",
    subheadline: "룬 문자의 상징으로 현재 질문과 다음 행동의 결을 읽는 오라클 리딩입니다.",
    recommendedFor: ["흐름을 과거·현재·미래로 나눠 보고 싶은 분","짧지만 묵직한 조언을 원하는 분","북유럽 상징 체계에 끌리는 분"],
    resultPreview: { lines: ["첫 번째 돌은 이미 지나온 선택을 가리킵니다. 그 선택은 실수가 아니라 필요한 과정이었습니다.","가운데 돌은 멈춤을 뜻합니다. 지금은 나아가는 힘보다 버티는 힘이 필요한 구간입니다.","마지막 돌은 문이 열리는 자리입니다. 다만 먼저 손에 쥔 것을 놓아야 열립니다."], caption: "실제 룬 오라클 결과의 도입부 예시입니다. 결제 후에는 세 룬의 전체 해석과 조합 풀이를 확인할 수 있어요." },
    ctaLabel: "룬 오라클 열람하기",
  },
};

const EXPLICIT_ALIAS: Record<string, string> = {
  "/life-book-ai": "life-book-ai-consultation",
  "/premium-unlock": "life-fortune-ai-consultation",
  "/ziwei-ai": "ziwei-ai-consultation",
  "/saju/love-simulation": "loveSimulation",
  "/saju/destiny-meeting-place": "destiny_meeting_place",
  "/saju/destiny-bias": "destiny-bias-analyze",
  "/tarot/prompt-maker": "tarot-prompt-maker",
  "/index.html?action=openRuneOracle": "stonehengeRunes",
};

function textKey(target: FeatureMarketingTarget) {
  return [target.featureKey, target.slug, target.href, target.title, target.description, target.subtitle].filter(Boolean).join(" ").toLowerCase();
}

function inferCategory(target: FeatureMarketingTarget) {
  const raw = textKey(target);
  if (/sukuyo|sukyo|숙요/.test(raw)) return "sukuyo";
  if (/ziwei|jami|자미|명반/.test(raw)) return "ziwei";
  if (/vedic|jyotish|베다/.test(raw)) return "vedic";
  if (/astro|별자리|점성/.test(raw)) return "astrology";
  if (/tarot|타로|reunion|love-relationship/.test(raw)) return "tarot";
  if (/oracle|rune|juyuk|kemet|ifa|geomancy|오라클|신탁|룬|주역/.test(raw)) return "oracle";
  if (/life-book|love-secret|ai-consultation|premium|report|리포트|상담/.test(raw)) return "report";
  return "saju";
}

function explicitKey(target: FeatureMarketingTarget) {
  const hrefKey = EXPLICIT_ALIAS[target.href || ""] || target.href || "";
  return [target.featureKey || "", target.slug || "", hrefKey].find((key) => EXPLICIT_COPY[key]) || "";
}

/* ── 로케일화 ────────────────────────────────────────────────────────────────
   정본은 정적 셸(index.html)이고, 셸은 이미 65개 상품 + 9개 카테고리 템플릿을
   `featureMarketing.*` 네임스페이스에 번역해 뒀다. 이 파일의 한국어 리터럴은 그 데이터의
   사본이므로 **번역을 새로 만들지 않고 같은 키를 재사용한다**(실측 2026-08-23: 481개 leaf
   문자열 중 344개가 셸과 바이트 단위로 같다).

   🔴 `useT` 가 아니라 `useTPick` 을 쓴다 — `ko.json` 에는 `featureMarketing` 네임스페이스가
   아예 없다(한국어는 이 소스가 정본). `useT` 는 키가 없으면 "번역을 준비 중입니다"를 돌려주므로
   ko 로케일에서 모달이 통째로 덮인다. 셸의 `_pvwTrKeep` 과 같은 계약이 필요하다.

   셸과 문구가 갈린 소수 필드(9건)만 `hub` 접두어 키를 먼저 보고, 없으면 셸 공용 키로 내려간다. */

/** 이 모달의 explicit 키 → 정적 셸이 쓰는 사전 네임스페이스(`_pvwSafeKey` 적용 뒤 값). */
const EXPLICIT_DICT_NS: Record<string, string> = {
  "life-book-ai-consultation": "life_book_ai",
  "life-fortune-ai-consultation": "premium_unlock",
  "ziwei-ai-consultation": "gotoZiweiPremium",
  "neo-operation-room-consultation": "neo_operation_room",
  loveSimulation: "openLoveSimulation",
  destiny_meeting_place: "saju_destiny_meeting_place",
  "destiny-bias-analyze": "openDestinyBias",
  // 🔴 하이픈 그대로 두면 셸이 못 읽는다 — `_pvwSafeKey` 가 하이픈을 `_` 로 바꾸므로
  //    셸은 언제나 `tarot_prompt_maker` 를 찾는다(이 모달만 옛 이름을 보고 있었다).
  "tarot-prompt-maker": "tarot_prompt_maker",
  stonehengeRunes: "openRuneOracle",
};

/** 카테고리 한국어 표기 → `featureMarketingCategory.*` 키. CATEGORY_COPY 를 뒤집어 만든다. */
const CATEGORY_KEY_BY_KO: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_COPY).map(([key, copy]) => [copy.category, key]),
);

function pickText(pick: TranslatePick, ns: string, shared: string, hub: string, value?: string) {
  return pick(`${ns}.${hub}`, pick(`${ns}.${shared}`, value));
}

function pickList(pick: TranslatePick, ns: string, shared: string, hub: string, list?: string[]) {
  if (!Array.isArray(list)) return list;
  return list.map((item, index) => pickText(pick, ns, `${shared}.${index}`, `${hub}.${index}`, item) as string);
}

function localizeMarketingCopy<T extends Partial<FeatureMarketingCopy>>(pick: TranslatePick, ns: string, source: T): T {
  const out: Partial<FeatureMarketingCopy> = { ...source };
  // 🔴 source 에 없던 필드를 undefined 로 만들어 두면 안 된다 — 카테고리 위에 explicit 를
  //    펼칠 때 그 undefined 가 카테고리 값을 이겨 화면에서 섹션이 사라진다.
  const set = <K extends keyof FeatureMarketingCopy>(key: K, value: FeatureMarketingCopy[K] | undefined) => {
    if (value !== undefined) out[key] = value;
  };

  const categoryKey = source.category ? CATEGORY_KEY_BY_KO[source.category] : "";
  if (categoryKey) set("category", pick(`featureMarketingCategory.${categoryKey}`, source.category));

  set("badge", pick(`${ns}.badge`, source.badge));
  set("headline", pick(`${ns}.headline`, source.headline));
  set("subheadline", pickText(pick, ns, "tagline", "hubTagline", source.subheadline));
  set("previewText", pickText(pick, ns, "premiumIntro", "hubPremiumIntro", source.previewText));
  set("ctaLabel", pickText(pick, ns, "fallbackCta", "hubFallbackCta", source.ctaLabel));
  set("ctaNote", pick(`${ns}.ctaNote`, source.ctaNote));
  set("painPoints", pickList(pick, ns, "feats", "hubFeats", source.painPoints));
  set("unlockBenefits", pickList(pick, ns, "premiumChapters", "hubPremiumChapters", source.unlockBenefits));
  set("recommendedFor", pickList(pick, ns, "premiumAudience", "hubPremiumAudience", source.recommendedFor));
  set("answersQuestions", pickList(pick, ns, "answersQuestions", "hubAnswersQuestions", source.answersQuestions));

  // 신뢰 문구는 셸과 같은 공용 목록이라 상품 네임스페이스가 아니라 공용 키를 본다.
  if (source.trustNotes) {
    set("trustNotes", source.trustNotes === SAFE_TRUST_NOTES
      ? source.trustNotes.map((item, i) => pick(`featureMarketingTrust.paid.${i}`, item) as string)
      : pickList(pick, ns, "premiumOutcomes", "hubPremiumOutcomes", source.trustNotes));
  }

  if (source.analysisSteps) {
    set("analysisSteps", source.analysisSteps.map((step, i) => ({
      label: pick(`${ns}.analysisSteps.${i}.label`, step.label) as string,
      detail: pick(`${ns}.analysisSteps.${i}.detail`, step.detail),
    })));
  }

  if (source.valueCompare) {
    set("valueCompare", { rows: source.valueCompare.rows.map((row, i) => ({
      axis: pick(`${ns}.valueCompare.${i}.axis`, row.axis) as string,
      free: pick(`${ns}.valueCompare.${i}.free`, row.free),
      premium: pick(`${ns}.valueCompare.${i}.premium`, row.premium) as string,
    })) });
  }

  if (source.faq) {
    set("faq", source.faq.map((item, i) => ({
      q: pick(`${ns}.faq.${i}.q`, item.q) as string,
      a: pick(`${ns}.faq.${i}.a`, item.a) as string,
    })));
  }

  if (source.sampleReport) {
    const sample = source.sampleReport;
    set("sampleReport", {
      sections: sample.sections.map((section, i) => ({
        heading: pick(`${ns}.sampleReport.sections.${i}.heading`, section.heading),
        body: pick(`${ns}.sampleReport.sections.${i}.body`, section.body) as string,
      })),
      continuation: pick(`${ns}.sampleReport.continuation`, sample.continuation),
      caption: pick(`${ns}.sampleReport.caption`, sample.caption),
    });
  }

  if (source.resultPreview) {
    const preview = source.resultPreview;
    set("resultPreview", {
      lines: preview.lines.map((line, i) => pick(`${ns}.resultPreview.lines.${i}`, line) as string),
      caption: pick(`${ns}.resultPreview.caption`, preview.caption),
    });
  }

  return out as T;
}

export function isPaidMarketingTarget(target: FeatureMarketingTarget) {
  if (target.accessType && target.accessType !== "free") return true;
  // 🔴 accessType="free" 는 선언이고 아래는 휴리스틱이다. 선언이 이긴다 —
  // 그러지 않으면 priceLabel "부분 유료"/"20,000원" 같은 문구 하나로 무료 기능이 유료로 잡혀
  // 팝업이 "왜 유료인가요" 표를 띄우고, featureKey 가 없어 가격도 못 받으므로
  // priceReady 가 영영 false 라 CTA 까지 잠긴다(사주·타로·숙요·베다·점성술 5종 실측).
  if (target.accessType === "free") return false;
  if ((target.coinPrice || 0) > 0) return true;
  const badgeText = (target.badges || []).map((badge) => badge.text || "").join(" ");
  const raw = `${target.href} ${target.description || ""} ${target.subtitle || ""} ${target.priceLabel || ""} ${badgeText}`;
  return /(원|결제|코인|유료|해금|premium|paid|life-book-ai|love-secret-ai|ziwei-ai|tarot\/prompt-maker|saju\/love-simulation|saju\/destiny-bias|saju\/destiny-meeting-place|palm-reading)/i.test(raw);
}

export function useFeatureMarketingCopy(target: FeatureMarketingTarget): FeatureMarketingCopy {
  const pick = useTPick();
  const t = useT();
  return useMemo(() => {
    const categoryId = inferCategory(target);
    const category = CATEGORY_COPY[categoryId] || CATEGORY_COPY.saju;
    const explicitId = explicitKey(target);
    const explicit = EXPLICIT_COPY[explicitId] || {};
    // 🔴 카테고리와 explicit 를 각자의 네임스페이스로 따로 로케일화한 뒤 합친다. 합친 뒤에
    //    한 네임스페이스로 조회하면, explicit 사전에 없는 필드를 카테고리 값에 대고 찾다가
    //    번역을 놓치거나 남의 상품 번역을 붙이게 된다.
    const localizedCategory = localizeMarketingCopy(pick, `featureMarketing.template_${categoryId}`, category);
    const localizedExplicit = explicitId
      ? localizeMarketingCopy(pick, `featureMarketing.${EXPLICIT_DICT_NS[explicitId] || explicitId}`, explicit)
      : explicit;
    return {
      ...localizedCategory,
      ...localizedExplicit,
      ctaLabel: localizedExplicit.ctaLabel || t(target.accessType === "premium_report" ? "preview.ctaReport" : "preview.ctaPaid"),
      trustNotes: localizedExplicit.trustNotes || localizedCategory.trustNotes,
    };
  }, [pick, t, target]);
}

function priceText(target: FeatureMarketingTarget, price: { label: string; loading: boolean }, t: Translate) {
  if (target.accessType === "free") return t("preview.priceFree");
  if (price.loading) return t("preview.priceLoading");
  return price.label || t("preview.priceUnknown");
}

const modalSheetScrollStyle: CSSProperties = {
  maxHeight: "calc(100dvh - max(16px, env(safe-area-inset-top)) - max(16px, env(safe-area-inset-bottom)))",
  overscrollBehaviorY: "contain",
  WebkitOverflowScrolling: "touch",
};

// 카드를 탭해 모달이 열린 직후, 같은 좌표로 떨어지는 유령 탭·연타가 백드롭에 맞아
// 모달을 즉시 닫아 버리던 문제를 막는다. 모바일에서 시트는 하단 정렬이라 화면 상단이
// 전부 백드롭이고, 카드가 상단에 있으면 두 번째 탭이 정확히 백드롭에 떨어진다.
const BACKDROP_CLOSE_GUARD_MS = 500;

// 이동이 시작되지 않는 최악의 경우에도 버튼이 영구히 잠기지 않게 하는 안전장치.
const NAV_PENDING_FAILSAFE_MS = 6000;

function trimTrailingSlash(path: string) {
  return String(path || "").replace(/\/+$/, "") || "/";
}

// 정적 셸 액션 URL(`/index.html?action=...`)과 외부 주소는 App Router 로 이동할 수 없다.
// 이런 링크는 하드 이동으로 보낸다.
function isRouterNavigable(href: string) {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  return !href.includes("index.html") && !href.includes("action=");
}

export function FeatureMarketingDetailModal({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: FeatureMarketingTarget;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const openedAtRef = useRef(0);
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [navPending, setNavPending] = useState(false);
  const t = useT();
  const copy = useFeatureMarketingCopy(target);
  const canonicalPrice = useServerPrice({ featureKey: target.featureKey });
  const isPaidTarget = isPaidMarketingTarget(target);
  const priceReady = !isPaidTarget || Boolean(canonicalPrice.label);
  useBodyScrollLock(open);

  // 오픈 시각은 `open` 이 바뀔 때만 갱신한다 — onClose 처럼 매 렌더 새로 만들어지는 값에
  // 묶으면 가드 기준 시각이 계속 밀려 백드롭 닫기가 영구히 무력화된다.
  useEffect(() => {
    if (open) openedAtRef.current = Date.now();
    else setNavPending(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!navPending) return;
    const timer = window.setTimeout(() => setNavPending(false), NAV_PENDING_FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, [navPending]);

  const closeFromBackdrop = useCallback(() => {
    if (Date.now() - openedAtRef.current < BACKDROP_CLOSE_GUARD_MS) return;
    if (navPending) return;
    onClose();
  }, [navPending, onClose]);

  const handleCtaClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    // 새 탭·수정키 클릭은 브라우저 기본 동작에 맡긴다.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (isPaidTarget && !canonicalPrice.label) return;
    if (navPending) return;

    if (!isRouterNavigable(target.href)) {
      setNavPending(true);
      window.location.assign(target.href);
      return;
    }

    // 이미 그 화면이면 이동할 게 없다 — 모달만 닫는다(대기 표시로 갇히는 것 방지).
    if (trimTrailingSlash(pathname) === trimTrailingSlash(target.href)) {
      onClose();
      return;
    }

    // 여기서 모달을 닫지 않는다. 닫으면 라우트 전환이 끝날 때까지 화면에 아무 변화가 없어
    // "버튼을 눌렀는데 팝업만 닫히고 아무 일도 안 일어난다"로 보이고, 그게 연타·이탈을 부른다.
    // 이동이 완료되면 이 트리가 언마운트되므로 별도 닫기 처리가 필요 없다.
    setNavPending(true);
    router.push(target.href);
  }, [canonicalPrice.label, isPaidTarget, navPending, onClose, pathname, router, target.href]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/72 px-0 sm:items-center sm:px-4" role="presentation" onClick={closeFromBackdrop}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="featureMarketingTitle"
        className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl border border-white/12 bg-[linear-gradient(180deg,#081427,#111a34_56%,#070b1d)] p-4 pb-[calc(16px+env(safe-area-inset-bottom))] text-slate-50 shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:max-w-[620px] sm:rounded-2xl sm:p-6"
        style={modalSheetScrollStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-sky-200/25 bg-sky-300/10 px-2.5 py-1 text-[11px] font-black text-sky-100">{copy.category}</span>
              <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2.5 py-1 text-[11px] font-black text-amber-100">{copy.badge}</span>
            </div>
            <h2 id="featureMarketingTitle" className="m-0 text-xl font-black leading-tight text-[#fff3c4]">{target.title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/8 text-lg font-black text-white" aria-label={t("common.close")}>
            ×
          </button>
        </div>

        <p className="m-0 text-sm font-bold leading-6 text-slate-100">{copy.headline}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{copy.subheadline}</p>

        {/* 순서 계약 — 정적 셸(index.html)의 팝업과 같다:
            무엇을 얻는가 → 어떻게 분석하는가 → 실제 리포트 예시 → 누구에게 맞는가 → 가격 → CTA */}
        <div className="mt-4 grid gap-3">
          {/* ① 무엇을 얻는가 */}
          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <h3 className="m-0 mb-2 text-xs font-black text-sky-100">{t("preview.painPointsLabel")}</h3>
            <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
              {copy.painPoints.map((item) => <li key={item} className="list-none">• {item}</li>)}
            </ul>
          </section>
          <p className="m-0 rounded-lg border border-amber-200/18 bg-amber-200/[0.075] p-3 text-sm font-semibold leading-6 text-amber-50">{copy.previewText}</p>
          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <h3 className="m-0 mb-2 text-xs font-black text-amber-100">{t("preview.deliverablesLabel")}</h3>
            <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
              {copy.unlockBenefits.map((item) => (
                <li key={item} className="list-none pl-5 -indent-5"><span className="pr-2 font-black text-amber-200">✓</span>{item}</li>
              ))}
            </ul>
          </section>
          {scaleChips(copy.reportScale, t).length > 0 && (
            <section>
              <h3 className="m-0 mb-2 text-xs font-black text-slate-300">{t("preview.scaleLabel")}</h3>
              <div className="flex flex-wrap gap-1.5">
                {scaleChips(copy.reportScale, t).map((chip) => (
                  <span key={chip} className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-xs font-black text-slate-100">{chip}</span>
                ))}
              </div>
            </section>
          )}
          {copy.answersQuestions && copy.answersQuestions.length > 0 && (
            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
              <h3 className="m-0 mb-2 text-xs font-black text-sky-100">{t("preview.questionsLabel")}</h3>
              <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
                {copy.answersQuestions.map((item) => <li key={item} className="list-none">• {item}</li>)}
              </ul>
            </section>
          )}

          {/* ② 어떻게 분석하는가 — 사용자가 이해하는 단계까지만(내부 로직·모델은 쓰지 않는다) */}
          {copy.analysisSteps && copy.analysisSteps.length > 0 && (
            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
              <h3 className="m-0 mb-2 text-xs font-black text-slate-300">{t("preview.stepsLabel")}</h3>
              <ol className="m-0 grid list-none gap-2.5 p-0">
                {copy.analysisSteps.map((step, index) => (
                  <li key={step.label} className="grid grid-cols-[20px_1fr] gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full border border-amber-200/60 text-[10px] font-black text-amber-200">{index + 1}</span>
                    <span>
                      <b className="block text-sm font-black text-slate-100">{step.label}</b>
                      {step.detail && <span className="mt-0.5 block text-xs leading-5 text-slate-300">{step.detail}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* ③ 실제 리포트 예시 — 가리지 않고 그대로 읽힌다. 샘플임은 칩과 캡션이 명시한다. */}
          {(copy.sampleReport?.sections.length || copy.resultPreview?.lines.length) && (
            <figure className="m-0">
              <h3 className="m-0 mb-2 flex items-center gap-2 text-xs font-black text-sky-100">
                {t("preview.sampleLabel")}
                <span className="rounded border border-amber-200/60 px-2 py-0.5 text-[10px] tracking-[0.08em] text-amber-200">{t("preview.sampleChip")}</span>
              </h3>
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#171236] px-4 pb-6 pt-3.5">
                {(copy.sampleReport?.sections
                  ?? (copy.resultPreview?.lines ?? []).map<FeatureMarketingSampleReport["sections"][number]>((body) => ({ body }))
                ).slice(0, 3).map((section) => (
                  <div key={section.body} className="mt-4 first:mt-0">
                    {section.heading && <p className="m-0 mb-1.5 text-xs font-black text-[#e8d5a3]">{section.heading}</p>}
                    <p className="m-0 text-sm leading-7 text-[#e7e0ff]">{section.body}</p>
                  </div>
                ))}
                <span aria-hidden className="absolute bottom-2 right-3 text-[10px] font-black tracking-[0.2em] text-[rgba(232,213,163,0.55)]">CODE DESTINY</span>
              </div>
              <p className="mt-2.5 text-xs leading-5 text-slate-300">{copy.sampleReport?.continuation || t("preview.sampleContinuation")}</p>
              {(copy.sampleReport?.caption || copy.resultPreview?.caption) && (
                <figcaption className="mt-1.5 text-xs leading-5 text-slate-400">{copy.sampleReport?.caption || copy.resultPreview?.caption}</figcaption>
              )}
            </figure>
          )}

          {/* ④ 누구에게 맞는가 */}
          {copy.recommendedFor && copy.recommendedFor.length > 0 && (
            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
              <h3 className="m-0 mb-2 text-xs font-black text-violet-100">{t("preview.recommendedLabel")}</h3>
              <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
                {copy.recommendedFor.map((item) => <li key={item} className="list-none">• {item}</li>)}
              </ul>
            </section>
          )}

          {/* ⑤ 가격 — 무료와 무엇이 다른지 먼저 납득시키고 신뢰 요소를 붙인다 */}
          {copy.valueCompare && copy.valueCompare.rows.length > 0 && (
            <section>
              <h3 className="m-0 mb-2 text-xs font-black text-slate-300">{t("preview.compareLabel")}</h3>
              <div role="table" className="overflow-hidden rounded-lg border border-white/10">
                <div role="row" className="grid grid-cols-[1.1fr_1fr_1.2fr] border-b border-white/10 bg-white/[0.06]">
                  {["", t("preview.compareFree"), t("preview.comparePremium")].map((head, i) => (
                    <span key={head || "axis"} role="columnheader" className={`px-2.5 py-2 text-xs font-black text-slate-100${i === 2 ? " bg-white/[0.05]" : ""}`}>{head}</span>
                  ))}
                </div>
                {copy.valueCompare.rows.slice(0, 5).map((row) => (
                  <div key={row.axis} role="row" className="grid grid-cols-[1.1fr_1fr_1.2fr] border-b border-white/10 last:border-b-0">
                    <span role="cell" className="px-2.5 py-2 text-xs leading-5 text-slate-300">{row.axis}</span>
                    <span role="cell" className="px-2.5 py-2 text-xs leading-5 text-slate-400">{row.free?.trim() || "—"}</span>
                    <span role="cell" className="bg-white/[0.05] px-2.5 py-2 text-xs font-bold leading-5 text-slate-100">{row.premium}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="rounded-lg border border-emerald-200/16 bg-emerald-200/[0.055] p-3">
            <h3 className="m-0 mb-2 text-xs font-black text-emerald-100">{t("preview.outcomesLabel")}</h3>
            <ul className="m-0 grid gap-1.5 p-0 text-xs leading-5 text-emerald-50/86">
              {copy.trustNotes.map((item) => <li key={item} className="list-none">• {item}</li>)}
            </ul>
          </section>

          {/* ⑥ FAQ — 기본 접힘. 펼쳐 두면 스크롤이 길어져 CTA 도달이 늦어진다. */}
          {copy.faq && copy.faq.length > 0 && (
            <section>
              <h3 className="m-0 mb-1 text-xs font-black text-slate-300">{t("preview.faqLabel")}</h3>
              <div className="rounded-lg border border-white/10">
                {copy.faq.slice(0, 5).map((item) => (
                  <details key={item.q} className="border-b border-white/10 last:border-b-0">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-bold text-slate-100">{item.q}</summary>
                    <div className="px-3 pb-3 text-xs leading-6 text-slate-300">{item.a}</div>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-4 border-t border-white/10 bg-[linear-gradient(to_top,#070b1d_76%,rgba(7,11,29,0))] px-4 pb-1 pt-4 sm:-mx-6 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-300">
            <span aria-live="polite">{priceText(target, canonicalPrice, t)}</span>
            <span>{t(target.accessType === "free" ? "preview.accessFree" : "preview.accessPaid")}</span>
          </div>
          <Link
            href={target.href}
            onClick={handleCtaClick}
            aria-busy={navPending}
            aria-disabled={!priceReady}
            tabIndex={priceReady ? undefined : -1}
            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f3d680] px-4 text-sm font-black text-[#111827] no-underline transition-opacity ${navPending || !priceReady ? "pointer-events-none opacity-55" : ""}`}
          >
            {navPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-[#111827]" aria-hidden />
                {t("preview.navPending")}
              </>
            ) : copy.ctaLabel}
          </Link>
          <p className="mb-1 mt-2 text-center text-xs leading-5 text-slate-400">
            {copy.ctaNote || t(target.accessType === "free" ? "preview.ctaNoteFree" : "preview.ctaNoteDefault")}
          </p>
        </div>
      </section>
    </div>
  );
}

export function FeatureMarketingLink({ target, href, className, children, onClick, "aria-label": ariaLabel }: FeatureMarketingLinkProps) {
  const [open, setOpen] = useState(false);
  // 무료 기능은 팝업 없이 바로 이동한다. 그런데 대상 라우트의 청크가 콜드면 전환이 수 초 걸리고
  // 그 동안 화면이 그대로라, :active 로 눌린 표시가 손을 떼는 순간 사라진 뒤에는 아무 피드백이 없다.
  // 탭이 접수됐다는 표시를 이동이 시작될 때까지 남긴다.
  const [navigating, setNavigating] = useState(false);
  const finalHref = href || target.href;
  const finalTarget = useMemo(() => ({ ...target, href: finalHref }), [target, finalHref]);

  useEffect(() => {
    if (!navigating) return;
    const timer = window.setTimeout(() => setNavigating(false), NAV_PENDING_FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, [navigating]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (!isPaidMarketingTarget(finalTarget)) {
      // 기본 동작(next/link 이동)을 막지 않는다 — 표시만 남긴다.
      if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setNavigating(true);
      return;
    }
    event.preventDefault();
    setOpen(true);
  };

  // 매 렌더 새 함수를 넘기면 모달 쪽 effect(포커스 이동·키 리스너)가 계속 재실행된다.
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <Link
        href={finalHref}
        className={navigating ? `${className || ""} opacity-70 transition-opacity` : className}
        onClick={handleClick}
        aria-busy={navigating}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
      {open ? <FeatureMarketingDetailModal open target={finalTarget} onClose={handleClose} /> : null}
    </>
  );
}
