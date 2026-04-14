import MingriTarot from "../../../components/MingriTarot";

export const metadata = {
  title: "명리학 타로 실행 | Code Destiny",
  description: "명리학 타로 로컬 실행 페이지. API 호출 없이 브라우저에서 카드 뽑기와 해석을 진행합니다.",
};

export default function MingriTarotPlayPage() {
  return (
    <MingriTarot
      heading="명리학 타로"
      subtitle="로컬 전용 실행 모드입니다. API 호출 없이 브라우저에서 바로 리딩합니다."
    />
  );
}
