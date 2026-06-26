"use client";

import { useState } from "react";

type HelloResponse = {
  status: string;
  message: string;
  timestamp: string;
};

const API_HELLO_TEST_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    requestFailed: "API 요청 실패",
    unknownError: "알 수 없는 오류",
    title: "/api/hello 연결 테스트",
    description: "버튼을 누르면 fetch로 API를 호출해 응답을 화면에 표시합니다.",
    loading: "호출 중...",
    callButton: "GET /api/hello 호출",
    errorLabel: "오류",
  },
  en: {
    requestFailed: "API request failed",
    unknownError: "Unknown error",
    title: "/api/hello Connection Test",
    description: "Press the button to call the API with fetch and display the response on screen.",
    loading: "Calling...",
    callButton: "Call GET /api/hello",
    errorLabel: "Error",
  },
  ja: {
    requestFailed: "APIリクエストに失敗しました",
    unknownError: "不明なエラー",
    title: "/api/hello 接続テスト",
    description: "ボタンを押すとfetchでAPIを呼び出し、レスポンスを画面に表示します。",
    loading: "呼び出し中...",
    callButton: "GET /api/helloを呼び出す",
    errorLabel: "エラー",
  },
} as const;

export default function ApiHelloTestPage() {
  const copy = API_HELLO_TEST_PAGE_TEXT_TRANSLATIONS.ko;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<HelloResponse | null>(null);

  async function callHelloApi() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/hello", {
        method: "GET",
        cache: "no-store",
      });
      const json = (await response.json()) as HelloResponse;
      if (!response.ok) {
        throw new Error(copy.requestFailed);
      }
      setData(json);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : copy.unknownError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
      <h1>{copy.title}</h1>
      <p>{copy.description}</p>

      <button onClick={callHelloApi} disabled={loading} style={{ padding: "10px 14px", cursor: "pointer" }}>
        {loading ? copy.loading : copy.callButton}
      </button>

      {error ? <p style={{ color: "crimson", marginTop: 16 }}>{copy.errorLabel}: {error}</p> : null}

      {data ? (
        <pre style={{ marginTop: 16, padding: 12, background: "#f5f5f5", borderRadius: 8, overflowX: "auto" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
