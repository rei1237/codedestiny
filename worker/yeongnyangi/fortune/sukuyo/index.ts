import { calculateSukuyoForMoment } from "../../../lib/sukuyo-astronomy.js";
import { relationFromForwardDistance } from "../../../lib/sukuyo-relation-core.js";
import { distanceLabelByRule } from '../../../lib/sukuyo-premium.js';
import { context, domain } from "../shared/domain";
import { chartInput } from "../shared/time";
import { FortuneError } from "../shared/contracts";
export const sukuyo = domain(
  "sukuyo",
  `숙요 천문식 27숙 체계만 사용한다. 베다 나크샤트라 해석이나 서양 별자리 성격을 섞지 않는다.
두 사람의 본명숙, 정방향/역방향 거리, 관계 유형, 각 역할의 비대칭을 근거로 설명한다.
안괴·영친·성위·우쇠·명업을 선악/운명적 성공으로 등급화하지 않는다. 처음의 끌림과 깊어진 뒤 갈등이 공존할 수 있다.
상대의 실제 속마음을 안다고 말하지 않는다. 장기 관계는 대화·경계·생활 선택에 따라 달라짐을 설명한다.`,
  [
    "처음의 끌림",
    "가까워진 뒤의 변화",
    "두 사람의 감정 패턴",
    "갈등이 생기는 지점",
    "오래 함께하려면",
    "영냥이의 관계 조언",
  ],
  async (input, engineEnv = {}) => {
    if (!input.personB && input.readingMode !== 'personal') throw new FortuneError("PARTNER_REQUIRED");
    const calculate = async (p: NonNullable<typeof input.personA>) => {
      const t = chartInput(p);
      return calculateSukuyoForMoment(
        engineEnv,
        {
          ...t,
          calendarType: "solar",
          timezoneOffsetHours: t.timezone,
          latitude: t.lat,
          longitude: t.lon,
        },
        { strictSwiss: true },
      );
    };
    const a = await calculate(input.personA!);
    if (input.readingMode === 'personal') return context('sukuyo',{personA:a},['천문식 27숙 개인 분석입니다. 상대 정보 없이 궁합을 추정하지 않습니다.']);
    const
      b = await calculate(input.personB!);
    const forward = (b.index - a.index + 27) % 27;
    const relation=relationFromForwardDistance(forward);
    if(!relation)throw new FortuneError('INVALID_SUKUYO_RELATION',503);
    return context(
      "sukuyo",
      {
        personA: a,
        personB: b,
        forwardDistance: forward,
        reverseDistance: (27 - forward) % 27,
        distanceLabel: distanceLabelByRule(Math.min(forward,(27-forward)%27),relation.relationType),
        relation,
      },
      ["천문식 27숙 계산이며 음력 고정표 방식과 구분합니다."],
    );
  },
);
