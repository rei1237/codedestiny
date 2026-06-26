import { redirect } from "next/navigation";

const HWATU_LIFE_PLAY_METADATA_COPY = {
  ko: {
    title: "화투 인생 패 테스트 — 7문항으로 내 인생 패 찾기",
    description:
      "7문항 선택으로 나를 상징하는 화투 인생 패(삼광·고도리·청단·똥광)를 무료로 찾아보세요.",
  },
  en: {
    title: "Hwatu Life Card Test - Find Your Life Card in 7 Questions",
    description:
      "Answer 7 questions to find the Hwatu life card that symbolizes you, from Samgwang and Godori to Cheongdan and Ddonggwang.",
  },
  ja: {
    title: "花札人生札テスト - 7問で自分の人生札を探す",
    description:
      "7つの質問に答えて、三光・五鳥・青短・糞光など、あなたを象徴する花札人生札を無料で見つけましょう。",
  },
  zh: {
    title: "花札人生牌测试 - 7题找出你的人生牌",
    description:
      "通过 7 个问题，免费找出象征你的花札人生牌，如三光、五鸟、青短与粪光。",
  },
};

const metadataCopy = HWATU_LIFE_PLAY_METADATA_COPY.ko;

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
};

export default function HwatuLifePlayPage() {
  redirect("/oracle/hwatu-life");
}
