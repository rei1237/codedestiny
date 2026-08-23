import TarotSelfEsteemRouteClient from "./TarotSelfEsteemRouteClient";
import RouteMetadataLocaleSync from "../../components/RouteMetadataLocaleSync";

const TAROT_SELF_ESTEEM_METADATA_COPY = {
  ko: {
    title: "자기 기준 회복 타로 - 다시 내 편에 서는 5카드 리딩",
    description:
      "다섯 장의 카드로 타인의 시선에 흔들린 마음의 시작, 소모 지점, 오늘 지킬 기준을 차분히 살핍니다.",
  },
  en: {
    title: "Self-Esteem Level Up - 5-Card RPG Quest Tarot",
    description:
      "Check your self-esteem state and recovery strategy through a 5-card RPG quest spread. Completely free.",
  },
  ja: {
    title: "自己肯定感レベルアップ - 5カードRPGクエストタロット",
    description:
      "5カードRPGクエストスプレッドで自己肯定感の状態を確認し、回復戦略を受け取れます。完全無料サービスです。",
  },
  zh: {
    title: "自尊感升级 - 五张 RPG 任务塔罗",
    description:
      "通过五张 RPG 任务牌阵检查自尊状态并确认恢复策略。完全免费。",
  },
};

const metadataCopy = TAROT_SELF_ESTEEM_METADATA_COPY.ko;

export const metadata = {
  title: metadataCopy.title,
  description: metadataCopy.description,
  alternates: {
    canonical: "https://code-destiny.com/tarot/self-esteem",
  },
};

export default function TarotSelfEsteemLandingPage() {
  return (
    <>
      <RouteMetadataLocaleSync entries={TAROT_SELF_ESTEEM_METADATA_COPY} />
      {/* 리딩 화면은 클라이언트에서만 그려져 크롤러에게는 빈 페이지였다.
          아래 안내는 서버에서 렌더해 검색엔진이 이 리딩이 무엇인지 읽을 수 있게 한다.
          다섯 자리의 이름과 역할은 lib/tarot/spreads.mjs 의
          self_esteem_levelup_five_card 정의를 그대로 옮긴 것이다. */}
      <section className="sr-only" aria-label="자기 기준 회복 타로 안내">
        <h1>자기 기준 회복 타로 — 다시 내 편에 서는 5카드 리딩</h1>
        <p>
          남의 표정과 말투를 먼저 살피다 보면 내 기준이 뒤로 밀립니다. 이 리딩은 자존감을 점수로 매기지 않고,
          그 습관이 어디에서 시작됐고 지금 무엇을 소모시키며 오늘 무엇부터 지킬 수 있는지를 다섯 자리로 나눠 봅니다.
        </p>
        <h2>다섯 장이 각각 맡는 자리</h2>
        <ul>
          <li>내가 남의 눈치를 살피게 된 이유 — 타인의 표정·말투·분위기를 내 선택 기준으로 삼게 된 심리적 뿌리를 봅니다.</li>
          <li>왜 나는 거절을 어려워 할까 — 거절을 상실·비난·실망으로 느끼는 자동 사고와 약해진 경계를 짚습니다.</li>
          <li>눈치 보는 습관이 내게 주는 피해 — 과잉 분석, 자기검열, 분노 억압이 지금 만들고 있는 소모를 확인합니다.</li>
          <li>타인의 실망을 견뎌내는 방법 — 감정 분리, 설명 최소화, 기준 유지로 경계를 훈련하는 자리입니다.</li>
          <li>내 마음을 1순위로 챙기는 방법 — 감정을 먼저 확인하고 기준을 기록해 자기신뢰와 독립감을 세우는 자리입니다.</li>
        </ul>
        <h2>이런 순간에 특히 도움이 됩니다</h2>
        <ul>
          <li>거절하고 나면 하루 종일 그 장면이 반복 재생될 때</li>
          <li>상대의 짧은 답장 하나에 여러 겹의 의미를 붙이고 있을 때</li>
          <li>내가 원하는 것보다 상대가 실망하지 않을 선택을 먼저 고르고 있을 때</li>
          <li>화가 났다는 사실을 한참 지난 뒤에야 알아차릴 때</li>
        </ul>
        <h2>결과를 읽는 법</h2>
        <p>
          다섯 자리는 좋고 나쁨으로 갈리지 않습니다. 앞의 세 자리가 지금의 상태를 설명하고, 뒤의 두 자리가 훈련할 지점을 가리킵니다.
          한 번의 리딩으로 습관이 바뀌지는 않으므로, 마지막 두 자리에서 나온 기준을 한 문장으로 적어 두고 실제 상황에서 한 번만 지켜 보는 편을 권합니다.
        </p>
        <p>
          이 리딩은 심리 상담이나 진단을 대신하지 않습니다. 일상에서 반복되는 반응을 스스로 정리해 보는 자료로 쓰시고,
          생활이 어려울 만큼 힘들다면 전문가의 도움을 함께 찾아보시길 권합니다.
        </p>
        <h2>자주 묻는 질문</h2>
        <h3>자존감이 낮은 사람만 보는 리딩인가요?</h3>
        <p>
          아닙니다. 평소에는 단단하다가도 특정 관계나 상황에서만 기준이 흔들리는 경우가 훨씬 흔합니다.
          이 리딩은 사람을 낮음과 높음으로 나누지 않고, 어떤 자리에서 기준이 밀리는지를 봅니다.
        </p>
        <h3>결과가 마음에 들지 않으면 다시 뽑아도 되나요?</h3>
        <p>
          같은 질문으로 연달아 뽑으면 대개 같은 자리에 머무는 답이 반복됩니다. 카드가 바뀌기를 기다리기보다,
          네 번째와 다섯 번째 자리에서 나온 기준을 실제 상황에서 한 번 지켜 본 뒤에 다시 보시길 권합니다.
        </p>
        <h3>다섯 자리 중 하나만 봐도 되나요?</h3>
        <p>
          앞의 세 자리는 지금 상태를 설명하고 뒤의 두 자리는 훈련 지점을 가리키므로, 뒤만 보면 왜 그 기준이 필요한지가 빠집니다.
          시간이 없다면 첫 자리와 마지막 자리를 짝으로 읽는 편이 낫습니다.
        </p>
        <h3>무료인가요?</h3>
        <p>
          네. 다섯 장을 뽑고 각 자리의 해석을 확인하는 데까지 결제가 없습니다. 회원가입 없이도 시작할 수 있습니다.
        </p>
      </section>
      <TarotSelfEsteemRouteClient />
    </>
  );
}
