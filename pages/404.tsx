import Head from "next/head";
import React from "react";
import YeoniNotFound from "../components/errors/YeoniNotFound";

// Direct requests export this Pages route to dist/404.html. Share the visible
// view with App Router navigation so both delivery paths show the same recovery UI.
export default function NotFoundPage() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Head,
      null,
      React.createElement("title", null, "페이지를 찾을 수 없습니다 | Code Destiny"),
      React.createElement("meta", { name: "description", content: "요청한 페이지를 찾을 수 없습니다. Code Destiny의 공개 운세 가이드와 주요 서비스로 이동할 수 있습니다." }),
      React.createElement("meta", { name: "robots", content: "noindex,follow" }),
      // Pages has no global stylesheet. Keep this document reset local to Head;
      // the shared view imports its own CSS module, including its paper palette.
      React.createElement("style", { key: "yeoni-error-reset" }, "html,body{margin:0;padding:0}*,*::before,*::after{box-sizing:border-box}")
    ),
    React.createElement(YeoniNotFound)
  );
}
