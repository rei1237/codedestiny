import DestinyBiasRouteClient from "./DestinyBiasRouteClient";
import MyDestinyBiasShell from "./components/MyDestinyBiasShell";
import ImmersiveRelatedLinks from "../../components/ImmersiveRelatedLinks";
import ServiceIntroSection from "../../components/ServiceIntroSection";

const DESTINY_BIAS_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "최애운명 - 내 최애와 나의 K-POP 케미 포토카드 | Code Destiny",
    description: "그룹과 멤버를 고르고 생일을 넣으면 최애와 나의 케미 총점, 등급, 9가지 케미 유형이 포토카드로 나옵니다. 로그인 없이 무료, 생일은 공유 카드에 들어가지 않습니다.",
    ogTitle: "내 최애랑 나, 무슨 케미일까? - 최애운명",
    ogDescription: "생일만 넣으면 최애와 나의 케미가 포토카드로 나와요. 무료 · 로그인 없이.",
    ogAlt: "응원봉 불빛이 가득한 콘서트 무대 — 최애운명",
  },
  en: {
    title: "My Destiny Bias - Saju-Based Fandom Destiny Analysis | Code Destiny",
    description: "Pick a K-pop group and member, enter your birthday, and get a chemistry photocard with a total score, grade, and one of nine chemistry types. Free, no login.",
    ogTitle: "My Destiny Bias - Saju-Based Fandom Destiny Analysis",
    ogDescription: "Enter your birthday and get a chemistry photocard with your bias. Free, no login.",
    ogAlt: "My Destiny Bias OG card",
  },
  ja: {
    title: "推し運命 - 四柱推命ベースの推し活運命分析 | Code Destiny",
    description: "あなたの四柱推命と推しの四柱推命を比べ、共鳴スコア、五行補完ポイント、今日の推し運命アクションをカードで確認します。",
    ogTitle: "推し運命 - 四柱推命ベースの推し活運命分析",
    ogDescription: "誕生日を入れるだけで、推しとのケミがフォトカードになります。無料・ログイン不要。",
    ogAlt: "推し運命OGカード",
  },
} as const;

const destinyBiasPageCopy = DESTINY_BIAS_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata = {
  title: destinyBiasPageCopy.title,
  description: destinyBiasPageCopy.description,
  alternates: {
    canonical: "https://code-destiny.com/saju/destiny-bias",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/saju/destiny-bias",
    title: destinyBiasPageCopy.ogTitle,
    description: destinyBiasPageCopy.ogDescription,
    images: [
      {
        url: "https://code-destiny.com/images/destiny-bias/og-default-1200x630.png",
        width: 1200,
        height: 630,
        alt: destinyBiasPageCopy.ogAlt,
      },
    ],
  },
};

