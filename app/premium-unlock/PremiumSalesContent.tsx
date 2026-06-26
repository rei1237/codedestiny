"use client";
/**
 * PremiumSalesContent — 인생 총운 해금 세일즈 페이지 (클라이언트 컴포넌트)
 * CRO 전략: 공감 → 문제제기 → 차별성 → 베네핏 → 사회적 증명 → 가격 → CTA
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { usePayment } from "../hooks/usePayment";
const OhangRadarChart = dynamic(() => import("../components/OhangRadarChart"), { ssr: false, loading: () => null });

type PremiumSalesTx = (value: string) => string;

const PREMIUM_SALES_TEXT_KEYS_COPY = [
  "CODE DESTINY · 인생 총운 해금",
  "노력해도",
  "안 풀리는 이유,",
  "사주가 알고 있습니다",
  "AI가 분석한 ",
  "8만 건의 실제 명조 데이터",
  "를 기반으로,",
  "당신의 운명이 막힌 ",
  "정확한 이유와 타이밍",
  "을 알려드립니다.",
  "결제 화면으로 이동 중...",
  "🔓 지금 운명을 해금하기 — ₩49,000",
  "· 즉시 발급 · 앱 설치 없음",
  "8만+",
  "분석 케이스",
  "98%",
  "사용자 만족도",
  "즉시",
  "리포트 발급",
  "분명히 열심히 했는데, 왜 나만 이렇게 제자리인 걸까요?",
  "돈은 벌어도 자꾸 나가고, 재물이 쌓이지 않는 느낌",
  "인연은 와도 오래 가지 않고, 외로움이 반복됩니다",
  "중요한 선택 앞에서 확신이 없어 항상 뒤늦게 후회합니다",
  "✦ 당신만의 이야기가 아닙니다",
  "혹시 이런 생각,",
  "해본 적 있으신가요?",
  "이 감정들은 의지 부족이 아닙니다. 당신의 명조(命造)에 담긴",
  "에너지 흐름이 아직 당신에게 전달되지 않았을 뿐입니다.",
  "사주 명리학",
  "은 당신을 탓하지 않습니다.",
  "다만, 당신이 ",
  "어떤 에너지의 흐름 위에 태어났는지",
  ",",
  "그 흐름이 ",
  "지금 어느 방향으로 향하는지",
  "를 알려줍니다.",
  "8만 케이스 임상 DB",
  "실제 인물 명조와 삶의 궤적을 대조한 8만 건 이상의 데이터로 학습된 패턴 매칭 엔진.",
  "AI + 전통 명리 융합",
  "AI의 데이터 처리 능력과 천간·지지·신살·격국의 전통 이론이 결합된 하이브리드 분석.",
  "시분 단위 정밀 계산",
  "생시(生時)를 시·분 단위로 정밀 반영. 같은 날 태어나도 다른 운명을 구별합니다.",
  "대운·세운 실시간 연동",
  "현재 나이와 해당 연도 세운까지 실시간으로 연산해 지금 당장 쓸 수 있는 인사이트를 제공.",
  "✦ 왜 코드 데스티니인가",
  "5,000원짜리 운세와",
  "무엇이 다른가요?",
  "일반 운세는 생년월일로 12가지 패턴 중 하나를 고릅니다.",
  "코드 데스티니는 ",
  "당신의 고유 명조(命造)",
  "를 분석합니다.",
  "항목",
  "일반 운세",
  "코드 데스티니",
  "분석 기반",
  "생년월일 12패턴",
  "명조 고유 DB 매칭",
  "시간 정밀도",
  "일(日) 단위",
  "시·분 단위",
  "대운 분석",
  "없음 / 미흡",
  "10년 단위 정밀",
  "데이터 학습",
  "이론 기반",
  "8만 케이스 실증",
  "세운 연동",
  "연간 일반 예측",
  "현재 나이 실시간",
  "✦ 리포트 샘플 미리보기",
  "이런 분석이 포함됩니다",
  "아래는 샘플 오행 분포 분석입니다",
  "실제 리포트에는 오행 분포 외에도 대운 흐름 차트, 신살 분석,",
  "연도별 행운 지수 그래프가 추가로 포함됩니다.",
  "10년 대운의 터닝포인트 확인",
  "언제 뒤집힐지 모르는 운세 대신, 대운이 바뀌는 정확한 시점을 미리 압니다.",
  "대운(大運)은 10년 단위로 당신의 운명 에너지를 바꿉니다. 현재 어느 대운에 있는지, 다음 전환이 몇 살에 오는지 — 이 타이밍을 알면 사업, 이직, 투자 시점을 전략적으로 설계할 수 있습니다.",
  "재물운이 열리는 정확한 타이밍",
  "노력이 결실을 맺는 월·연도가 있습니다. 그 시기를 알면 타이밍을 맞출 수 있습니다.",
  "재성(財星)과 식신(食神)의 활성화 시기를 세운·월운 단위로 계산합니다. '이 시기에 이런 활동을 하면 수입이 증가할 가능성이 높다'는 구체적인 인사이트를 제공합니다.",
  "숨겨진 직업 재능 발굴",
  "사주에서 드러나는 천간·지지의 특성이 당신만의 강점 직군을 알려줍니다.",
  "단순 MBTI 수준이 아닌, 관록(官祿)·인성(印星)·식상(食傷)의 구성 비율로 당신이 빛나는 분야를 특정합니다. 창업, 전문직, 예술, 리더십 — 어디서 당신의 에너지가 극대화되는지 명료하게 드러납니다.",
  "연인·배우자 궁합 심층 분석",
  "현재 파트너 또는 이상형과의 오행·십신 상성을 정밀 분석합니다.",
  "상대방의 생년월일만 있으면 됩니다. 두 명조 간의 충(沖)·합(合)·형(刑)·파(破)를 분석해 갈등이 발생하는 구조와 조화로운 운영 방법을 제시합니다.",
  "건강 취약 시기와 에너지 관리",
  "어떤 오행이 과부하 상태인지 파악해 건강 리스크 시기를 사전에 대비합니다.",
  "오행과 신체 장기의 대응 관계를 통해 당신의 선천적 약점과 후천적 리스크 시기를 예측합니다. '이 해에는 특히 소화기관에 주의'처럼 실용적인 건강 가이드를 제공합니다.",
  "✦ 해금 시 얻게 되는 것",
  "단 한 번의 해금으로",
  "평생 나침반",
  "을 갖게 됩니다",
  "김○○",
  "34세 · 마케터",
  "대운 전환 시기를 미리 알고 이직을 준비했더니, 딱 그 시기에 좋은 제안이 왔어요. 우연이라 생각했지만 지금은 확신합니다.",
  "직업·커리어",
  "박○○",
  "28세 · 프리랜서",
  "재물운이 막힌 구체적인 이유와 언제 풀리는지를 알고 나서 오히려 마음이 편해졌어요. 기다릴 줄 알게 됐달까요.",
  "재물·투자",
  "이○○",
  "41세 · 자영업",
  "5천 원짜리 운세랑은 차원이 달랐어요. 내 명조가 왜 이런 구조인지 납득이 가는 설명을 처음 받았습니다.",
  "종합 만족도",
  "✦ 실제 사용자 후기",
  "이미 바뀐 사람들의 이야기",
  "사주팔자 전체 명조 분석",
  "오행 분포 & 균형 레이더 차트",
  "10년 대운 흐름 & 전환 시기",
  "2024~2034 세운별 행운 지수",
  "재물·직업·연애 핵심 인사이트",
  "건강 취약 시기 & 관리 가이드",
  "용신·기신 맞춤 컬러·방향·음식",
  "결과 리포트 재확인 제공",
  "👑 인생 총운 해금 패키지",
  "정가 ₩89,000",
  "45% 할인 · 지금만",
  "🔓 지금 당신의 운명을 해금하고",
  "미래의 기회를 선점하세요",
  "🔒 보안 결제",
  "⚡ 즉시 발급",
  "📱 모바일 최적화",
  "인생 총운 해금",
  "₩49,000 · 즉시 발급",
  "처리 중...",
  "지금 해금하기 🔓",
  "안전하게 결제를 진행 중입니다.",
  "Code Destiny · AI 사주 명리 분석 서비스",
  "결제 후 즉시 리포트 발급 · 앱 설치 불필요 · 개인정보 수집 최소화",
  "프리미엄 리포트 가치 가이드",
  "프리미엄 리포트 활용 가이드",
  "1. 프리미엄 리포트의 핵심은 정보량보다 의사결정 연결성입니다",
  "긴 리포트가 반드시 좋은 리포트는 아닙니다. 중요한 것은 결과가 실제 선택으로 연결되는 구조를 갖추는 것입니다. 코드 데스티니 프리미엄 리포트는 성향 설명을 넘어 시기, 리스크, 우선순위를 함께 제시해 사용자가 다음 행동을 결정할 수 있도록 설계되어야 가치가 커집니다.",
  "2. 대운·세운 해석은 타이밍 관리 도구로 읽는 것이 안전합니다",
  "운의 흐름은 결과를 확정하는 예언이 아니라 준비 강도를 조정하는 신호로 활용해야 합니다. 확장기에는 기회 탐색 범위를 넓히고, 조정기에는 구조 정비와 리스크 축소를 우선하는 식으로 해석을 일정 관리에 연결하면 체감 효용이 높아집니다. 핵심은 불안 자극이 아니라 실행 가능성입니다.",
  "3. 재물·커리어 파트는 단일 결론보다 시나리오 비교가 중요합니다",
  "실무에서 유용한 리포트는 \"무조건 A\"가 아니라 A/B/C 시나리오의 장단점과 전제조건을 함께 제시합니다. 같은 운세 신호라도 직무, 조직, 생활비 구조에 따라 최적 선택이 달라지기 때문입니다. 프리미엄 해석은 사용자가 자신의 현실 변수에 맞춰 판단할 수 있게 비교 프레임을 제공해야 합니다.",
  "4. 관계 파트는 상대 판정이 아니라 대화 전략 중심이어야 합니다",
  "프리미엄 궁합이나 관계 해석은 자극적인 단정 문장을 줄이고, 갈등 예방·회복 루틴·경계 설정 같은 행동 가이드를 중심으로 구성해야 장기 만족도가 높습니다. 관계 품질은 미래 예측보다 운영 기술에서 결정되므로, 실행 가능한 대화 스크립트와 체크리스트를 제공하는 방식이 실전적입니다.",
  "5. 좋은 리포트는 읽는 순간보다 30일 후에 가치가 증명됩니다",
  "초기 감탄보다 중요한 것은 한 달 뒤에도 다시 참고되는지 여부입니다. 그래서 리포트는 핵심 요약, 월간 체크포인트, 경보 신호를 분리해 재사용성을 높여야 합니다. 사용자가 반복 열람하며 계획을 조정할 수 있을 때 프리미엄 콘텐츠는 일회성 소비를 넘어 개인 전략 자산으로 작동합니다.",
  "6. 비보장 고지와 현실 조언의 균형이 신뢰를 만듭니다",
  "운세 리포트는 의료, 법률, 투자, 형사 사건 결과를 보장하지 않는다는 고지를 명확히 유지해야 합니다. 동시에 사용자가 당장 적용할 수 있는 현실 조언을 제공해야 신뢰가 생깁니다. 책임 있는 고지와 구체적 실행 제안이 함께 있을 때 프리미엄 리포트는 안전성과 효용을 동시에 확보할 수 있습니다.",
] as const;

const PREMIUM_SALES_TEXT_COPY: Partial<Record<LoadingLocale, Record<string, string>>> = {
  ko: Object.fromEntries(PREMIUM_SALES_TEXT_KEYS_COPY.map((value) => [value, value])) as Record<string, string>,
  en: {
    "CODE DESTINY · 인생 총운 해금": "CODE DESTINY · Life Destiny Unlock",
    "노력해도": "Even when you try,",
    "안 풀리는 이유,": "why things stay blocked",
    "사주가 알고 있습니다": "is written in your saju",
    "AI가 분석한 ": "Based on ",
    "8만 건의 실제 명조 데이터": "80,000 real chart cases",
    "를 기반으로,": ", ",
    "당신의 운명이 막힌 ": "your reading reveals ",
    "정확한 이유와 타이밍": "the precise reason and timing",
    "을 알려드립니다.": " behind the blocks in your destiny.",
    "결제 화면으로 이동 중...": "Opening the payment screen...",
    "🔓 지금 운명을 해금하기 — ₩49,000": "🔓 Unlock your destiny now — ₩49,000",
    "· 즉시 발급 · 앱 설치 없음": "· Instant report · No app install",
    "8만+": "80K+",
    "분석 케이스": "Analyzed cases",
    "98%": "98%",
    "사용자 만족도": "User satisfaction",
    "즉시": "Instant",
    "리포트 발급": "Report delivery",
    "분명히 열심히 했는데, 왜 나만 이렇게 제자리인 걸까요?": "I have been trying so hard. Why do I feel like the only one standing still?",
    "돈은 벌어도 자꾸 나가고, 재물이 쌓이지 않는 느낌": "Money comes in, yet it keeps flowing out before it can gather.",
    "인연은 와도 오래 가지 않고, 외로움이 반복됩니다": "Connections arrive, but they do not stay, and loneliness keeps circling back.",
    "중요한 선택 앞에서 확신이 없어 항상 뒤늦게 후회합니다": "At important crossroads, uncertainty lingers and regret follows later.",
    "✦ 당신만의 이야기가 아닙니다": "✦ This is not only your story",
    "혹시 이런 생각,": "Have these thoughts",
    "해본 적 있으신가요?": "ever visited you?",
    "이 감정들은 의지 부족이 아닙니다. 당신의 명조(命造)에 담긴": "These feelings are not a failure of will. The energy in your birth chart",
    "에너지 흐름이 아직 당신에게 전달되지 않았을 뿐입니다.": "has simply not been translated into a path you can feel yet.",
    "사주 명리학": "Saju Myeongli",
    "은 당신을 탓하지 않습니다.": "does not blame you.",
    "다만, 당신이 ": "It simply shows ",
    "어떤 에너지의 흐름 위에 태어났는지": "the current of energy you were born upon",
    ",": ",",
    "그 흐름이 ": "and where that current ",
    "지금 어느 방향으로 향하는지": "is moving now",
    "를 알려줍니다.": ".",
    "8만 케이스 임상 DB": "80K-case clinical database",
    "실제 인물 명조와 삶의 궤적을 대조한 8만 건 이상의 데이터로 학습된 패턴 매칭 엔진.": "A pattern-matching engine trained on more than 80,000 chart and life-path comparisons.",
    "AI + 전통 명리 융합": "AI + traditional Myeongli",
    "AI의 데이터 처리 능력과 천간·지지·신살·격국의 전통 이론이 결합된 하이브리드 분석.": "A hybrid reading that combines AI processing with heavenly stems, earthly branches, shinsal, and classical chart structure.",
    "시분 단위 정밀 계산": "Minute-level birth-time precision",
    "생시(生時)를 시·분 단위로 정밀 반영. 같은 날 태어나도 다른 운명을 구별합니다.": "Birth time is reflected by hour and minute, distinguishing different destinies born on the same day.",
    "대운·세운 실시간 연동": "Live luck-cycle linkage",
    "현재 나이와 해당 연도 세운까지 실시간으로 연산해 지금 당장 쓸 수 있는 인사이트를 제공.": "Your current age and annual flow are calculated together for insights you can use now.",
    "✦ 왜 코드 데스티니인가": "✦ Why Code Destiny",
    "5,000원짜리 운세와": "How is this different from",
    "무엇이 다른가요?": "a cheap fortune reading?",
    "일반 운세는 생년월일로 12가지 패턴 중 하나를 고릅니다.": "Ordinary readings often choose one of a few patterns from your birth date.",
    "코드 데스티니는 ": "Code Destiny reads ",
    "당신의 고유 명조(命造)": "your own birth chart",
    "를 분석합니다.": ".",
    "항목": "Item",
    "일반 운세": "Ordinary reading",
    "코드 데스티니": "Code Destiny",
    "분석 기반": "Basis",
    "생년월일 12패턴": "Birth-date patterns",
    "명조 고유 DB 매칭": "Chart-specific DB matching",
    "시간 정밀도": "Time precision",
    "일(日) 단위": "Day-level",
    "시·분 단위": "Hour and minute",
    "대운 분석": "Ten-year cycle",
    "없음 / 미흡": "Missing or shallow",
    "10년 단위 정밀": "Precise decade flow",
    "데이터 학습": "Data training",
    "이론 기반": "Theory-based",
    "8만 케이스 실증": "80K verified cases",
    "세운 연동": "Annual flow",
    "연간 일반 예측": "Generic yearly forecast",
    "현재 나이 실시간": "Real-time age linkage",
    "✦ 리포트 샘플 미리보기": "✦ Report sample preview",
    "이런 분석이 포함됩니다": "This is the kind of analysis included",
    "아래는 샘플 오행 분포 분석입니다": "Below is a sample five-element distribution.",
    "실제 리포트에는 오행 분포 외에도 대운 흐름 차트, 신살 분석,": "The full report also includes major luck-cycle charts, shinsal analysis,",
    "연도별 행운 지수 그래프가 추가로 포함됩니다.": "and yearly luck-index graphs.",
    "10년 대운의 터닝포인트 확인": "Find the turning point of your ten-year cycle",
    "언제 뒤집힐지 모르는 운세 대신, 대운이 바뀌는 정확한 시점을 미리 압니다.": "Instead of guessing when fate may turn, see when your major cycle shifts.",
    "대운(大運)은 10년 단위로 당신의 운명 에너지를 바꿉니다. 현재 어느 대운에 있는지, 다음 전환이 몇 살에 오는지 — 이 타이밍을 알면 사업, 이직, 투자 시점을 전략적으로 설계할 수 있습니다.": "Daewoon changes the energy of your destiny in ten-year waves. Seeing your current cycle and next transition age helps you plan business, career moves, and investment timing with more calm.",
    "재물운이 열리는 정확한 타이밍": "See when wealth luck opens",
    "노력이 결실을 맺는 월·연도가 있습니다. 그 시기를 알면 타이밍을 맞출 수 있습니다.": "There are months and years when effort can ripen. Knowing them helps you move with timing.",
    "재성(財星)과 식신(食神)의 활성화 시기를 세운·월운 단위로 계산합니다. '이 시기에 이런 활동을 하면 수입이 증가할 가능성이 높다'는 구체적인 인사이트를 제공합니다.": "The activation of wealth and output stars is read by annual and monthly flow, offering practical clues about when certain actions may bring stronger income potential.",
    "숨겨진 직업 재능 발굴": "Discover hidden career gifts",
    "사주에서 드러나는 천간·지지의 특성이 당신만의 강점 직군을 알려줍니다.": "The stems and branches in your chart reveal the work fields where your strengths naturally rise.",
    "단순 MBTI 수준이 아닌, 관록(官祿)·인성(印星)·식상(食傷)의 구성 비율로 당신이 빛나는 분야를 특정합니다. 창업, 전문직, 예술, 리더십 — 어디서 당신의 에너지가 극대화되는지 명료하게 드러납니다.": "Beyond a simple personality label, the balance of authority, resource, and expression stars shows where your energy shines most clearly: business, specialty work, art, leadership, or another field.",
    "연인·배우자 궁합 심층 분석": "Deep compatibility for love and partnership",
    "현재 파트너 또는 이상형과의 오행·십신 상성을 정밀 분석합니다.": "The five elements and ten gods are read to understand compatibility with a partner or ideal type.",
    "상대방의 생년월일만 있으면 됩니다. 두 명조 간의 충(沖)·합(合)·형(刑)·파(破)를 분석해 갈등이 발생하는 구조와 조화로운 운영 방법을 제시합니다.": "With the other person’s birth date, the reading traces clashes, harmonies, penalties, and breaks between charts, then suggests ways to handle tension more gracefully.",
    "건강 취약 시기와 에너지 관리": "Health-sensitive periods and energy care",
    "어떤 오행이 과부하 상태인지 파악해 건강 리스크 시기를 사전에 대비합니다.": "See which element is under strain and prepare for periods when your energy needs gentler care.",
    "오행과 신체 장기의 대응 관계를 통해 당신의 선천적 약점과 후천적 리스크 시기를 예측합니다. '이 해에는 특히 소화기관에 주의'처럼 실용적인 건강 가이드를 제공합니다.": "By reading the relationship between the five elements and the body, the report points to natural weak spots and practical care periods, such as a year when digestion needs extra attention.",
    "✦ 해금 시 얻게 되는 것": "✦ What unlocks for you",
    "단 한 번의 해금으로": "With one unlock,",
    "평생 나침반": "a lifelong compass",
    "을 갖게 됩니다": " opens in your hands",
    "김○○": "Kim ○○",
    "34세 · 마케터": "34 · Marketer",
    "대운 전환 시기를 미리 알고 이직을 준비했더니, 딱 그 시기에 좋은 제안이 왔어요. 우연이라 생각했지만 지금은 확신합니다.": "I prepared for a career move after seeing my major-cycle transition, and a good offer arrived right then. I first called it coincidence, but now I feel sure.",
    "직업·커리어": "Work · Career",
    "박○○": "Park ○○",
    "28세 · 프리랜서": "28 · Freelancer",
    "재물운이 막힌 구체적인 이유와 언제 풀리는지를 알고 나서 오히려 마음이 편해졌어요. 기다릴 줄 알게 됐달까요.": "After seeing why my wealth luck felt blocked and when it would loosen, I actually felt calmer. I learned how to wait.",
    "재물·투자": "Wealth · Investing",
    "이○○": "Lee ○○",
    "41세 · 자영업": "41 · Business owner",
    "5천 원짜리 운세랑은 차원이 달랐어요. 내 명조가 왜 이런 구조인지 납득이 가는 설명을 처음 받았습니다.": "It felt completely different from a cheap fortune reading. For the first time, I understood why my chart has this structure.",
    "종합 만족도": "Overall satisfaction",
    "✦ 실제 사용자 후기": "✦ Real user stories",
    "이미 바뀐 사람들의 이야기": "Stories from people whose path has already shifted",
    "사주팔자 전체 명조 분석": "Full saju chart analysis",
    "오행 분포 & 균형 레이더 차트": "Five-element balance radar chart",
    "10년 대운 흐름 & 전환 시기": "Ten-year luck flow and transition timing",
    "2024~2034 세운별 행운 지수": "Annual luck index for 2024-2034",
    "재물·직업·연애 핵심 인사이트": "Core wealth, career, and love insights",
    "건강 취약 시기 & 관리 가이드": "Health-sensitive periods and care guide",
    "용신·기신 맞춤 컬러·방향·음식": "Custom colors, directions, and foods by useful and unfavorable elements",
    "결과 리포트 재확인 제공": "Revisit your result report anytime",
    "👑 인생 총운 해금 패키지": "👑 Life Destiny Unlock Package",
    "정가 ₩89,000": "List price ₩89,000",
    "45% 할인 · 지금만": "45% off · Limited time",
    "🔓 지금 당신의 운명을 해금하고": "🔓 Unlock your destiny now",
    "미래의 기회를 선점하세요": "and meet tomorrow’s opportunity first",
    "🔒 보안 결제": "🔒 Secure payment",
    "⚡ 즉시 발급": "⚡ Instant delivery",
    "📱 모바일 최적화": "📱 Mobile optimized",
    "인생 총운 해금": "Life Destiny Unlock",
    "₩49,000 · 즉시 발급": "₩49,000 · Instant delivery",
    "처리 중...": "Processing...",
    "지금 해금하기 🔓": "Unlock now 🔓",
    "안전하게 결제를 진행 중입니다.": "Processing your payment securely.",
    "Code Destiny · AI 사주 명리 분석 서비스": "Code Destiny · AI saju reading service",
    "결제 후 즉시 리포트 발급 · 앱 설치 불필요 · 개인정보 수집 최소화": "Instant report after payment · No app install · Minimal personal data",
    "프리미엄 리포트 가치 가이드": "Premium report value guide",
    "프리미엄 리포트 활용 가이드": "Premium report guide",
    "1. 프리미엄 리포트의 핵심은 정보량보다 의사결정 연결성입니다": "1. The heart of a premium report is decision support, not sheer volume.",
    "긴 리포트가 반드시 좋은 리포트는 아닙니다. 중요한 것은 결과가 실제 선택으로 연결되는 구조를 갖추는 것입니다. 코드 데스티니 프리미엄 리포트는 성향 설명을 넘어 시기, 리스크, 우선순위를 함께 제시해 사용자가 다음 행동을 결정할 수 있도록 설계되어야 가치가 커집니다.": "A long report is not always a better report. What matters is whether the reading leads into real choices. Code Destiny’s premium report becomes more useful when it moves beyond temperament and brings timing, risk, and priorities into the next step.",
    "2. 대운·세운 해석은 타이밍 관리 도구로 읽는 것이 안전합니다": "2. Major and annual cycles are best read as timing tools.",
    "운의 흐름은 결과를 확정하는 예언이 아니라 준비 강도를 조정하는 신호로 활용해야 합니다. 확장기에는 기회 탐색 범위를 넓히고, 조정기에는 구조 정비와 리스크 축소를 우선하는 식으로 해석을 일정 관리에 연결하면 체감 효용이 높아집니다. 핵심은 불안 자극이 아니라 실행 가능성입니다.": "The flow of luck should not be treated as a fixed prophecy. It is a signal for adjusting preparation. During expansion, widen opportunity searches; during adjustment, refine structure and reduce risk. The point is practical action, not anxiety.",
    "3. 재물·커리어 파트는 단일 결론보다 시나리오 비교가 중요합니다": "3. Wealth and career guidance works best through scenario comparison.",
    "실무에서 유용한 리포트는 \"무조건 A\"가 아니라 A/B/C 시나리오의 장단점과 전제조건을 함께 제시합니다. 같은 운세 신호라도 직무, 조직, 생활비 구조에 따라 최적 선택이 달라지기 때문입니다. 프리미엄 해석은 사용자가 자신의 현실 변수에 맞춰 판단할 수 있게 비교 프레임을 제공해야 합니다.": "A useful report does not force one answer. It compares A, B, and C with strengths, risks, and conditions. The same signal can mean something different by job, organization, and cost structure, so a premium reading should help you judge within your real context.",
    "4. 관계 파트는 상대 판정이 아니라 대화 전략 중심이어야 합니다": "4. Relationship readings should guide conversation, not judge the other person.",
    "프리미엄 궁합이나 관계 해석은 자극적인 단정 문장을 줄이고, 갈등 예방·회복 루틴·경계 설정 같은 행동 가이드를 중심으로 구성해야 장기 만족도가 높습니다. 관계 품질은 미래 예측보다 운영 기술에서 결정되므로, 실행 가능한 대화 스크립트와 체크리스트를 제공하는 방식이 실전적입니다.": "A premium compatibility reading should avoid harsh labels and focus on conflict prevention, repair routines, and healthy boundaries. Relationship quality is often shaped more by practice than prediction, so scripts and checklists make the guidance more usable.",
    "5. 좋은 리포트는 읽는 순간보다 30일 후에 가치가 증명됩니다": "5. A good report proves its worth after thirty days.",
    "초기 감탄보다 중요한 것은 한 달 뒤에도 다시 참고되는지 여부입니다. 그래서 리포트는 핵심 요약, 월간 체크포인트, 경보 신호를 분리해 재사용성을 높여야 합니다. 사용자가 반복 열람하며 계획을 조정할 수 있을 때 프리미엄 콘텐츠는 일회성 소비를 넘어 개인 전략 자산으로 작동합니다.": "The real value is whether you return to it after the first impression fades. A report should separate summary, monthly checkpoints, and warning signals so it can be reused. When it helps you adjust plans over time, it becomes a personal strategy asset.",
    "6. 비보장 고지와 현실 조언의 균형이 신뢰를 만듭니다": "6. Trust comes from clear limits and practical guidance.",
    "운세 리포트는 의료, 법률, 투자, 형사 사건 결과를 보장하지 않는다는 고지를 명확히 유지해야 합니다. 동시에 사용자가 당장 적용할 수 있는 현실 조언을 제공해야 신뢰가 생깁니다. 책임 있는 고지와 구체적 실행 제안이 함께 있을 때 프리미엄 리포트는 안전성과 효용을 동시에 확보할 수 있습니다.": "A fortune report must clearly state that it does not guarantee medical, legal, investment, or criminal-case outcomes. At the same time, it should offer practical advice you can apply now. Responsible limits and concrete suggestions create both safety and value.",
  },
};

PREMIUM_SALES_TEXT_COPY.ja = {
  ...PREMIUM_SALES_TEXT_COPY.en,
  "CODE DESTINY · 인생 총운 해금": "CODE DESTINY · 人生総運の解放",
  "노력해도": "努力しても",
  "안 풀리는 이유,": "ほどけない理由を",
  "사주가 알고 있습니다": "四柱推命が映し出します",
  "결제 화면으로 이동 중...": "決済画面を開いています...",
  "🔓 지금 운명을 해금하기 — ₩49,000": "🔓 今すぐ運命を解放 — ₩49,000",
  "· 즉시 발급 · 앱 설치 없음": "· 即時発行 · アプリ不要",
  "분석 케이스": "分析ケース",
  "사용자 만족도": "利用者満足度",
  "즉시": "即時",
  "리포트 발급": "レポート発行",
  "✦ 당신만의 이야기가 아닙니다": "✦ あなただけの物語ではありません",
  "혹시 이런 생각,": "こんな思いが",
  "해본 적 있으신가요?": "浮かんだことはありますか？",
  "✦ 왜 코드 데스티니인가": "✦ なぜCode Destinyなのか",
  "항목": "項目",
  "일반 운세": "一般的な占い",
  "코드 데스티니": "Code Destiny",
  "✦ 리포트 샘플 미리보기": "✦ レポートサンプル",
  "이런 분석이 포함됩니다": "このような分析が含まれます",
  "✦ 해금 시 얻게 되는 것": "✦ 解放される内容",
  "단 한 번의 해금으로": "一度の解放で",
  "평생 나침반": "一生の羅針盤",
  "을 갖게 됩니다": "が手元に開かれます",
  "✦ 실제 사용자 후기": "✦ 実際の利用者の声",
  "이미 바뀐 사람들의 이야기": "すでに流れが変わった人たちの物語",
  "👑 인생 총운 해금 패키지": "👑 人生総運解放パッケージ",
  "정가 ₩89,000": "通常価格 ₩89,000",
  "45% 할인 · 지금만": "45%割引 · 今だけ",
  "🔓 지금 당신의 운명을 해금하고": "🔓 今、あなたの運命を解放し",
  "미래의 기회를 선점하세요": "未来の機会を先に受け取ってください",
  "🔒 보안 결제": "🔒 安全決済",
  "⚡ 즉시 발급": "⚡ 即時発行",
  "📱 모바일 최적화": "📱 モバイル最適化",
  "인생 총운 해금": "人生総運の解放",
  "₩49,000 · 즉시 발급": "₩49,000 · 即時発行",
  "처리 중...": "処理中...",
  "지금 해금하기 🔓": "今すぐ解放 🔓",
  "안전하게 결제를 진행 중입니다.": "安全に決済を進めています。",
  "Code Destiny · AI 사주 명리 분석 서비스": "Code Destiny · AI四柱推命リーディング",
  "결제 후 즉시 리포트 발급 · 앱 설치 불필요 · 개인정보 수집 최소화": "決済後すぐにレポート発行 · アプリ不要 · 個人情報は最小限",
  "프리미엄 리포트 가치 가이드": "プレミアムレポート価値ガイド",
  "프리미엄 리포트 활용 가이드": "プレミアムレポート活用ガイド",
};

PREMIUM_SALES_TEXT_COPY["zh-CN"] = {
  ...PREMIUM_SALES_TEXT_COPY.en,
  "CODE DESTINY · 인생 총운 해금": "CODE DESTINY · 人生总运解锁",
  "노력해도": "即使努力，",
  "안 풀리는 이유,": "仍然受阻的原因",
  "사주가 알고 있습니다": "藏在你的四柱里",
  "결제 화면으로 이동 중...": "正在打开支付页面...",
  "🔓 지금 운명을 해금하기 — ₩49,000": "🔓 立即解锁命运 — ₩49,000",
  "· 즉시 발급 · 앱 설치 없음": "· 即时生成 · 无需安装应用",
  "분석 케이스": "分析案例",
  "사용자 만족도": "用户满意度",
  "즉시": "即时",
  "리포트 발급": "报告生成",
  "✦ 당신만의 이야기가 아닙니다": "✦ 这不只是你的故事",
  "혹시 이런 생각,": "这些念头，",
  "해본 적 있으신가요?": "是否也曾来过？",
  "✦ 왜 코드 데스티니인가": "✦ 为什么选择 Code Destiny",
  "항목": "项目",
  "일반 운세": "普通运势",
  "코드 데스티니": "Code Destiny",
  "✦ 리포트 샘플 미리보기": "✦ 报告样本预览",
  "이런 분석이 포함됩니다": "报告将包含这样的分析",
  "✦ 해금 시 얻게 되는 것": "✦ 解锁后你将得到",
  "단 한 번의 해금으로": "一次解锁，",
  "평생 나침반": "一生的罗盘",
  "을 갖게 됩니다": "会在手中展开",
  "✦ 실제 사용자 후기": "✦ 真实用户反馈",
  "이미 바뀐 사람들의 이야기": "已经改变流向的人们",
  "👑 인생 총운 해금 패키지": "👑 人生总运解锁套餐",
  "정가 ₩89,000": "原价 ₩89,000",
  "45% 할인 · 지금만": "45% 优惠 · 限时",
  "🔓 지금 당신의 운명을 해금하고": "🔓 现在解锁你的命运",
  "미래의 기회를 선점하세요": "先一步迎接未来的机会",
  "🔒 보안 결제": "🔒 安全支付",
  "⚡ 즉시 발급": "⚡ 即时生成",
  "📱 모바일 최적화": "📱 移动端优化",
  "인생 총운 해금": "人生总运解锁",
  "₩49,000 · 즉시 발급": "₩49,000 · 即时生成",
  "처리 중...": "处理中...",
  "지금 해금하기 🔓": "立即解锁 🔓",
  "안전하게 결제를 진행 중입니다.": "正在安全处理支付。",
  "Code Destiny · AI 사주 명리 분석 서비스": "Code Destiny · AI四柱命理解析服务",
  "결제 후 즉시 리포트 발급 · 앱 설치 불필요 · 개인정보 수집 최소화": "支付后即时生成报告 · 无需安装应用 · 最少收集个人信息",
  "프리미엄 리포트 가치 가이드": "高级报告价值指南",
  "프리미엄 리포트 활용 가이드": "高级报告使用指南",
};

PREMIUM_SALES_TEXT_COPY["zh-TW"] = {
  ...PREMIUM_SALES_TEXT_COPY["zh-CN"],
  "CODE DESTINY · 인생 총운 해금": "CODE DESTINY · 人生總運解鎖",
  "🔓 지금 운명을 해금하기 — ₩49,000": "🔓 立即解鎖命運 — ₩49,000",
  "✦ 왜 코드 데스티니인가": "✦ 為什麼選擇 Code Destiny",
  "항목": "項目",
  "일반 운세": "一般運勢",
  "✦ 리포트 샘플 미리보기": "✦ 報告樣本預覽",
  "이런 분석이 포함됩니다": "報告將包含這樣的分析",
  "✦ 해금 시 얻게 되는 것": "✦ 解鎖後你將得到",
  "평생 나침반": "一生的羅盤",
  "👑 인생 총운 해금 패키지": "👑 人生總運解鎖套裝",
  "45% 할인 · 지금만": "45% 優惠 · 限時",
  "🔓 지금 당신의 운명을 해금하고": "🔓 現在解鎖你的命運",
  "미래의 기회를 선점하세요": "先一步迎接未來的機會",
  "🔒 보안 결제": "🔒 安全付款",
  "⚡ 즉시 발급": "⚡ 即時生成",
  "📱 모바일 최적화": "📱 行動裝置最佳化",
  "인생 총운 해금": "人生總運解鎖",
  "₩49,000 · 즉시 발급": "₩49,000 · 即時生成",
  "지금 해금하기 🔓": "立即解鎖 🔓",
  "안전하게 결제를 진행 중입니다.": "正在安全處理付款。",
  "Code Destiny · AI 사주 명리 분석 서비스": "Code Destiny · AI四柱命理解析服務",
  "결제 후 즉시 리포트 발급 · 앱 설치 불필요 · 개인정보 수집 최소화": "付款後即時生成報告 · 無需安裝應用程式 · 最少收集個人資訊",
  "프리미엄 리포트 가치 가이드": "進階報告價值指南",
  "프리미엄 리포트 활용 가이드": "進階報告使用指南",
};

const PREMIUM_SALES_MISSING_COPY: Partial<Record<LoadingLocale, string>> = {
  ko: "번역 준비 중",
  en: "Translation unavailable",
  ja: "翻訳準備中",
  "zh-CN": "翻译准备中",
  "zh-TW": "翻譯準備中",
};

function translatePremiumSalesText(value: string, locale: LoadingLocale) {
  const table = PREMIUM_SALES_TEXT_COPY[locale] || PREMIUM_SALES_TEXT_COPY.en || PREMIUM_SALES_TEXT_COPY.ko;
  return table?.[value] || PREMIUM_SALES_TEXT_COPY.en?.[value] || PREMIUM_SALES_MISSING_COPY[locale] || PREMIUM_SALES_MISSING_COPY.en || "";
}

/* ─────────────────────────────────────────
   애니메이션 헬퍼
───────────────────────────────────────── */
function FadeInSection({ children, delay = 0, className = "", style }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   파티클 배경
───────────────────────────────────────── */
function StarField() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    x: (i * 137.5) % 100,
    y: (i * 73.1) % 100,
    size: 1 + (i % 3),
    dur: 3 + (i % 4),
    delay: (i * 0.35) % 3,
    color: i % 3 === 0 ? "#d4a843" : "#a78bfa",
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {stars.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, background: s.color }}
          animate={{ opacity: [0.1, 0.6, 0.1] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity }}
        />
      ))}
      {/* 배경 오브 */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-8"
        style={{ background: "radial-gradient(circle,#7c3aed,transparent 70%)", filter: "blur(80px)" }} />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full opacity-6"
        style={{ background: "radial-gradient(circle,#d4a843,transparent 70%)", filter: "blur(70px)" }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   섹션: 헤드라인 히어로
───────────────────────────────────────── */
function HeroSection({ onCTA, isProcessing, tx }: { onCTA: () => void; isProcessing: boolean; tx: PremiumSalesTx }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center text-center px-4 py-20">
      <div className="max-w-2xl mx-auto">
        {/* 배지 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-8 border"
          style={{ background: "rgba(212,168,67,0.12)", borderColor: "rgba(212,168,67,0.35)", color: "#d4a843" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {tx("CODE DESTINY · 인생 총운 해금")}
        </motion.div>

        {/* 메인 헤드라인 */}
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6 tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <span className="block text-white">{tx("노력해도")}</span>
          <span className="block" style={{
            background: "linear-gradient(135deg,#d4a843 0%,#f0c060 35%,#a78bfa 70%,#d4a843 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "gradient-x 4s ease infinite",
          }}>
            {tx("안 풀리는 이유,")}
          </span>
          <span className="block text-white">{tx("사주가 알고 있습니다")}</span>
        </motion.h1>

        {/* 서브헤드라인 */}
        <motion.p
          className="text-lg sm:text-xl text-violet-200/70 leading-relaxed mb-10 max-w-lg mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          {tx("AI가 분석한 ")}<strong className="text-violet-100">{tx("8만 건의 실제 명조 데이터")}</strong>{tx("를 기반으로,")}
          {tx("당신의 운명이 막힌 ")}<strong className="text-amber-300">{tx("정확한 이유와 타이밍")}</strong>{tx("을 알려드립니다.")}
        </motion.p>

        {/* CTA 버튼 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 items-center justify-center"
        >
          <GoldCTAButton
            onClick={onCTA}
            size="lg"
            disabled={isProcessing}
            loading={isProcessing}
            loadingText={tx("결제 화면으로 이동 중...")}
          >
            {tx("🔓 지금 운명을 해금하기 — ₩49,000")}
          </GoldCTAButton>
          <span className="text-xs text-violet-400/40">{tx("· 즉시 발급 · 앱 설치 없음")}</span>
        </motion.div>

        {/* 신뢰 지표 */}
        <motion.div
          className="flex items-center justify-center gap-6 mt-10 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {[
            { num: tx("8만+"), label: tx("분석 케이스") },
            { num: tx("98%"), label: tx("사용자 만족도") },
            { num: tx("즉시"), label: tx("리포트 발급") },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-xl font-black" style={{ background: "linear-gradient(135deg,#d4a843,#f0c060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {item.num}
              </div>
              <div className="text-[11px] text-violet-400/50 tracking-wide">{item.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 공감 (당신의 이야기)
───────────────────────────────────────── */
function EmpathySection({ tx }: { tx: PremiumSalesTx }) {
  const pains = [
    { icon: "😔", text: tx("분명히 열심히 했는데, 왜 나만 이렇게 제자리인 걸까요?") },
    { icon: "💸", text: tx("돈은 벌어도 자꾸 나가고, 재물이 쌓이지 않는 느낌") },
    { icon: "❤️‍🩹", text: tx("인연은 와도 오래 가지 않고, 외로움이 반복됩니다") },
    { icon: "😰", text: tx("중요한 선택 앞에서 확신이 없어 항상 뒤늦게 후회합니다") },
  ];

  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-xl mx-auto">
        <FadeInSection className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-4"
            style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>
            {tx("✦ 당신만의 이야기가 아닙니다")}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-4">
            {tx("혹시 이런 생각,")}<br />
            <span style={{ color: "#a78bfa" }}>{tx("해본 적 있으신가요?")}</span>
          </h2>
          <p className="text-sm text-violet-300/60 leading-relaxed">
            {tx("이 감정들은 의지 부족이 아닙니다. 당신의 명조(命造)에 담긴")}<br />
            {tx("에너지 흐름이 아직 당신에게 전달되지 않았을 뿐입니다.")}
          </p>
        </FadeInSection>

        <div className="space-y-3">
          {pains.map((pain, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <motion.div
                className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.12)" }}
                whileHover={{ borderColor: "rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.12)" }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-2xl flex-shrink-0">{pain.icon}</span>
                <p className="text-sm text-violet-100/80 leading-relaxed pt-0.5">{pain.text}</p>
              </motion.div>
            </FadeInSection>
          ))}
        </div>

        <FadeInSection delay={0.4} className="mt-8 p-5 rounded-2xl text-center"
          style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.1),rgba(167,139,250,0.08))", border: "1px solid rgba(212,168,67,0.2)" } as React.CSSProperties}>
          <p className="text-sm text-violet-200/80 leading-relaxed">
            <strong className="text-amber-300">{tx("사주 명리학")}</strong>{tx("은 당신을 탓하지 않습니다.")}<br />
            {tx("다만, 당신이 ")}<strong className="text-white">{tx("어떤 에너지의 흐름 위에 태어났는지")}</strong>{tx(",")}<br />
            {tx("그 흐름이 ")}<strong className="text-amber-300">{tx("지금 어느 방향으로 향하는지")}</strong>{tx("를 알려줍니다.")}
          </p>
        </FadeInSection>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 차별성 (왜 코드 데스티니인가)
───────────────────────────────────────── */
function DifferentiatorSection({ tx }: { tx: PremiumSalesTx }) {
  const diffs = [
    {
      icon: "📊",
      title: tx("8만 케이스 임상 DB"),
      desc: tx("실제 인물 명조와 삶의 궤적을 대조한 8만 건 이상의 데이터로 학습된 패턴 매칭 엔진."),
    },
    {
      icon: "🧠",
      title: tx("AI + 전통 명리 융합"),
      desc: tx("AI의 데이터 처리 능력과 천간·지지·신살·격국의 전통 이론이 결합된 하이브리드 분석."),
    },
    {
      icon: "🕐",
      title: tx("시분 단위 정밀 계산"),
      desc: tx("생시(生時)를 시·분 단위로 정밀 반영. 같은 날 태어나도 다른 운명을 구별합니다."),
    },
    {
      icon: "🔄",
      title: tx("대운·세운 실시간 연동"),
      desc: tx("현재 나이와 해당 연도 세운까지 실시간으로 연산해 지금 당장 쓸 수 있는 인사이트를 제공."),
    },
  ];

  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-2xl mx-auto">
        <FadeInSection className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-4"
            style={{ background: "rgba(212,168,67,0.12)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.25)" }}>
            {tx("✦ 왜 코드 데스티니인가")}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3">
            {tx("5,000원짜리 운세와")}<br />
            <span style={{ background: "linear-gradient(135deg,#d4a843,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {tx("무엇이 다른가요?")}
            </span>
          </h2>
          <p className="text-sm text-violet-300/60 leading-relaxed">
            {tx("일반 운세는 생년월일로 12가지 패턴 중 하나를 고릅니다.")}<br />
            {tx("코드 데스티니는 ")}<strong className="text-violet-200">{tx("당신의 고유 명조(命造)")}</strong>{tx("를 분석합니다.")}
          </p>
        </FadeInSection>

        {/* 비교 테이블 */}
        <FadeInSection>
          <div className="rounded-2xl overflow-hidden mb-10" style={{ border: "1px solid rgba(167,139,250,0.18)" }}>
            <div className="grid grid-cols-3 text-center text-xs font-bold tracking-wide py-3 px-4"
              style={{ background: "rgba(167,139,250,0.1)", borderBottom: "1px solid rgba(167,139,250,0.15)" }}>
              <div className="text-violet-400/60">{tx("항목")}</div>
              <div className="text-violet-300/50">{tx("일반 운세")}</div>
              <div style={{ color: "#d4a843" }}>{tx("코드 데스티니")}</div>
            </div>
            {[
              [tx("분석 기반"), tx("생년월일 12패턴"), tx("명조 고유 DB 매칭")],
              [tx("시간 정밀도"), tx("일(日) 단위"), tx("시·분 단위")],
              [tx("대운 분석"), tx("없음 / 미흡"), tx("10년 단위 정밀")],
              [tx("데이터 학습"), tx("이론 기반"), tx("8만 케이스 실증")],
              [tx("세운 연동"), tx("연간 일반 예측"), tx("현재 나이 실시간")],
            ].map(([label, bad, good], i) => (
              <div key={i} className={`grid grid-cols-3 text-center text-xs py-3 px-4 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}
                style={{ borderBottom: i < 4 ? "1px solid rgba(167,139,250,0.08)" : "none" }}>
                <div className="text-violet-300/60 font-medium">{label}</div>
                <div className="text-violet-400/40">{bad}</div>
                <div className="font-semibold" style={{ color: "#d4a843" }}>{good}</div>
              </div>
            ))}
          </div>
        </FadeInSection>

        {/* 특징 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {diffs.map((diff, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <motion.div
                className="p-4 rounded-xl h-full"
                style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.14)" }}
                whileHover={{ borderColor: "rgba(212,168,67,0.35)", background: "rgba(212,168,67,0.06)" }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-2xl mb-2">{diff.icon}</div>
                <div className="font-bold text-sm text-white mb-1">{diff.title}</div>
                <div className="text-xs text-violet-300/60 leading-relaxed">{diff.desc}</div>
              </motion.div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 샘플 오행 차트 미리보기
───────────────────────────────────────── */
function SampleChartSection({ tx }: { tx: PremiumSalesTx }) {
  const sampleData = { wood: 65, fire: 40, earth: 28, metal: 55, water: 18 };

  return (
    <section className="py-16 px-4 relative z-10">
      <div className="max-w-md mx-auto">
        <FadeInSection className="text-center mb-8">
          <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-4"
            style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>
            {tx("✦ 리포트 샘플 미리보기")}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
            {tx("이런 분석이 포함됩니다")}
          </h2>
          <p className="text-xs text-violet-300/50">{tx("아래는 샘플 오행 분포 분석입니다")}</p>
        </FadeInSection>
        <FadeInSection delay={0.15}>
          <OhangRadarChart data={sampleData} showBalance showDominant />
        </FadeInSection>
        <FadeInSection delay={0.25} className="mt-4 text-center">
          <p className="text-xs text-violet-400/40 leading-relaxed">
            {tx("실제 리포트에는 오행 분포 외에도 대운 흐름 차트, 신살 분석,")}<br />
            {tx("연도별 행운 지수 그래프가 추가로 포함됩니다.")}
          </p>
        </FadeInSection>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 베네핏 (5가지 가치)
───────────────────────────────────────── */
function BenefitsSection({ onCTA, tx }: { onCTA: () => void; tx: PremiumSalesTx }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const benefits = [
    {
      no: "01",
      title: tx("10년 대운의 터닝포인트 확인"),
      short: tx("언제 뒤집힐지 모르는 운세 대신, 대운이 바뀌는 정확한 시점을 미리 압니다."),
      detail:
        tx("대운(大運)은 10년 단위로 당신의 운명 에너지를 바꿉니다. 현재 어느 대운에 있는지, 다음 전환이 몇 살에 오는지 — 이 타이밍을 알면 사업, 이직, 투자 시점을 전략적으로 설계할 수 있습니다."),
      icon: "🔭",
    },
    {
      no: "02",
      title: tx("재물운이 열리는 정확한 타이밍"),
      short: tx("노력이 결실을 맺는 월·연도가 있습니다. 그 시기를 알면 타이밍을 맞출 수 있습니다."),
      detail:
        tx("재성(財星)과 식신(食神)의 활성화 시기를 세운·월운 단위로 계산합니다. '이 시기에 이런 활동을 하면 수입이 증가할 가능성이 높다'는 구체적인 인사이트를 제공합니다."),
      icon: "💰",
    },
    {
      no: "03",
      title: tx("숨겨진 직업 재능 발굴"),
      short: tx("사주에서 드러나는 천간·지지의 특성이 당신만의 강점 직군을 알려줍니다."),
      detail:
        tx("단순 MBTI 수준이 아닌, 관록(官祿)·인성(印星)·식상(食傷)의 구성 비율로 당신이 빛나는 분야를 특정합니다. 창업, 전문직, 예술, 리더십 — 어디서 당신의 에너지가 극대화되는지 명료하게 드러납니다."),
      icon: "🌟",
    },
    {
      no: "04",
      title: tx("연인·배우자 궁합 심층 분석"),
      short: tx("현재 파트너 또는 이상형과의 오행·십신 상성을 정밀 분석합니다."),
      detail:
        tx("상대방의 생년월일만 있으면 됩니다. 두 명조 간의 충(沖)·합(合)·형(刑)·파(破)를 분석해 갈등이 발생하는 구조와 조화로운 운영 방법을 제시합니다."),
      icon: "💑",
    },
    {
      no: "05",
      title: tx("건강 취약 시기와 에너지 관리"),
      short: tx("어떤 오행이 과부하 상태인지 파악해 건강 리스크 시기를 사전에 대비합니다."),
      detail:
        tx("오행과 신체 장기의 대응 관계를 통해 당신의 선천적 약점과 후천적 리스크 시기를 예측합니다. '이 해에는 특히 소화기관에 주의'처럼 실용적인 건강 가이드를 제공합니다."),
      icon: "🌿",
    },
  ];

  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-xl mx-auto">
        <FadeInSection className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-4"
            style={{ background: "rgba(212,168,67,0.12)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.25)" }}>
            {tx("✦ 해금 시 얻게 되는 것")}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            {tx("단 한 번의 해금으로")}<br />
            <span style={{ color: "#d4a843" }}>{tx("평생 나침반")}</span>{tx("을 갖게 됩니다")}
          </h2>
        </FadeInSection>

        <div className="space-y-3">
          {benefits.map((b, i) => (
            <FadeInSection key={i} delay={i * 0.08}>
              <motion.div
                className="rounded-xl overflow-hidden cursor-pointer"
                style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}
                onClick={() => setExpanded(expanded === i ? null : i)}
                whileHover={{ borderColor: "rgba(212,168,67,0.3)" }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="text-xl flex-shrink-0 mt-0.5">{b.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black tracking-widest" style={{ color: "#d4a843" }}>{b.no}</span>
                      <h3 className="font-bold text-sm text-white">{b.title}</h3>
                    </div>
                    <p className="text-[13px] text-violet-300/70 leading-relaxed">{b.short}</p>
                  </div>
                  <motion.div
                    className="text-violet-400/40 text-sm flex-shrink-0 mt-0.5"
                    animate={{ rotate: expanded === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    ▼
                  </motion.div>
                </div>

                <AnimatePresence>
                  {expanded === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 text-[13px] text-violet-200/70 leading-relaxed border-t border-violet-700/20 pt-3">
                        {b.detail}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 사회적 증명 (후기)
───────────────────────────────────────── */
function TestimonialsSection({ tx }: { tx: PremiumSalesTx }) {
  const reviews = [
    {
      name: tx("김○○"),
      age: tx("34세 · 마케터"),
      text: tx("대운 전환 시기를 미리 알고 이직을 준비했더니, 딱 그 시기에 좋은 제안이 왔어요. 우연이라 생각했지만 지금은 확신합니다."),
      stars: 5,
      tag: tx("직업·커리어"),
    },
    {
      name: tx("박○○"),
      age: tx("28세 · 프리랜서"),
      text: tx("재물운이 막힌 구체적인 이유와 언제 풀리는지를 알고 나서 오히려 마음이 편해졌어요. 기다릴 줄 알게 됐달까요."),
      stars: 5,
      tag: tx("재물·투자"),
    },
    {
      name: tx("이○○"),
      age: tx("41세 · 자영업"),
      text: tx("5천 원짜리 운세랑은 차원이 달랐어요. 내 명조가 왜 이런 구조인지 납득이 가는 설명을 처음 받았습니다."),
      stars: 5,
      tag: tx("종합 만족도"),
    },
  ];

  return (
    <section className="py-16 px-4 relative z-10">
      <div className="max-w-2xl mx-auto">
        <FadeInSection className="text-center mb-10">
          <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-4"
            style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>
            {tx("✦ 실제 사용자 후기")}
          </div>
          <h2 className="text-xl font-bold text-white">{tx("이미 바뀐 사람들의 이야기")}</h2>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {reviews.map((r, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <motion.div
                className="p-4 rounded-xl h-full flex flex-col"
                style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.15)" }}
                whileHover={{ borderColor: "rgba(212,168,67,0.3)", scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-amber-400 text-sm mb-2">{"★".repeat(r.stars)}</div>
                <p className="text-[13px] text-violet-200/80 leading-relaxed flex-1 mb-3">
                  "{r.text}"
                </p>
                <div>
                  <div className="text-xs font-bold text-white">{r.name}</div>
                  <div className="text-[10px] text-violet-400/50">{r.age}</div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: "rgba(212,168,67,0.12)", color: "#d4a843" }}>
                    {r.tag}
                  </span>
                </div>
              </motion.div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 가격 & 최종 CTA
───────────────────────────────────────── */
function PricingCTASection({ onCTA, isProcessing, tx }: { onCTA: () => void; isProcessing: boolean; tx: PremiumSalesTx }) {
  const includes = [
    tx("사주팔자 전체 명조 분석"),
    tx("오행 분포 & 균형 레이더 차트"),
    tx("10년 대운 흐름 & 전환 시기"),
    tx("2024~2034 세운별 행운 지수"),
    tx("재물·직업·연애 핵심 인사이트"),
    tx("건강 취약 시기 & 관리 가이드"),
    tx("용신·기신 맞춤 컬러·방향·음식"),
    tx("결과 리포트 재확인 제공"),
  ];

  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-sm mx-auto">
        <FadeInSection>
          <motion.div
            className="rounded-3xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg,rgba(20,12,50,0.97) 0%,rgba(8,5,20,0.99) 100%)",
              border: "1px solid rgba(212,168,67,0.35)",
              boxShadow: "0 0 60px rgba(212,168,67,0.08)",
            }}
          >
            {/* 상단 배지 */}
            <div className="text-center py-4 border-b border-amber-700/20"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.12),rgba(212,168,67,0.06))" }}>
              <span className="text-[11px] font-black tracking-widest" style={{ color: "#d4a843" }}>
                {tx("👑 인생 총운 해금 패키지")}
              </span>
            </div>

            <div className="p-6">
              {/* 가격 */}
              <div className="text-center mb-6">
                <div className="text-sm text-violet-400/50 line-through mb-1">{tx("정가 ₩89,000")}</div>
                <div className="flex items-end justify-center gap-2">
                  <span className="text-5xl font-black" style={{ background: "linear-gradient(135deg,#d4a843,#f0c060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    ₩49,000
                  </span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-2"
                  style={{ background: "rgba(212,168,67,0.15)", color: "#d4a843" }}>
                  {tx("45% 할인 · 지금만")}
                </div>
              </div>

              {/* 포함 항목 */}
              <div className="space-y-2 mb-6">
                {includes.map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-2.5 text-[13px] text-violet-200/80"
                    initial={{ x: -8, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <span className="text-amber-400 flex-shrink-0 text-[11px]">✦</span>
                    {item}
                  </motion.div>
                ))}
              </div>

              {/* 메인 CTA */}
              <GoldCTAButton
                onClick={onCTA}
                size="lg"
                fullWidth
                disabled={isProcessing}
                loading={isProcessing}
                loadingText={tx("결제 화면으로 이동 중...")}
              >
                {tx("🔓 지금 당신의 운명을 해금하고")}<br />
                <span className="font-normal text-xs opacity-90">{tx("미래의 기회를 선점하세요")}</span>
              </GoldCTAButton>

              {/* 보증 */}
              <div className="flex items-center justify-center gap-4 mt-4">
                {[tx("🔒 보안 결제"), tx("⚡ 즉시 발급"), tx("📱 모바일 최적화")].map((v, i) => (
                  <span key={i} className="text-[10px] text-violet-400/40">{v}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </FadeInSection>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   골드 CTA 버튼 공통 컴포넌트
───────────────────────────────────────── */
function GoldCTAButton({
  children,
  onClick,
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  loadingText = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
}) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onHoverStart={() => {
        if (!disabled) setIsHovering(true);
      }}
      onHoverEnd={() => setIsHovering(false)}
      className={`relative font-bold rounded-2xl overflow-hidden leading-tight transition-opacity ${disabled ? "cursor-not-allowed opacity-75" : ""} ${fullWidth ? "w-full" : ""} ${size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm"}`}
      style={{
        background: "linear-gradient(135deg,#c9940f 0%,#e8b828 40%,#f5cc4a 60%,#b8860b 100%)",
        color: "#1a0e00",
        boxShadow: disabled
          ? "0 2px 12px rgba(212,168,67,0.2), 0 1px 4px rgba(0,0,0,0.25)"
          : "0 4px 28px rgba(212,168,67,0.4), 0 2px 8px rgba(0,0,0,0.4)",
      }}
      whileHover={disabled ? undefined : { scale: 1.02, boxShadow: "0 6px 36px rgba(212,168,67,0.6), 0 2px 12px rgba(0,0,0,0.4)" }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      animate={disabled ? undefined : { boxShadow: ["0 4px 28px rgba(212,168,67,0.35)", "0 4px 40px rgba(212,168,67,0.6)", "0 4px 28px rgba(212,168,67,0.35)"] }}
      transition={disabled ? { duration: 0.15 } : { boxShadow: { duration: 2.5, repeat: Infinity }, scale: { duration: 0.15 } }}
    >
      {/* 빛 스위프 효과 */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.4) 50%,transparent 100%)" }}
        animate={isHovering && !disabled ? { x: ["-100%", "100%"] } : { x: "-100%" }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      {loading ? (
        <span className="relative z-10 inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-[#1a0e00]/30 border-t-[#1a0e00] animate-spin" />
          {loadingText}
        </span>
      ) : (
        <span className="relative z-10">{children}</span>
      )}
    </motion.button>
  );
}

/* ─────────────────────────────────────────
   고정 하단 CTA 바
───────────────────────────────────────── */
function StickyBottomCTA({ onCTA, isProcessing, tx }: { onCTA: () => void; isProcessing: boolean; tx: PremiumSalesTx }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 safe-area-bottom"
          style={{ background: "linear-gradient(0deg,rgba(8,5,20,0.97) 0%,rgba(8,5,20,0.9) 60%,transparent 100%)" }}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          <div className="max-w-sm mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs font-bold text-white">{tx("인생 총운 해금")}</div>
              <div className="text-[10px] text-amber-400/70">{tx("₩49,000 · 즉시 발급")}</div>
            </div>
            <GoldCTAButton
              onClick={onCTA}
              size="md"
              disabled={isProcessing}
              loading={isProcessing}
              loadingText={tx("처리 중...")}
            >
              {tx("지금 해금하기 🔓")}
            </GoldCTAButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const PREMIUM_VALUE_SECTIONS_COPY = [
  {
    title: "1. 프리미엄 리포트의 핵심은 정보량보다 의사결정 연결성입니다",
    body:
      "긴 리포트가 반드시 좋은 리포트는 아닙니다. 중요한 것은 결과가 실제 선택으로 연결되는 구조를 갖추는 것입니다. 코드 데스티니 프리미엄 리포트는 성향 설명을 넘어 시기, 리스크, 우선순위를 함께 제시해 사용자가 다음 행동을 결정할 수 있도록 설계되어야 가치가 커집니다.",
  },
  {
    title: "2. 대운·세운 해석은 타이밍 관리 도구로 읽는 것이 안전합니다",
    body:
      "운의 흐름은 결과를 확정하는 예언이 아니라 준비 강도를 조정하는 신호로 활용해야 합니다. 확장기에는 기회 탐색 범위를 넓히고, 조정기에는 구조 정비와 리스크 축소를 우선하는 식으로 해석을 일정 관리에 연결하면 체감 효용이 높아집니다. 핵심은 불안 자극이 아니라 실행 가능성입니다.",
  },
  {
    title: "3. 재물·커리어 파트는 단일 결론보다 시나리오 비교가 중요합니다",
    body:
      "실무에서 유용한 리포트는 \"무조건 A\"가 아니라 A/B/C 시나리오의 장단점과 전제조건을 함께 제시합니다. 같은 운세 신호라도 직무, 조직, 생활비 구조에 따라 최적 선택이 달라지기 때문입니다. 프리미엄 해석은 사용자가 자신의 현실 변수에 맞춰 판단할 수 있게 비교 프레임을 제공해야 합니다.",
  },
  {
    title: "4. 관계 파트는 상대 판정이 아니라 대화 전략 중심이어야 합니다",
    body:
      "프리미엄 궁합이나 관계 해석은 자극적인 단정 문장을 줄이고, 갈등 예방·회복 루틴·경계 설정 같은 행동 가이드를 중심으로 구성해야 장기 만족도가 높습니다. 관계 품질은 미래 예측보다 운영 기술에서 결정되므로, 실행 가능한 대화 스크립트와 체크리스트를 제공하는 방식이 실전적입니다.",
  },
  {
    title: "5. 좋은 리포트는 읽는 순간보다 30일 후에 가치가 증명됩니다",
    body:
      "초기 감탄보다 중요한 것은 한 달 뒤에도 다시 참고되는지 여부입니다. 그래서 리포트는 핵심 요약, 월간 체크포인트, 경보 신호를 분리해 재사용성을 높여야 합니다. 사용자가 반복 열람하며 계획을 조정할 수 있을 때 프리미엄 콘텐츠는 일회성 소비를 넘어 개인 전략 자산으로 작동합니다.",
  },
  {
    title: "6. 비보장 고지와 현실 조언의 균형이 신뢰를 만듭니다",
    body:
      "운세 리포트는 의료, 법률, 투자, 형사 사건 결과를 보장하지 않는다는 고지를 명확히 유지해야 합니다. 동시에 사용자가 당장 적용할 수 있는 현실 조언을 제공해야 신뢰가 생깁니다. 책임 있는 고지와 구체적 실행 제안이 함께 있을 때 프리미엄 리포트는 안전성과 효용을 동시에 확보할 수 있습니다.",
  },
] as const;

function PremiumValueGuide({ tx }: { tx: PremiumSalesTx }) {
  return (
    <section style={{ maxWidth: "980px", margin: "0 auto", padding: "22px 16px 72px" }} aria-label={tx("프리미엄 리포트 가치 가이드")}>
      <h2 style={{ margin: "0 0 12px", color: "#fbbf24", fontSize: "1.06rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {tx("프리미엄 리포트 활용 가이드")}
      </h2>
      <div style={{ display: "grid", gap: "10px" }}>
        {PREMIUM_VALUE_SECTIONS_COPY.map((section) => (
          <article key={section.title} style={{ borderRadius: "12px", border: "1px solid rgba(251,191,36,0.26)", background: "rgba(24,18,8,0.68)", padding: "14px" }}>
            <h3 style={{ margin: "0 0 6px", color: "#fde68a", fontSize: "0.92rem", lineHeight: 1.5 }}>{tx(section.title)}</h3>
            <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.78, color: "rgba(226,232,240,0.9)" }}>{tx(section.body)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   메인 내보내기
───────────────────────────────────────── */
export default function PremiumSalesContent() {
  const router = useRouter();
  const { isPaymentLoading, startPayment, endPayment } = usePayment();
  const [isCtaPending, setIsCtaPending] = useState(false);
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const ctaDelayTimerRef = useRef<number | null>(null);

  const isBusy = isPaymentLoading || isCtaPending;
  const tx = useCallback((value: string) => translatePremiumSalesText(value, locale), [locale]);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
      if (ctaDelayTimerRef.current) {
        window.clearTimeout(ctaDelayTimerRef.current);
      }
    };
  }, []);

  const handleCTA = () => {
    if (isBusy) return;

    setIsCtaPending(true);

    if (ctaDelayTimerRef.current) {
      window.clearTimeout(ctaDelayTimerRef.current);
    }

    ctaDelayTimerRef.current = window.setTimeout(() => {
      startPayment(tx("안전하게 결제를 진행 중입니다."));
      setIsCtaPending(false);
      router.push("/points");

      // 페이지 전환/언마운트 여부와 무관하게 오버레이 고착을 방지한다.
      window.setTimeout(() => {
        endPayment();
      }, 1500);
    }, 180);
  };

  return (
    <div className="relative min-h-screen bg-[#08050f]" style={{ fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      <StarField />

      <div className="relative z-10">
        <HeroSection onCTA={handleCTA} isProcessing={isBusy} tx={tx} />
        <EmpathySection tx={tx} />
        <DifferentiatorSection tx={tx} />
        <SampleChartSection tx={tx} />
        <BenefitsSection onCTA={handleCTA} tx={tx} />
        <TestimonialsSection tx={tx} />
        <PricingCTASection onCTA={handleCTA} isProcessing={isBusy} tx={tx} />
        <PremiumValueGuide tx={tx} />

        {/* 푸터 안심 구매 */}
        <footer className="text-center py-12 px-4 text-[11px] text-violet-400/30 leading-relaxed">
          <div className="mb-2">{tx("Code Destiny · AI 사주 명리 분석 서비스")}</div>
          <div>{tx("결제 후 즉시 리포트 발급 · 앱 설치 불필요 · 개인정보 수집 최소화")}</div>
        </footer>
      </div>

      <StickyBottomCTA onCTA={handleCTA} isProcessing={isBusy} tx={tx} />
    </div>
  );
}
