import Head from "next/head";
import React from "react";

const quickLinks = [
  { href: "/insights/famous-saju", label: "유명인 사주 분석" },
  { href: "/insights/famous-saju/yi-sun-sin", label: "이순신 사주" },
  { href: "/insights/famous-saju/iu", label: "아이유 사주" },
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
          "주소가 바뀌었거나 아직 공개되지 않은 길일 수 있습니다. 아래 링크에서 가까운 운세 가이드와 인사이트를 확인해 주세요.",
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
              href: "/insights",
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
              href: "/saju",
              style: {
                ...actionStyle,
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#111827",
              },
            },
            "무료 사주 분석",
          ),
        ),
      ),
    )
  );
}
