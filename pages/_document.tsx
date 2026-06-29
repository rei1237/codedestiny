import { Head, Html, Main, NextScript } from "next/document";
import React from "react";

export default function Document() {
  return React.createElement(
    Html,
    { lang: "ko" },
    React.createElement(Head, null),
    React.createElement(
      "body",
      null,
      React.createElement(Main, null),
      React.createElement(NextScript, null),
    ),
  );
}
