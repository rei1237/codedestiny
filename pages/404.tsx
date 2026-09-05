import Head from "next/head";
import React from "react";

// 유명인 사주 상세는 전량 noindex 로 바뀌었으므로, 색인·광고 대상인 허브와
// 기능 가이드로 보낸다. app/not-found.js 와 같은 세트를 유지한다.
const quickLinks = [
  { href: "/insights/", label: "운세 인사이트" },
  { href: "/saju/guide/", label: "사주 입문 가이드" },
  { href: "/tarot/guide/", label: "타로 가이드" },
  { href: "/faq/", label: "자주 묻는 질문" },
];

/*
 * 🔴 이 파일만 인라인 스타일을 유지한다 — `pages/_app.tsx` 가 CSS 를 하나도 import 하지 않아
 *    `styles/globals.css` 가 pages 라우터에 도달하지 않는다(2026-09-05 실측). 그래서
 *    `app/components/SystemNotice.tsx` 를 쓸 수 없고, 클래스도 붙일 수 없다.
 *
 *    하드 히트(주소 직접 입력·외부 링크·크롤러)로 열리는 404 는 `dist/404.html`, 즉 이 파일이다.
 *    아래 값은 전부 `.policy-doc` 계열(styles/globals.css:828-1180)에서 그대로 옮긴 리터럴이며,
 *    새 색을 만들지 않는다. 정본이 바뀌면 여기도 같이 바꾼다.
 *
 *    `--font-display` 는 도달하지 않으므로 제목은 시스템 폰트로 렌더된다. 굵기 400 은
 *    `.policy-doc__title` 과 같은 값이다(정본 주석: 표시용 폰트에 w700 이 없어 위계를 크기로 만든다).
 */
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#0a0818",
  color: "#dbe4f3",
};

const docStyle: React.CSSProperties = {
  width: "min(1080px, calc(100% - 32px))",
  marginInline: "auto",
  padding: "36px 0 72px",
};

const headStyle: React.CSSProperties = {
  paddingBottom: 22,
  borderBottom: "1px solid rgba(148,163,184,0.2)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontWeight: 400,
  fontSize: "clamp(2rem, 5vw, 2.75rem)",
  lineHeight: 1.28,
  letterSpacing: "-0.01em",
  color: "#f8fafc",
};

const metaStyle: React.CSSProperties = {
  margin: "12px 0 0",
  fontSize: "0.875rem",
  color: "#9fb0cc",
};

const ledeStyle: React.CSSProperties = {
  margin: "14px 0 0",
  maxWidth: "68ch",
  lineHeight: 1.75,
  color: "#c3cfe4",
  wordBreak: "keep-all",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 28,
};

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  borderRadius: 999,
  padding: "10px 22px",
  fontSize: "0.9375rem",
  fontWeight: 700,
  textDecoration: "none",
};

const primaryBtnStyle: React.CSSProperties = {
  ...btnStyle,
  border: "1px solid transparent",
  background: "#c4b5fd",
  color: "#0f0a24",
};

const ghostBtnStyle: React.CSSProperties = {
  ...btnStyle,
  border: "1px solid rgba(148,163,184,0.42)",
  background: "transparent",
  color: "#dbe4f3",
};

const relatedStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 36,
  paddingTop: 24,
  borderTop: "1px solid rgba(148,163,184,0.2)",
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 44,
  border: "1px solid rgba(148,163,184,0.3)",
  borderRadius: 999,
  padding: "7px 14px",
  fontSize: "0.8125rem",
  lineHeight: 1.5,
  color: "#a9b8d4",
  textDecoration: "none",
};

export default function NotFoundPage() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Head,
      null,
      React.createElement("title", null, "페이지를 찾을 수 없습니다 | Code Destiny"),
      React.createElement("meta", {
        name: "description",
        content: "요청한 페이지를 찾을 수 없습니다. Code Destiny의 공개 운세 가이드와 주요 서비스로 이동할 수 있습니다.",
      }),
      React.createElement("meta", { name: "robots", content: "noindex,follow" }),
    ),
    React.createElement(
      "main",
      { style: pageStyle },
      React.createElement(
        "div",
        { style: docStyle },
        React.createElement(
          "header",
          { style: headStyle },
          React.createElement("h1", { style: titleStyle }, "페이지를 찾을 수 없습니다"),
          React.createElement("p", { style: metaStyle }, "ERROR 404"),
          React.createElement(
            "p",
            { style: ledeStyle },
            "주소가 바뀌었거나 아직 공개되지 않은 길일 수 있습니다. 오래된 링크를 따라오셨다면 주소의 오타를 한 번 확인해 주시고, 그래도 열리지 않으면 아래에서 가까운 길로 이동해 주세요. 사주·타로·자미두수 가이드와 운세 인사이트는 모두 무료로 열려 있습니다.",
          ),
        ),
        React.createElement(
          "div",
          { style: actionsStyle },
          React.createElement("a", { href: "/saju/", style: primaryBtnStyle }, "무료 사주 분석"),
          React.createElement("a", { href: "/insights/", style: ghostBtnStyle }, "운세 인사이트 허브"),
          React.createElement("a", { href: "/", style: ghostBtnStyle }, "홈으로 돌아가기"),
        ),
        React.createElement(
          "nav",
          { style: relatedStyle, "aria-label": "관련 문서" },
          quickLinks.map((item) => React.createElement(
            "a",
            {
              key: item.href,
              href: item.href,
              style: chipStyle,
            },
            item.label,
          )),
        ),
      ),
    )
  );
}
