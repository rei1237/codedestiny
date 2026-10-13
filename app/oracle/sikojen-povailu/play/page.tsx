import { redirect } from "next/navigation";
import { generatePageMetadata } from "../../../../lib/generate-page-metadata";

const SIKOJEN_POVAILU_PLAY_METADATA_COPY = {
  ko: {
    title: "핀란드 주석점 Sikojen Povailu — 납점 오라클 | 꿀꿀 운세",
    description:
      "핀란드 전통 주석점(납점) 의식을 무료로 체험하세요. 납이 물에서 굳는 형태로 미래를 읽는 5단계 인터랙티브 오라클 — Shadow Reading까지 완전 무료.",
    keywords: ["핀란드 주석점", "Sikojen Povailu", "납점", "핀란드 신탁", "오라클", "tin casting oracle"],
    featureList: ["5단계 인터랙티브 의식", "납 형태 상징 해석", "그림자 의미(Shadow Reading) 제공"],
  },
  en: {
    title: "Finnish Tin Casting Sikojen Povailu - Oracle Ritual | Honey Pig Manseryuk",
    description:
      "Experience a free five-step Finnish tin casting oracle ritual, reading the shapes formed as metal cools in water through a complete Shadow Reading.",
    keywords: ["Finnish tin casting", "Sikojen Povailu", "tin oracle", "Finnish divination", "oracle", "tin casting oracle"],
    featureList: ["Five-step interactive ritual", "Tin-shape symbol reading", "Shadow Reading meanings"],
  },
  ja: {
    title: "フィンランド錫占い Sikojen Povailu - 錫占オラクル | 꿀꿀 운세",
    description:
      "フィンランド伝統の錫占い儀式を無料で体験できます。水中で固まる形から未来を読む5段階のインタラクティブオラクルで、Shadow Readingまで無料です。",
    keywords: ["フィンランド錫占い", "Sikojen Povailu", "錫占い", "フィンランド神託", "オラクル", "tin casting oracle"],
    featureList: ["5段階インタラクティブ儀式", "錫の形の象徴解釈", "Shadow Readingの意味"],
  },
  zh: {
    title: "芬兰锡占 Sikojen Povailu - 锡占神谕 | 꿀꿀 운세",
    description:
      "免费体验芬兰传统锡占仪式。通过金属在水中凝固的形态读取未来，包含完整 Shadow Reading 的五阶段互动神谕。",
    keywords: ["芬兰锡占", "Sikojen Povailu", "锡占", "芬兰神谕", "神谕", "tin casting oracle"],
    featureList: ["五阶段互动仪式", "锡形象征解读", "Shadow Reading 含义"],
  },
} as const;

const META = {
  path: "/oracle/sikojen-povailu/play",
  ...SIKOJEN_POVAILU_PLAY_METADATA_COPY.ko,
  image: "https://code-destiny.com/fortune/sikojen-povailu/images/piggyfortune.webp",
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return {
    ...generatePageMetadata(META),
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default function SikojenpovailuPlayPage() {
  redirect("/oracle/sikojen-povailu");
}
