"use client";

/**
 * 간단 문의 폼 — 입력값으로 mailto: 링크를 조립해 사용자의 메일 앱을 연다.
 *
 * 기존 구현은 <form action="mailto:..." method="post" encType="text/plain">이었으나
 * Chrome을 비롯한 최신 브라우저가 mailto 폼 POST를 차단해 실제로 아무 일도 일어나지 않았다.
 * 서버 수신 엔드포인트가 없는 구조는 그대로 두고(=메일 앱 경유), 조립 방식만 바꿔 동작시킨다.
 *
 * supportEmail은 서버에서 prop으로 받는다 — site-policy-config의 폴백이 서버/클라이언트에서
 * 갈릴 수 있어 직접 import하면 하이드레이션 불일치가 난다.
 */

import { useState } from "react";

export default function ContactForm({ supportEmail }) {
  const [copyState, setCopyState] = useState("idle");

  const handleSubmit = (event) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();

    const subject = `[Code Destiny 문의] ${name}`;
    const body = `이름: ${name}\n회신 이메일: ${email}\n\n${message}\n`;

    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="policy-field">
          <label className="policy-label" htmlFor="contact-name">
            이름 / Name
          </label>
          <input className="policy-input" id="contact-name" name="name" type="text" autoComplete="name" required />
        </div>

        <div className="policy-field">
          <label className="policy-label" htmlFor="contact-email">
            회신 받을 이메일 / Email
          </label>
          <input className="policy-input" id="contact-email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="policy-field">
          <label className="policy-label" htmlFor="contact-message">
            문의 내용 / Message
          </label>
          <textarea className="policy-input" id="contact-message" name="message" rows={6} required />
        </div>

        <button className="policy-btn policy-btn--primary" type="submit">
          메일 앱으로 보내기
        </button>
      </form>

      <p className="policy-doc__note">
        버튼을 누르면 입력한 내용이 채워진 채로 메일 앱이 열립니다. 메일 앱이 열리지 않으면{" "}
        <button className="policy-doc__inline-btn" type="button" onClick={handleCopy}>
          {copyState === "copied" ? "주소를 복사했습니다" : "주소 복사하기"}
        </button>
        {copyState === "failed" ? ` — 복사에 실패했습니다. ${supportEmail} 주소로 직접 보내주세요.` : "를 눌러 직접 메일을 보내주세요."}
      </p>
    </>
  );
}
