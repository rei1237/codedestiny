import { SystemNotice } from "./components/SystemNotice";

const NOT_FOUND_I18N = {
  ko: {
    metadata: {
      title: "페이지를 찾을 수 없습니다 | Code Destiny",
      description: "요청한 페이지를 찾을 수 없습니다. Code Destiny의 공개 운세 가이드와 주요 서비스로 이동할 수 있습니다.",
    },
    eyebrow: "ERROR 404",
    title: "페이지를 찾을 수 없습니다",
    description: "주소가 바뀌었거나 아직 공개되지 않은 페이지일 수 있습니다. 아래 링크에서 가까운 운세 가이드와 인사이트를 확인해 주세요.",
    links: {
      insights: "운세 인사이트 허브",
      sajuGuide: "사주 명리학 기본 가이드",
      tarotGuide: "타로 리딩 입문",
      faq: "자주 묻는 질문",
    },
    home: "홈으로 돌아가기",
    freeSaju: "무료 사주 분석 보기",
  },
};

export const metadata = {
  ...NOT_FOUND_I18N.ko.metadata,
  robots: {
    index: false,
    follow: true,
  },
};

const quickLinks = [
  { href: "/insights/", key: "errors.notFound.links.insights", fallback: NOT_FOUND_I18N.ko.links.insights },
  { href: "/saju/guide/", key: "errors.notFound.links.sajuGuide", fallback: NOT_FOUND_I18N.ko.links.sajuGuide },
  { href: "/tarot/guide/", key: "errors.notFound.links.tarotGuide", fallback: NOT_FOUND_I18N.ko.links.tarotGuide },
  { href: "/faq/", key: "errors.notFound.links.faq", fallback: NOT_FOUND_I18N.ko.links.faq },
];

export default function NotFound() {
  return (
    <SystemNotice
      title={
        <span data-cd-trans data-key="errors.notFound.title">
          {NOT_FOUND_I18N.ko.title}
        </span>
      }
      eyebrow={
        <span data-cd-trans data-key="errors.notFound.eyebrow">
          {NOT_FOUND_I18N.ko.eyebrow}
        </span>
      }
      description={
        <span data-cd-trans data-key="errors.notFound.description">
          {NOT_FOUND_I18N.ko.description}
        </span>
      }
      actions={
        <>
          <a className="policy-btn policy-btn--primary" href="/saju/basic/">
            <span data-cd-trans data-key="errors.notFound.freeSaju">{NOT_FOUND_I18N.ko.freeSaju}</span>
          </a>
          <a className="policy-btn policy-btn--ghost" href="/">
            <span data-cd-trans data-key="errors.notFound.home">{NOT_FOUND_I18N.ko.home}</span>
          </a>
        </>
      }
      related={quickLinks.map((item) => (
        <a key={item.href} className="policy-doc__toc-link" href={item.href}>
          <span data-cd-trans data-key={item.key}>{item.fallback}</span>
        </a>
      ))}
      relatedLabel="관련 문서"
    />
  );
}
