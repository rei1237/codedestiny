import type { Metadata } from "next";
import DestinyMeetingPlaceRouteClient from "./DestinyMeetingPlaceRouteClient";
import RouteMetadataLocaleSync from "../../components/RouteMetadataLocaleSync";

const DESTINY_MEETING_PLACE_METADATA_COPY = {
  ko: {
    title: "사주로 보는 인연의 장소 | Code Destiny",
    description:
      "생년월일 기반 사주 에너지로 인연이 열리는 장소, 도시, 타이밍, 스타일을 별빛 지도처럼 안내하는 프리미엄 감성 리포트",
  },
  en: {
    title: "Destiny Meeting Place by Saju | Code Destiny",
    description:
      "A premium emotional report that reads your birth-based saju energy and maps places, cities, timing, and style where meaningful connections may open.",
  },
  ja: {
    title: "四柱推命で見る縁の場所 | Code Destiny",
    description:
      "生年月日にもとづく四柱推命エネルギーから、縁が開く場所・都市・タイミング・スタイルを星明かりの地図のように案内するプレミアム感性リポートです。",
  },
  zh: {
    title: "用四柱看见缘分之地 | Code Destiny",
    description:
      "依据出生信息中的四柱能量，以星光地图般的方式指引缘分开启的地点、城市、时机与风格。",
  },
};

const metadataCopy = DESTINY_MEETING_PLACE_METADATA_COPY.ko;

export const metadata: Metadata = {
  title: metadataCopy.title,
  description: metadataCopy.description,
  alternates: {
    canonical: "https://code-destiny.com/saju/destiny-meeting-place",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function Page() {
  return (
    <>
      <RouteMetadataLocaleSync entries={DESTINY_MEETING_PLACE_METADATA_COPY} />
      <section className="sr-only" aria-label="사주로 보는 인연의 장소 안내">
        <h1>사주로 보는 인연의 장소</h1>
        <p>
          인연은 늘 같은 얼굴로 오지 않습니다. 어떤 사람에게는 물가와 가까운 길에서, 어떤 사람에게는 오래된 골목과 조용한 서점에서,
          또 어떤 사람에게는 낯선 도시의 저녁빛 속에서 마음이 열립니다. 사주로 보는 인연의 장소는 생년월일에 담긴 계절과 오행의 흐름을 따라,
          당신에게 관계의 문이 열리기 쉬운 공간과 분위기를 섬세하게 읽어냅니다.
        </p>
        <p>
          여기서 말하는 장소는 단순한 지명이 아니라, 당신의 기운이 편안하게 숨을 고르고 타인의 기운과 자연스럽게 맞물리는 환경입니다.
          나무의 기운이 살아나는 산책길, 불의 기운이 따뜻하게 번지는 공연장, 흙의 안정감이 머무는 카페, 금의 선명함이 드러나는 전시 공간,
          물의 흐름이 깊어지는 여행지처럼 인연의 결은 장소의 성격 안에서 분명해집니다.
        </p>
        <p>
          리포트는 만남이 열리기 쉬운 공간, 가까워지는 시간대, 상대와의 첫 대화가 부드러워지는 분위기, 피하면 좋은 과한 연출까지 함께 비춥니다.
          사랑을 억지로 끌어당기기보다 당신의 기운이 가장 자연스럽게 빛나는 자리를 찾아, 인연이 머물 여백을 만들어 주는 방식입니다.
        </p>
        <p>
          사주의 계절은 사람이 편안하게 머무는 공간의 결에도 스며듭니다.
          어떤 기운은 낮의 넓은 빛에서 더 솔직해지고, 어떤 기운은 밤의 조용한 온도 안에서 비로소 마음을 열며,
          어떤 기운은 익숙한 거리보다 조금 낯선 풍경 앞에서 오래 닫아 둔 감정을 풀어냅니다.
        </p>
        <p>
          사주의 기운이 강하게 살아나는 장소는 사람마다 다릅니다. 어떤 명식은 탁 트인 공간에서 표정이 부드러워지고, 어떤 명식은 조용한 실내에서 진심을 더 잘 나눕니다.
          익숙한 동네에서도 인연의 결이 열리는 골목이 있고, 낯선 여행지에서도 마음이 쉽게 닫히는 방향이 있습니다.
          이 상담은 그런 차이를 오행과 계절의 감각으로 읽어, 만남을 준비하는 사람에게 더 자연스러운 무대를 알려 줍니다.
        </p>
        <p>
          사랑은 장소 하나로 결정되지 않지만, 마음이 머물 수 있는 환경은 관계의 첫 호흡을 바꿉니다.
          어울리는 도시의 결, 약속을 잡기 좋은 시간, 피로가 덜 쌓이는 동선, 대화가 깊어지기 쉬운 분위기를 함께 바라보면 인연을 억지로 밀어붙이지 않아도 됩니다.
          당신의 기운이 편안하게 빛나는 자리에서, 만남은 더 조용하고 선명하게 열립니다.
        </p>
        <p>
          인연의 장소는 먼 여행지만을 뜻하지 않습니다. 자주 지나치던 길목, 마음이 느슨해지는 카페의 자리, 오래 머물고 싶은 서가,
          비가 온 뒤 공기가 맑아지는 산책로처럼 아주 가까운 곳에서도 당신의 기운과 맞는 장면은 열립니다.
          중요한 것은 그 공간이 당신을 과장하게 만들지 않고, 가장 자연스러운 표정으로 사람을 만나게 하는가입니다.
        </p>
        <p>
          이 상담은 만남을 서두르라는 신호보다, 마음을 열어도 덜 다치는 방향을 먼저 가리킵니다.
          인연이 다가오는 장소에는 늘 사람의 기운과 공간의 기운이 함께 머물며, 그 둘이 부드럽게 맞물릴 때 대화는 훨씬 오래 남습니다.
        </p>
      </section>
      <DestinyMeetingPlaceRouteClient />
    </>
  );
}
