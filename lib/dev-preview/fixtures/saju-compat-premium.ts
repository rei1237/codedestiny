// 개발 화면 전용 사주 고급 궁합 예시. 정적 카드는 실제 계산기(worker/lib/saju-compat-premium-facts.js) 출력 표본이다.
import type { DevPreviewState } from "@/lib/dev-preview/core";

const STATIC_CARDS = {
  "relationLabel": "연애 중",
  "self": {
    "timeUnknown": false,
    "pillars": {
      "year": "壬申",
      "month": "甲辰",
      "day": "癸亥",
      "hour": "丙辰"
    },
    "dayMasterLabel": "계(癸)",
    "fiveElements": {
      "목": 1,
      "화": 1,
      "토": 2,
      "금": 1,
      "수": 3
    }
  },
  "partner": {
    "timeUnknown": true,
    "pillars": {
      "year": "庚午",
      "month": "丙戌",
      "day": "壬申",
      "hour": null
    },
    "dayMasterLabel": "임(壬)",
    "fiveElements": {
      "목": 0,
      "화": 2,
      "토": 1,
      "금": 2,
      "수": 1
    }
  },
  "axisScores": {
    "attraction": 61,
    "stability": 42,
    "communication": 49,
    "endurance": 46
  },
  "elementComplement": {
    "lines": [
      "상대의 화 기운(2)이 나에게 적은 화 기운(1)을 채워 줍니다.",
      "상대의 금 기운(2)이 나에게 적은 금 기운(1)을 채워 줍니다.",
      "나의 토 기운(2)이 상대에게 적은 토 기운(1)을 채워 줍니다.",
      "나의 수 기운(3)이 상대에게 적은 수 기운(1)을 채워 줍니다."
    ]
  },
  "harmonyClash": {
    "dayStem": {
      "selfStem": "癸",
      "partnerStem": "壬",
      "relationKind": "same",
      "relationLabel": "비화(比和) — 같은 오행",
      "stemCombination": false,
      "stemClash": false,
      "partnerAsMyTenGod": "겁재",
      "meAsPartnerTenGod": "겁재"
    },
    "supportCount": 2,
    "tensionCount": 3,
    "relations": [
      {
        "selfPillar": "월주",
        "selfBranch": "辰",
        "partnerPillar": "월주",
        "partnerBranch": "戌",
        "type": "충",
        "polarity": "tension",
        "selfBranchKo": "진",
        "partnerBranchKo": "술"
      },
      {
        "selfPillar": "월주",
        "selfBranch": "辰",
        "partnerPillar": "일주",
        "partnerBranch": "申",
        "type": "반합",
        "polarity": "support",
        "element": "수",
        "selfBranchKo": "진",
        "partnerBranchKo": "신"
      },
      {
        "selfPillar": "일주",
        "selfBranch": "亥",
        "partnerPillar": "일주",
        "partnerBranch": "申",
        "type": "해",
        "polarity": "tension",
        "selfBranchKo": "해",
        "partnerBranchKo": "신"
      },
      {
        "selfPillar": "시주",
        "selfBranch": "辰",
        "partnerPillar": "월주",
        "partnerBranch": "戌",
        "type": "충",
        "polarity": "tension",
        "selfBranchKo": "진",
        "partnerBranchKo": "술"
      },
      {
        "selfPillar": "시주",
        "selfBranch": "辰",
        "partnerPillar": "일주",
        "partnerBranch": "申",
        "type": "반합",
        "polarity": "support",
        "element": "수",
        "selfBranchKo": "진",
        "partnerBranchKo": "신"
      }
    ]
  },
  "partnerTemperament": {
    "basis": "도화·홍염·이성 십성(남성 재성, 여성 관성)·배우자궁 합충·역마의 원국 계산값",
    "grade": "낮음",
    "score": 2,
    "maxScore": 8,
    "oppositeTenGod": {
      "label": "재성",
      "counts": {
        "정재": 0.7,
        "편재": 1
      },
      "total": 1.7
    },
    "intensity": {
      "dohwa": 0,
      "hongyeom": 0
    },
    "evidence": [
      {
        "key": "oppositeTenGodMixed",
        "label": "재성 혼잡",
        "detail": "정재 0.7, 편재 1로 두 기운이 함께 있어 끌리는 이성상이 한 가지로 고정되지 않는 경향입니다.",
        "weight": 1
      },
      {
        "key": "yeokma",
        "label": "역마살",
        "detail": "일지 申(신)에 역마가 있어 활동 반경과 만남의 폭이 넓은 편입니다.",
        "weight": 1
      }
    ],
    "timeUnknown": true,
    "caution": "명식에서 계산한 이성 기질 경향입니다. 실제 행동이나 관계의 사실을 판정하지 않으며, 대화와 신뢰가 더 중요한 근거입니다."
  },
  "pastLife": {
    "selfDayPillar": "癸亥",
    "partnerYearPillar": "庚午",
    "stemKey": "partnerNurtures",
    "branchKey": "plain",
    "title": "글을 가르친 서당 훈장",
    "grade": "이어진 인연",
    "text": "어린 나에게 글을 가르친 훈장으로 그려집니다. 이번 생에도 상대에게서 배울 것이 많은 결입니다.",
    "note": "전생 인연은 일주와 상대 년주를 교차한 정적 풀이표이며, 재미로 읽는 전통 설화식 해석입니다."
  },
  "uncertainty": [
    "partner_birth_time_unknown"
  ]
} as const;

