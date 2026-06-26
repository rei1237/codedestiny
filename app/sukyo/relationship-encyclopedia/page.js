import { redirect } from "next/navigation";

const SUKYO_RELATIONSHIP_METADATA_COPY = {
  ko: {
    title: "숙요 인연 도감 | 내 운명에 들어오는 27가지 사람들 | Code Destiny",
    description:
      "나의 숙을 기준으로 27숙 전체 인연 지도를 펼쳐보세요. 안정형 인연, 강렬한 인연, 조심해야 할 인연, 성장형 인연, 비즈니스 인연까지 숙요점으로 살핍니다.",
    keywords: ["숙요점", "숙요 인연", "27숙", "숙요 궁합", "안괴", "영친", "업태", "우쇠", "성위", "명", "인연 도감", "연애 궁합", "결혼 궁합"],
  },
  en: {
    title: "Sukuyo Relationship Encyclopedia | 27 People Who Enter Your Destiny | Code Destiny",
    description:
      "Open the full 27-mansion relationship map from your Sukuyo mansion, including stable bonds, intense bonds, cautionary bonds, growth bonds, and business connections.",
    keywords: ["Sukuyo", "Sukuyo relationship", "27 mansions", "Sukuyo compatibility", "Ankai", "Eishin", "Gyotai", "Usui", "Seii", "Mei", "relationship encyclopedia", "love compatibility", "marriage compatibility"],
  },
  ja: {
    title: "宿曜縁図鑑 | 運命に入ってくる27種類の人々 | Code Destiny",
    description:
      "自分の宿を基準に、27宿全体の縁の地図を開きます。安定する縁、強烈な縁、注意すべき縁、成長の縁、ビジネスの縁まで宿曜で読みます。",
    keywords: ["宿曜", "宿曜の縁", "27宿", "宿曜相性", "安壊", "栄親", "業胎", "友衰", "成危", "命", "縁図鑑", "恋愛相性", "結婚相性"],
  },
  zh: {
    title: "宿曜缘分图鉴 | 进入你命运的27种人 | Code Destiny",
    description:
      "以你的本命宿为基准展开 27 宿完整缘分地图，观察稳定缘、强烈缘、需谨慎的缘、成长缘与商务缘。",
    keywords: ["宿曜", "宿曜缘分", "27宿", "宿曜合盘", "安坏", "荣亲", "业胎", "友衰", "成危", "命", "缘分图鉴", "恋爱合盘", "婚姻合盘"],
  },
};

const metadataCopy = SUKYO_RELATIONSHIP_METADATA_COPY.ko;

export const metadata = {
  title: metadataCopy.title,
  description: metadataCopy.description,
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  keywords: metadataCopy.keywords,
};

export default function SukyoRelationshipEncyclopediaPage() {
  redirect("/sukuyo");
}
