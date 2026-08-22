import MayaRouteClient from "./MayaRouteClient";
import { buildFortuneJsonLd, generatePageMetadata } from "@/lib/generate-page-metadata";
import RouteMetadataLocaleSync from "../components/RouteMetadataLocaleSync";

const MAYA_PAGE_METADATA_COPY = {
  ko: {
    title: "마야 달력 - 마야점 프롬프트 생성기",
    description:
      "선택한 날짜의 Long Count, Tzolk'in, Haab 값을 월간 달력으로 확인하고 마야점 상담 프롬프트를 생성합니다.",
    keywords: ["마야 달력", "마야점", "Long Count", "Tzolk'in", "Haab", "마야점 프롬프트"],
    featureList: ["월간 마야 달력", "선택 날짜 상세 코드", "마야점 상담 프롬프트 생성"],
  },
  en: {
    title: "Maya Calendar - Maya Oracle Prompt Generator",
    description:
      "View Long Count, Tzolk'in, and Haab values for selected dates in a monthly calendar and generate a Maya oracle consultation prompt.",
    keywords: ["Maya calendar", "Maya oracle", "Long Count", "Tzolk'in", "Haab", "Maya oracle prompt"],
    featureList: ["Monthly Maya calendar", "Selected-date detail codes", "Maya oracle consultation prompt"],
  },
  ja: {
    title: "マヤ暦 - マヤ占いプロンプト生成",
    description:
      "選択した日付のLong Count、Tzolk'in、Haabを月間カレンダーで確認し、マヤ占い相談プロンプトを生成します。",
    keywords: ["マヤ暦", "マヤ占い", "Long Count", "Tzolk'in", "Haab", "マヤ占いプロンプト"],
    featureList: ["月間マヤ暦", "選択日付の詳細コード", "マヤ占い相談プロンプト生成"],
  },
  zh: {
    title: "玛雅历 - 玛雅占卜提示生成器",
    description:
      "在月历中查看所选日期的 Long Count、Tzolk'in 与 Haab 值，并生成玛雅占卜咨询提示。",
    keywords: ["玛雅历", "玛雅占卜", "Long Count", "Tzolk'in", "Haab", "玛雅占卜提示"],
    featureList: ["月度玛雅历", "所选日期详细代码", "玛雅占卜咨询提示生成"],
  },
} as const;

const META = {
  path: "/maya",
  ...MAYA_PAGE_METADATA_COPY.ko,
  image: "https://assets.code-destiny.com/%EB%A7%88%EC%95%BC%EC%A0%90.webp",
  applicationCategory: "LifestyleApplication",
} as const;

const JSON_LD = buildFortuneJsonLd(META);

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function MayaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <RouteMetadataLocaleSync entries={MAYA_PAGE_METADATA_COPY} />
      <main className="min-h-screen bg-[#071611] px-5 py-10 text-[#f8edd0]">
        <MayaRouteClient />
        <section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-[#d8b56d]/30 bg-[#10251d]/80 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d8b56d]">Maya Calendar</p>
          <h2 className="mt-3 text-3xl font-black text-[#fff4cf]">마야 달력과 오늘의 시간 문양</h2>
          <p className="mt-4 text-sm leading-7 text-[#f3dfad]">
            선택한 날짜의 Long Count, Tzolk&apos;in, Haab 흐름을 한 달의 리듬 안에서 살펴봅니다. 마야의 시간은
            단순한 숫자보다 반복되는 주기와 상징의 결을 통해 하루의 분위기를 비춥니다. 같은 날짜라도 달의 위치,
            계절의 감각, 사용자가 머무는 마음의 상태에 따라 다르게 다가올 수 있습니다.
          </p>
          <p className="mt-3 text-sm leading-7 text-[#f3dfad]">
            날짜를 고를 때는 정답을 찾으려 애쓰기보다 그날이 어떤 문양으로 기억되는지 천천히 바라보세요. Tzolk&apos;in은
            내면의 움직임과 직관의 방향을, Haab은 계절과 일상의 배경을, Long Count는 긴 시간의 좌표를 조용히
            드러냅니다. 세 흐름을 함께 읽으면 오늘 해야 할 일보다 오늘 어떤 태도로 움직이면 좋을지가 더 부드럽게
            떠오릅니다.
          </p>
          <p className="mt-3 text-sm leading-7 text-[#f3dfad]">
            이 달력은 중요한 결정을 대신 내려 주기보다, 날짜와 상징을 통해 마음을 정돈하는 도구로 곁에 두기 좋습니다.
            새 일을 시작하려는 날, 지나간 관계를 돌아보는 날, 몸과 마음의 리듬을 다시 맞추고 싶은 날에 날짜를 펼쳐
            보세요. 문양은 확정된 예언이 아니라 지금의 감각을 더 세심하게 듣게 하는 작은 표식입니다.
          </p>
          <p className="mt-3 text-sm leading-7 text-[#f3dfad]">
            프롬프트 생성은 선택한 날짜의 코드와 상징을 바탕으로 상담 문장을 정리하는 흐름입니다. 이용 권한이 필요한
            영역은 기존 정책에 따라 확인되며, 권한이 열린 뒤에만 더 깊은 문장을 받을 수 있습니다. 이 순서는 사용자의
            선택과 결제를 보호하기 위해 유지됩니다.
          </p>
          <p className="mt-3 text-sm leading-7 text-[#f3dfad]">
            결과를 읽을 때는 좋은 날과 나쁜 날을 가르는 방식보다, 오늘의 에너지가 어디로 모이고 어디에서 쉬어야 하는지
            살피는 편이 좋습니다. 강한 문양은 무리하라는 신호가 아니라 집중할 곳을 알려 주고, 조용한 문양은 멈추라는
            뜻이 아니라 안쪽의 리듬을 세밀하게 다듬으라는 초대일 수 있습니다.
          </p>
          <p className="mt-3 text-sm leading-7 text-[#f3dfad]">
            건강, 법률, 재정, 관계의 중대한 결정은 이곳의 상징만으로 단정하지 마세요. 현실의 정보와 전문가의 조언,
            주변 사람과의 대화가 함께 있을 때 선택은 더 안전해집니다. 마야 달력은 그 선택 앞에서 마음을 가라앉히고
            오늘의 첫 걸음을 조금 더 선명하게 보도록 돕습니다.
          </p>
        </section>
      </main>
    </>
  );
}
