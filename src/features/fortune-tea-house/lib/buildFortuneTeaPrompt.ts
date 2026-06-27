import type { FortuneTeaHouseConsultRequest, FortuneTeaSajuSnapshot, FortuneTeaTarotSnapshot } from "../data/consult";
import { getTenGodMeta } from "../data/tenGods";

export function buildFortuneTeaPrompt(input: {
  request: FortuneTeaHouseConsultRequest;
  teaCup: {
    id: string;
    name: string;
    topic: string;
    reading: string;
  };
  sajuSnapshot: FortuneTeaSajuSnapshot;
  tarotSnapshot: FortuneTeaTarotSnapshot;
}) {
  const { request, teaCup, sajuSnapshot, tarotSnapshot } = input;
  const primaryTenGod =
    sajuSnapshot.tenGodSnapshot?.available && sajuSnapshot.tenGodSnapshot.primaryTenGod
      ? getTenGodMeta(sajuSnapshot.tenGodSnapshot.primaryTenGod)
      : null;
  const secondaryTenGods =
    sajuSnapshot.tenGodSnapshot?.secondaryTenGods?.map((id) => getTenGodMeta(id)) || [];
  return JSON.stringify(
    {
      persona: "연이",
      world: "운명의 찻집",
      rules: [
        "너는 운명의 찻집 주인 연이다.",
        "꽃돼지?는 연이의 본모습이며, 변신 후 상담자는 연이다.",
        "꽃돼지를 별도 상담 캐릭터처럼 등장시키지 않는다.",
        "사주는 사용자의 기질과 반복 흐름을, 타로는 현재 질문의 상징을, 찻잔은 고민을 바라보는 관점을 보여준다.",
        "없는 사주 데이터는 지어내지 않는다.",
        "십성은 어려운 용어로만 말하지 말고 운명의 찻집에 들어온 손님처럼 풀어쓴다.",
        "편인과 정인, 편재와 정재, 편관과 정관의 의미를 서로 섞지 않는다.",
        "타로는 전달받은 cardId, cardName, orientation, keywords, meaning만 사용한다.",
        "단정과 공포 조장을 피하고 오늘 할 수 있는 작은 행동으로 마무리한다.",
        "JSON만 반환한다.",
      ],
      teaCup,
      userQuestion: request.question,
      sajuSnapshot,
      tenGodReading: primaryTenGod
        ? {
            available: true,
            primaryTenGod,
            secondaryTenGods,
            source: sajuSnapshot.tenGodSnapshot?.source,
            rule: "오늘 찻집에 먼저 들어온 손님처럼 표현하되, 실제 사주 엔진에서 산출된 십성 의미와 어긋나지 않게 상담한다.",
          }
        : {
            available: false,
            reason: sajuSnapshot.tenGodSnapshot?.reason || "출생정보가 충분하지 않아 십성은 산출하지 않는다.",
          },
      tarotSnapshot,
      outputSchema: {
        sessionTitle: "string",
        questionSummary: "string",
        saju: "available/title/summary/keyPoints/caution/tenGodSnapshot preserve",
        tarot: "cardId/nameKo/nameEn/orientation/keywords/meaning/reading",
        synthesis: "title/summary/sajuTarotBridge",
        yeoniReading: "intro/main/advice/caution",
        actionPrescription: "string",
        luckyKeywords: "string[]",
      },
    },
    null,
    2,
  );
}
