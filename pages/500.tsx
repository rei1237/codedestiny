import Head from "next/head";
import React from "react";

export default function ServerErrorPage() {
  return React.createElement(
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
    // 🔴 pages/404.tsx 와 같은 세트를 유지한다. 이 선언이 없어서 `/500/` 이 본문 0자짜리
    // 인덱서블 페이지로 배포되고 있었다(2026-08-30 dist 전수 실측).
    // next/head 는 트리 어디에 있든 document head 로 올리므로, 본문 전체를 Fragment 로
    // 감싸 재들여쓰기하는 대신 여기 둔다.
    React.createElement(
      Head,
      null,
      React.createElement("title", null, "Server error | Code Destiny"),
      React.createElement("meta", { name: "robots", content: "noindex,follow" })
    ),
    React.createElement(
      "section",
      {
        style: {
          maxWidth: 560,
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 24,
          padding: 28,
          background: "rgba(255,255,255,0.05)",
        },
      },
      React.createElement("p", { style: { margin: 0, color: "#fde68a", fontWeight: 700 } }, "Code Destiny"),
      React.createElement("h1", { style: { margin: "12px 0 0", fontSize: 32 } }, "Server error"),
      React.createElement(
        "p",
        { style: { margin: "16px 0 0", lineHeight: 1.8, color: "#cbd5e1" } },
        "Something went wrong while loading this page. Please try again in a moment."
      ),
      React.createElement(
        "a",
        {
          href: "/",
          style: {
            display: "inline-flex",
            marginTop: 24,
            color: "#111827",
            background: "#fde68a",
            borderRadius: 999,
            padding: "12px 18px",
            fontWeight: 800,
            textDecoration: "none",
          },
        },
        "Go home"
      )
    )
  );
}
