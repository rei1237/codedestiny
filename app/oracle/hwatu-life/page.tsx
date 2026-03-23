import HwatuLifeCardTest from "../../components/HwatuLifeCardTest";

export const metadata = {
  title: "화투 인생 패 테스트 | 타짜 컨셉 심리테스트",
  description:
    "돈·사랑·위기 앞에서의 선택으로 나를 상징하는 화투 인생 패를 찾는 7문항 심리테스트. 삼광·고도리·청단·똥광 등 결과를 확인하세요.",
  alternates: {
    canonical: "/oracle/hwatu-life",
  },
};

export default function HwatuLifePage() {
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: "화투 인생 패 테스트",
    description:
      "타짜 컨셉으로 돈, 사랑, 위기 상황 선택을 통해 인생 패 아키타입을 매칭하는 화투 심리테스트",
    educationalLevel: "general",
    inLanguage: "ko-KR",
    about: ["화투", "심리테스트", "운세", "라이프스타일"],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <HwatuLifeCardTest />
    </>
  );
}
