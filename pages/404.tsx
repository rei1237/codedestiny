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

const chipStyle: React.CSSProperties = {
  border: "1px solid rgba(251,191,36,0.32)",
  borderRadius: 14,
  background: "rgba(251,191,36,0.08)",
  color: "#fde68a",
  fontWeight: 800,
  padding: "12px 14px",
  textDecoration: "none",
};

const actionStyle: React.CSSProperties = {
  borderRadius: 999,
  fontWeight: 800,
  padding: "10px 18px",
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
      {
        style: {
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#080716",
          color: "#f8fafc",
          padding: 24,
        },
      },
      React.createElement(
        "section",
        {
          style: {
            width: "100%",
            maxWidth: 720,
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 24,
            padding: 28,
            background: "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))",
            boxShadow: "0 28px 60px rgba(2,6,23,0.42)",
            textAlign: "center",
          },
        },
        React.createElement("p", { style: { margin: 0, color: "#fde68a", fontWeight: 800, letterSpacing: "0.08em" } }, "ERROR 404"),
        React.createElement("h1", { style: { margin: "10px 0 0", fontSize: 34, lineHeight: 1.2 } }, "페이지를 찾을 수 없습니다"),
        React.createElement(
          "p",
          { style: { margin: "14px auto 0", maxWidth: 520, lineHeight: 1.8, color: "#cbd5e1" } },
          "주소가 바뀌었거나 아직 공개되지 않은 길일 수 있습니다. 오래된 링크를 따라오셨다면 주소의 오타를 한 번 확인해 주시고, 그래도 열리지 않으면 아래에서 가까운 길로 이동해 주세요. 사주·타로·자미두수 가이드와 운세 인사이트는 모두 무료로 열려 있습니다.",
        ),
        React.createElement(
          "div",
          { style: { margin: "24px auto 0", display: "grid", gap: 10, maxWidth: 520 } },
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
        React.createElement(
          "div",
          { style: { marginTop: 22, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" } },
          React.createElement(
            "a",
            {
              href: "/insights/",
              style: {
                ...actionStyle,
                background: "#f8fafc",
                color: "#0f172a",
              },
            },
            "운세 인사이트 허브",
          ),
          React.createElement(
            "a",
            {
              href: "/saju/",
              style: {
                ...actionStyle,
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#111827",
              },
            },
            "무료 사주 분석",
          ),
          React.createElement(
            "a",
            {
              href: "/",
              style: {
                ...actionStyle,
                background: "transparent",
                color: "#e2e8f0",
                border: "1px solid rgba(255,255,255,0.28)",
              },
            },
            "홈으로 돌아가기",
          ),
        ),
      ),
    )
  );
}
