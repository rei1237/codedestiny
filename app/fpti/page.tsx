import { redirect } from "next/navigation";

export const metadata = {
  title: "사주 FPTI 테스트로 이동",
  description:
    "FPTI 테스트는 /saju-fpti 로 옮겨졌습니다. 이 주소는 이동 안내만 합니다.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function FptiAliasPage() {
  redirect("/saju-fpti");
}
