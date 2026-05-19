"use client";

import { useState } from "react";

type HelloResponse = {
  status: string;
  message: string;
  timestamp: string;
};

export default function ApiHelloTestPage() {
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
        throw new Error("API 요청 실패");
      }
      setData(json);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
      <h1>/api/hello 연결 테스트</h1>
      <p>버튼을 누르면 fetch로 API를 호출해 응답을 화면에 표시합니다.</p>

      <button onClick={callHelloApi} disabled={loading} style={{ padding: "10px 14px", cursor: "pointer" }}>
        {loading ? "호출 중..." : "GET /api/hello 호출"}
      </button>

      {error ? <p style={{ color: "crimson", marginTop: 16 }}>오류: {error}</p> : null}

      {data ? (
        <pre style={{ marginTop: 16, padding: 12, background: "#f5f5f5", borderRadius: 8, overflowX: "auto" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
