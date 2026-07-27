import type { ReactNode } from "react";

// AI 상담 라우트 8개는 서비스 설명·이용 상황·진행 순서·FAQ 전체를
// <section className="sr-only"> 안에 넣어 화면에는 보이지 않게 두고 있었다.
// 짧은 접근성 레이블이 아니라 페이지 본문 전체를 숨긴 형태라
// Google 의 Hidden text and links 정책에 걸릴 소지가 크다.
//
// 내용 자체는 실제로 유용하므로 지우지 않고 "숨김만" 없앤다.
// 마크업은 각 페이지에 그대로 두고(순수 h1/h2/p/ul/ol), 여기서 자손 선택자로만
// 스타일을 입혀 8개 페이지의 본문을 건드리지 않는다.
//
// 배치는 인터랙티브 앱 아래. 위에 두면 도구까지 스크롤이 길어진다.
export default function ServiceIntroSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="mx-auto w-full max-w-3xl px-4 pb-14 pt-6 text-slate-100 md:px-6"
    >
      <div
        className={[
          "rounded-3xl border border-white/10 bg-[#10172b] px-5 py-6 md:px-8 md:py-8",
          "[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h1]:text-amber-50 md:[&_h1]:text-3xl",
          "[&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-amber-100",
          "[&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-100",
          "[&_p]:mt-4 [&_p]:break-keep [&_p]:text-sm [&_p]:leading-8 [&_p]:text-slate-300 md:[&_p]:text-base",
          "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5",
          "[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5",
          "[&_li]:break-keep [&_li]:text-sm [&_li]:leading-7 [&_li]:text-slate-300 md:[&_li]:text-base",
          "[&_h3+p]:mt-2",
        ].join(" ")}
      >
        {children}
      </div>
    </section>
  );
}
