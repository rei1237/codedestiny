import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { CompassApp } from "./_components/CompassApp";

// 기본 레이아웃의 canonical 은 "/" 라, 직접 지정하지 않으면 홈으로 canonical 이 넘어간다.
// buildSeoMetadata 가 self-canonical 과 index/follow 를 함께 세운다.
export const metadata = buildSeoMetadata({
  path: "/destiny-compass",
  title: "운명의 나침반 · 사주·자미두수로 읽는 오늘의 방향",
  description:
    "사주 명식과 자미두수 명반을 함께 세워 지금 나아갈 방향과 오늘 실행할 한 걸음을 정리합니다. 계산 기준과 해석의 한계까지 함께 안내합니다.",
  keywords: ["운명의 나침반", "사주 자미두수 종합", "오늘의 방향", "사주 상담"],
});

export default function DestinyCompassPage() {
  return (
    <>
      <CompassApp />
      {/*
        CompassApp 은 클라이언트 컴포넌트라 서버 렌더 결과가 163자뿐이었고,
        그 상태로 색인 대상에 두면 AdSense inventory value(저가치 화면) 조항에 걸린다.
        인터랙티브 화면 아래에 서버 렌더 해설을 두어 무엇을 계산하고 어디까지
        참고하면 되는지 밝힌다. 숨김 처리(sr-only)하지 않고 실제로 보이게 둔다.
      */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-10 pt-2 text-slate-100/45 opacity-35 transition-opacity duration-200 hover:opacity-70 focus-within:opacity-80 md:px-6">
        <div className="rounded-2xl border border-white/[0.04] bg-[#080d1a]/25 px-5 py-5 md:px-8 md:py-6">
          <h2 className="text-xl font-semibold text-amber-100 md:text-2xl">운명의 나침반은 무엇을 보는가</h2>
          <p className="mt-4 break-keep text-sm leading-8 text-slate-300 md:text-base">
            운명의 나침반은 사주 명식과 자미두수 명반을 함께 세워, 지금 어느 쪽으로 한 걸음
            내딛는 것이 자연스러운지를 정리해 보여 주는 화면입니다. 두 체계는 서로 다른 것을
            봅니다. 사주는 태어난 연·월·일·시를 네 기둥으로 세워 타고난 기질과 시기의 흐름을
            읽고, 자미두수는 열두 궁에 별을 배치해 관계·일·재물처럼 삶의 영역별 무게를
            살핍니다. 한 체계만 보면 놓치기 쉬운 부분을 다른 체계가 메우도록 겹쳐 읽는 것이
            이 화면의 방식입니다.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-amber-100 md:text-2xl">입력하는 것과 나오는 것</h2>
          <p className="mt-4 break-keep text-sm leading-8 text-slate-300 md:text-base">
            필요한 정보는 생년월일과 태어난 시각, 성별, 양력·음력 구분입니다. 이미 프로필
            카드를 만들어 두셨다면 저장된 생년 정보가 자동으로 채워지고, 없으면 직접 입력하는
            방식으로 넘어갑니다. 태어난 시각을 모르는 경우에도 진행할 수 있지만, 시주와
            자미두수의 명궁이 시각으로 정해지는 만큼 그만큼 해석의 폭이 넓어진다는 점은
            감안하고 보시는 편이 좋습니다. 결과 화면에서는 지금의 흐름을 한 문장으로 요약한
            방향, 그 방향을 뒷받침하는 명식·명반의 근거, 그리고 오늘 실행해 볼 만한 작은
            한 걸음이 함께 제시됩니다.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-amber-100 md:text-2xl">방향은 어떻게 계산되는가</h2>
          <p className="mt-4 break-keep text-sm leading-8 text-slate-300 md:text-base">
            먼저 입력한 생년월일시를 명식으로 옮깁니다. 음력으로 입력하면 만세력 규칙에 따라
            양력으로 환산하고, 연주와 월주는 생일이 아니라 절기를 경계로 바뀝니다. 입춘 전에
            태어났다면 해가 바뀌었어도 앞 해의 간지를 쓰는 식입니다. 시주는 태어난 지역의
            진태양시를 반영해 세우고, 일주는 한국 표준시의 민용일을 기준으로 둡니다. 이 두
            기준을 섞으면 자정 부근에 태어난 경우 하루가 밀리는 문제가 생기기 때문입니다.
          </p>
          <p className="mt-4 break-keep text-sm leading-8 text-slate-300 md:text-base">
            이렇게 세운 명식에서 일간을 중심으로 오행의 균형과 십성의 배치를 봅니다. 어떤 기운이
            넘치고 어떤 기운이 비어 있는지, 그 공백을 무엇으로 메우는 흐름인지가 방향의 첫 번째
            축입니다. 두 번째 축은 자미두수 명반입니다. 같은 생년월일시로 열두 궁에 별을 배치한
            뒤, 지금 질문과 맞닿은 궁이 어느 쪽인지를 봅니다. 두 축이 같은 곳을 가리키면 그
            방향을 분명하게 제시하고, 서로 다른 곳을 가리키면 그 차이를 숨기지 않고 함께
            보여 줍니다. 어긋남 자체가 지금의 상태를 설명하는 정보이기 때문입니다.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-amber-100 md:text-2xl">두 화자로 읽는 이유</h2>
          <p className="mt-4 break-keep text-sm leading-8 text-slate-300 md:text-base">
            같은 명식이라도 어떻게 말해 주느냐에 따라 받아들이는 결이 달라집니다. 그래서 해설을
            두 목소리로 나눠 두었습니다. 연이는 지금의 마음을 먼저 받아 주는 쪽으로, 네오는
            에두르지 않고 짚어야 할 것을 짚는 쪽으로 말합니다. 어느 한쪽이 정답이라기보다,
            위로가 필요한 날과 정리가 필요한 날이 다르기 때문에 둘을 함께 두었습니다.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-amber-100 md:text-2xl">읽을 때 주의할 점</h2>
          <p className="mt-4 break-keep text-sm leading-8 text-slate-300 md:text-base">
            여기서 제시하는 방향은 확정된 미래가 아니라, 전통 해석 규칙을 따라 정리한 참고
            자료입니다. 명리와 자미두수는 오랜 시간 축적된 상징 체계이지만 과학적으로 검증된
            예측 도구는 아니며, 같은 명식을 두고도 유파에 따라 다르게 읽힙니다. 건강이나
            재무, 법률처럼 되돌리기 어려운 판단이 걸린 문제라면 해당 분야의 전문가와
            상의하시기 바랍니다. 이 화면은 선택을 대신하는 곳이 아니라, 선택하기 전에 생각을
            한 번 정리해 보는 자리에 가깝습니다.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-amber-100 md:text-2xl">자주 묻는 질문</h2>
          <dl className="mt-4 space-y-4">
            <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3">
              <dt className="text-sm font-semibold text-slate-100">태어난 시각을 모르는데 써도 되나요?</dt>
              <dd className="mt-2 break-keep text-sm leading-7 text-slate-300">
                쓸 수 있습니다. 다만 시주와 자미두수의 명궁이 태어난 시각으로 정해지기 때문에, 시각을
                모르면 그 두 축은 폭이 넓은 상태로 읽힙니다. 연·월·일에서 나오는 부분은 그대로 유효하니,
                시각이 불확실하다는 전제를 두고 확정적인 문장보다 흐름 쪽에 무게를 두어 보시길 권합니다.
              </dd>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3">
              <dt className="text-sm font-semibold text-slate-100">사주와 자미두수 결과가 서로 다르게 나오면 어느 쪽을 믿나요?</dt>
              <dd className="mt-2 break-keep text-sm leading-7 text-slate-300">
                어느 한쪽을 고르기보다 왜 갈렸는지를 보는 편이 낫습니다. 두 체계는 기준이 다릅니다.
                사주는 기운의 균형을, 자미두수는 영역별 배치를 봅니다. 엇갈린다는 것은 대개 타고난
                성향과 지금 놓인 자리가 서로 당기고 있다는 신호로 읽히므로, 그 간극 자체가 정보가 됩니다.
              </dd>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3">
              <dt className="text-sm font-semibold text-slate-100">매일 다시 봐도 되나요?</dt>
              <dd className="mt-2 break-keep text-sm leading-7 text-slate-300">
                명식과 명반 자체는 태어난 순간에 정해지므로 매일 바뀌지 않습니다. 날짜에 따라 달라지는
                것은 그 위를 지나는 시기의 흐름 쪽입니다. 그래서 매일 새로 보기보다, 방향을 한 번 정하고
                한동안 지켜본 뒤 다시 확인하는 편이 변화를 알아차리기에 좋습니다.
              </dd>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3">
              <dt className="text-sm font-semibold text-slate-100">결과를 중요한 결정의 근거로 삼아도 되나요?</dt>
              <dd className="mt-2 break-keep text-sm leading-7 text-slate-300">
                권하지 않습니다. 여기서 나오는 문장은 전통 상징 체계를 따라 정리한 해석이지 사실 판정이
                아닙니다. 이직이나 투자, 치료처럼 되돌리기 어려운 결정이라면 실제 조건을 함께 따져 보고
                해당 분야의 전문가와 상의하신 뒤에 정하시기 바랍니다.
              </dd>
            </div>
          </dl>

          <nav aria-label="관련 가이드" className="mt-8 flex flex-wrap gap-2">
            {[
              { href: "/saju/guide/", label: "사주 명리학 기본 가이드" },
              { href: "/ziwei/guide/", label: "자미두수 명반 읽는 법" },
              { href: "/insights/saju/", label: "사주 인사이트 모아보기" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:border-amber-200/40 hover:bg-white/10 hover:text-amber-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </>
  );
}