export default function DestinyBiasPage() {
  return (
    <MyDestinyBiasShell>
      <DestinyBiasRouteClient />
      {/* 분석 화면은 클라이언트에서만 그려져 크롤러에게는 사실상 빈 페이지였다. 아래 안내는
          서버에서 렌더해 이 분석이 무엇을 계산하는지 읽을 수 있게 한다. 세부 점수 6종의 이름과 비중은
          engine/favoriteDestinyReading.ts 의 scores.total 식, 등급 구간은 engine/destinyBiasMeta.ts 의
          getDestinyGrade, 9유형 이름은 lib/idol-chemi/engine/chemiTypes.js 를 그대로 옮긴 것이다 — 그쪽을
          바꾸면 여기도 같이 고친다.
          🔴 이 섹션에 H1 을 두지 말 것 — 페이지의 H1 은 클라이언트가 이미 소유하고 있다.
          2026-08-30: sr-only 였던 본문을 ServiceIntroSection 으로 가시화했다(성장 계획 1-D) — 본문 전체를
          숨긴 형태는 Google 의 Hidden text 정책 소지가 있고 AdSense 검수자에게도 보이지 않는다. 배치는 앱 아래. */}
      <ServiceIntroSection label="최애운명 분석 안내">
        <h2>최애운명 — 내 최애와 나의 케미를 포토카드 한 장으로</h2>
        <p>
          최애운명은 K-POP 팬을 위한 케미 놀이입니다. 그룹을 고르고 멤버를 고른 다음 내 생일만 넣으면,
          두 사람의 생년월일에서 뽑은 기운을 겹쳐 본 결과가 포토카드로 나옵니다. 카드 앞면에는 총점과 등급,
          케미 유형이 찍히고, 뒷면에는 세부 점수 여섯 가지가 게이지로 들어갑니다. 로그인 없이 볼 수 있고
          비용도 들지 않습니다. 결과를 만드는 데 생성형 AI 를 쓰지 않으며, 같은 값을 넣으면 언제 눌러도
          같은 카드가 나옵니다.
        </p>
        <h3>보는 순서</h3>
        <ol>
          <li>그룹을 고릅니다. 방탄소년단, 세븐틴, 스트레이 키즈, 에스파, 아이브, 뉴진스 등 열두 그룹이 먼저 보입니다.</li>
          <li>멤버를 고릅니다. 활동명이나 그룹명으로 검색해서 찾을 수도 있습니다.</li>
          <li>내 생일과 양력·음력을 넣습니다. 닉네임은 선택이고, 태어난 시간과 성별은 묻지 않습니다.</li>
          <li>포토카드가 나오면 눌러서 뒤집고, 아래 「포카 꾸미기」에서 테마와 무드를 바꿔 봅니다.</li>
        </ol>
        <h3>총점과 세부 점수 여섯 가지</h3>
        <p>
          총점은 여섯 가지 세부 점수를 서로 다른 비중으로 섞은 값이며 40에서 99 사이로 나옵니다. 세부
          점수는 두 사람의 일주와 연주가 맺는 관계, 오행이 서로를 채워 주는 정도, 고른 무드를 바탕으로
          정해집니다.
        </p>
        <ul>
          <li>감정 교감 — 같은 장면에서 마음이 움직이는 정도입니다. 총점의 20퍼센트를 차지합니다.</li>
          <li>안정감 — 오래 봐도 편안한 정도입니다. 총점의 20퍼센트를 차지합니다.</li>
          <li>설렘 지수 — 처음 봤을 때 끌리는 세기입니다. 총점의 16퍼센트를 차지합니다.</li>
          <li>덕심 화력 — 좋아하는 마음이 행동으로 번지는 정도입니다. 총점의 16퍼센트를 차지합니다.</li>
          <li>장기 서사 — 이 마음이 길게 이어질 조건입니다. 총점의 16퍼센트를 차지합니다.</li>
          <li>티키타카 — 주고받는 호흡이 맞는 정도입니다. 총점의 12퍼센트를 차지합니다.</li>
        </ul>
        <p>
          등급은 총점 구간으로 정해집니다. 90점 이상은 LEGENDARY, 78점 이상은 SPECIAL, 66점 이상은 RARE,
          54점 이상은 MOOD MATCH, 그 아래는 DISTANT SIGNAL 입니다. 낮은 등급이 나쁜 궁합이라는 뜻은
          아닙니다. 멀리서 오래 지켜보는 덕질에 더 가까운 조합이라는 뜻으로 읽으면 됩니다.
        </p>
        <h3>케미 유형 아홉 가지</h3>
        <p>
          유형은 점수와 따로 정해집니다. 두 사람의 연주·월주·일주를 나란히 놓고, 일간과 일지가 맺는 관계
          가운데 가장 뚜렷한 신호 하나로 고릅니다.
        </p>
        <ul>
          <li>텔레파시 — 말 안 해도 통하는 웃음 버튼</li>
          <li>같은 파장 — 취향 같아서 밤샘 각</li>
          <li>액셀·브레이크 — 한 명은 직진, 한 명은 브레이크</li>
          <li>합 맞는 팀플 — 눈빛만 봐도 합 맞는 팀플</li>
          <li>조용한 챙김 — 조용히 챙겨주는 든든함</li>
          <li>텐션 충전 — 응원 텐션 자동 충전</li>
          <li>티키타카 — 티격태격인데 또 보고 싶은</li>
          <li>다른 결 — 다른 결이라 서로 배우는</li>
          <li>슬로우 번 — 천천히 스며드는 잔잔함</li>
        </ul>
        <p>
          왜 그 유형이 나왔는지는 결과 화면의 「근거 펼쳐보기」에서 볼 수 있습니다. 어떤 글자끼리 어떤
          관계였는지를 표로 보여 줍니다.
        </p>
        <h3>태어난 시간은 쓰지 않습니다</h3>
        <p>
          아이돌의 출생 시간은 대부분 공개되어 있지 않습니다. 한쪽만 시주를 넣으면 비교가 한쪽으로 기울기
          때문에 최애운명은 양쪽 모두 시주를 빼고 연주·월주·일주만 씁니다. 그래서 일반 사주 풀이보다 재료가
          적고, 결과는 가볍게 즐기는 용도에 맞습니다.
        </p>
        <h3>공유할 때 들어가는 것과 빠지는 것</h3>
        <p>
          공유 카드는 1대1 피드용과 9대16 스토리용 두 가지로 저장할 수 있습니다. 카드와 공유 링크에는
          생일이 들어가지 않습니다. 「포카 꾸미기」에서 넣은 사진은 내 기기 안에서만 쓰이고 서버로 보내지
          않으며, 「이미지 저장」으로 받은 파일에만 찍힙니다. 공유 링크를 받은 사람은 케미 유형과 한 줄
          요약만 보고, 자기 최애로 바로 해 볼 수 있습니다.
        </p>
        <h3>자주 묻는 질문</h3>
        <h4>내 최애가 목록에 없으면 어떻게 하나요?</h4>
        <p>
          먼저 보이는 열두 그룹 말고도 검색으로 찾을 수 있는 이름이 더 있으니, 활동명이나 그룹명으로 검색해
          보세요. 검색에도 나오지 않는 최애는 아직 준비 중이며, 공개된 생일이 확인된 인물부터 차례로 더합니다.
        </p>
        <h4>같은 최애인데 결과가 달라질 수 있나요?</h4>
        <p>
          생일과 최애가 같으면 케미 유형은 바뀌지 않습니다. 「포카 꾸미기」에서 무드를 바꾸면 세부 점수와
          문구가 함께 달라지고, 테마와 사진은 카드의 모양만 바꿉니다.
        </p>
        <h4>청소년도 볼 수 있나요?</h4>
        <p>
          만 14세 이상이면 볼 수 있습니다. 나와 최애 가운데 한쪽이라도 만 19세 미만이면 결과 문구가 우정과
          팀워크 표현으로만 나옵니다.
        </p>
        <p>
          최애운명은 팬덤 문화를 위한 오락 콘텐츠입니다. 실재하는 인물의 성격이나 사생활, 실제 관계를
          규정하지 않습니다. 화면의 인물 그림은 특정인을 그린 것이 아닌 가상의 실루엣입니다.
        </p>
      </ServiceIntroSection>
      <ImmersiveRelatedLinks fromPath="/saju/destiny-bias" />
    </MyDestinyBiasShell>
  );
}
