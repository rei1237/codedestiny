import { redirect } from "next/navigation";

const IFA_ORACLE_METADATA_COPY = {
  ko: {
    title: "IFA 오라클 - 요루바 256 오두 신탁",
    description:
      "이파(IFA) 오라클은 요루바 256 오두 체계를 기반으로 질문의 방향을 해석하는 신탁 서비스입니다.",
  },
  en: {
    title: "IFA Oracle - Yoruba 256 Odu Divination",
    description:
      "The IFA Oracle reads the direction of your question through the Yoruba system of 256 Odu.",
  },
  ja: {
    title: "IFAオラクル - ヨルバ256オドゥ神託",
    description:
      "IFAオラクルは、ヨルバの256オドゥ体系をもとに、問いの向かう先を読み解く神託サービスです。",
  },
  zh: {
    title: "IFA 神谕 - 约鲁巴 256 奥杜占卜",
    description:
      "IFA 神谕基于约鲁巴 256 奥杜体系，解读问题所指向的方向。",
  },
};

const metadataCopy = IFA_ORACLE_METADATA_COPY.ko;

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

export default function IfaOraclePage() {
  redirect("/ifa-oracle.html?source=oracle-ifa");
}