const PARAGRAPH = (lead: string) =>
  `${lead} 두 사람의 명식에서 계산된 근거를 먼저 놓고, 그 근거가 일상의 어느 장면에서 드러나는지 차례로 짚어 봅니다. ` +
  "같은 근거라도 관계의 단계에 따라 편안함으로 오기도 하고 부담으로 오기도 하니, 아래 내용은 판정이 아니라 대화를 시작하는 자료로 읽어 주세요.\n\n" +
  "생활 속에서는 약속을 정하는 방식, 서운함을 꺼내는 시점, 쉬는 날을 보내는 방법에서 차이가 먼저 보입니다. " +
  "서로의 속도를 확인하는 짧은 질문 하나가 오해를 크게 줄여 줍니다.";

const CHAPTERS = [
  { key: "overview", label: "관계 총론", sections: [
    { title: "두 사람이 만나는 자리", body: PARAGRAPH("계수 일간과 임수 일간이 만나 같은 물의 결을 나눕니다.") },
    { title: "궁합 네 축의 큰 그림", body: PARAGRAPH("끌림 61, 안정 42, 소통 49, 지속 46으로 끌림이 앞서고 안정은 함께 다져야 하는 조합입니다.") },
  ] },
  { key: "temperament", label: "성향·소통", sections: [
    { title: "오행으로 보는 서로의 빈자리", body: PARAGRAPH("상대의 화·금 기운이 내게 적은 자리를 채워 줍니다.") },
    { title: "말이 엇갈리는 지점과 풀리는 방식", body: PARAGRAPH("월지 진술충이 두 번 겹쳐 생활 리듬에서 부딪히기 쉽습니다.") },
  ] },
  { key: "trust", label: "신뢰·이성 기질", sections: [
    { title: "상대의 이성 기질 — 계산된 근거로 읽기", body: PARAGRAPH("상대의 이성 기질 지표는 8점 중 2점, 낮음입니다.") },
    { title: "신뢰를 지키는 두 사람의 방식", body: PARAGRAPH("진신 반합이 두 번 들어 서로를 붙잡아 주는 힘도 함께 있습니다.") },
  ] },
  { key: "timing", label: "시기·실천", sections: [
    { title: "앞으로 3년, 관계의 흐름", body: PARAGRAPH("가까운 세 해의 세운이 두 명식과 만나는 자리를 차례로 봅니다.") },
    { title: "두 사람을 위한 실천 비책", body: PARAGRAPH("다툼이 잦은 장면을 미리 정해 두고 그때 쓸 말을 함께 고릅니다.") },
  ] },
];

function completedResult() {
  return {
    version: "saju-compat-premium-prompt-v1",
    summaryTitle: "같은 물길을 걷는 두 사람",
    oneLine: "끌림은 분명하고, 생활의 리듬은 대화로 함께 맞춰 가는 궁합입니다.",
    keywords: ["비화", "진술충", "수 반합"],
    chapters: CHAPTERS,
    actionTips: ["이번 주: 쉬는 날 계획을 한 가지씩 번갈아 정하기", "이번 달: 서운한 일을 하루 안에 짧게 말하기", "올해: 큰 지출 전에 함께 기준 세우기"],
    finalMessage: "닮은 두 사람이 서로의 빈자리를 알아보는 순간, 관계는 훨씬 단단해집니다.",
    temperamentCaution: STATIC_CARDS.partnerTemperament.caution,
    staticCards: STATIC_CARDS,
  };
}

/** `?preview=success|truncated|failed` 상태별 GET /api/saju-compat-premium/result 응답. */
export function buildSajuCompatPremiumPreviewPayload(state: DevPreviewState): { status: number; body: Record<string, unknown> } {
  const sessionId = "preview-saju-compat-premium";
  if (state === "failed") {
    return { status: 409, body: { ok: false, reason: "GENERATION_FAILED", message: "사주 고급 궁합을 아직 완성하지 못했습니다. 결제는 보존되었으니 다시 시도해 주세요.",
      sessionId, refunded: false, retry: { available: true, refundAt: new Date(Date.now() + 86_400_000).toISOString(), sessionId } } };
  }
  if (state === "truncated") {
    return { status: 202, body: { ok: true, sessionId, resumeSessionId: sessionId, status: "partial", saved: false, relationType: "dating", progress: { completed: 2, total: 4 }, continue: false } };
  }
  return { status: 200, body: { ok: true, sessionId, resumeSessionId: sessionId, status: "completed", saved: true, accessType: "paid", relationType: "dating", progress: { completed: 4, total: 4 }, result: completedResult() } };
}
