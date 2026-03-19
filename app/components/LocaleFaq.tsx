type FaqItem = { q: string; a: string };

function getFaq(locale: string): { heading: string; items: FaqItem[] } {
  switch (locale) {
    case "zh-CN":
      return {
        heading: "常见问题（FAQ）",
        items: [
          { q: "这是免费的吗？", a: "是的，Code Destiny 提供免费的塔罗与运势体验（部分功能可能需要点数）。" },
          { q: "塔罗疗愈体验是什么？", a: "它是一套引导式的塔罗体验，帮助你用四张牌梳理当下状态与行动方向。" },
          { q: "我需要注册吗？", a: "大多数内容无需注册即可浏览；涉及点数与账户功能时可能需要登录。" },
        ],
      };
    case "zh-TW":
      return {
        heading: "常見問題（FAQ）",
        items: [
          { q: "這是免費的嗎？", a: "是的，Code Destiny 提供免費的塔羅與運勢體驗（部分功能可能需要點數）。" },
          { q: "塔羅療癒體驗是什麼？", a: "這是一套引導式塔羅體驗，透過四張牌整理當下狀態與行動方向。" },
          { q: "需要註冊嗎？", a: "多數內容不需註冊即可瀏覽；涉及點數與帳戶功能時可能需要登入。" },
        ],
      };
    case "ja-JP":
      return {
        heading: "よくある質問（FAQ）",
        items: [
          { q: "無料で使えますか？", a: "はい。Code Destiny は無料のタロット/運勢体験を提供します（ポイントが必要な機能もあります）。" },
          { q: "Tarot Healing とは？", a: "4枚のカードで今の状況を整理し、次の一歩を見つけるためのガイド付き体験です。" },
          { q: "登録は必要ですか？", a: "多くのコンテンツは登録不要です。ポイントやアカウント機能にはログインが必要な場合があります。" },
        ],
      };
    case "fr-FR":
    case "fr-CA":
      return {
        heading: "FAQ",
        items: [
          { q: "Est-ce gratuit ?", a: "Oui. Code Destiny propose des expériences gratuites (certaines fonctionnalités peuvent nécessiter des points)." },
          { q: "Qu’est-ce que le Tarot Healing ?", a: "Une expérience guidée en 4 cartes pour clarifier ton état actuel et ta prochaine action." },
          { q: "Dois-je créer un compte ?", a: "La plupart des contenus sont accessibles sans inscription. Les fonctions liées aux points peuvent demander une connexion." },
        ],
      };
    case "es-ES":
      return {
        heading: "Preguntas frecuentes (FAQ)",
        items: [
          { q: "Es gratis?", a: "Si. Code Destiny ofrece experiencias de tarot y fortuna gratis (algunas funciones pueden requerir puntos)." },
          { q: "Que es Tarot Healing?", a: "Es una experiencia guiada de 4 cartas para aclarar tu situacion actual y tu siguiente paso." },
          { q: "Necesito registrarme?", a: "La mayor parte del contenido se puede usar sin registro. Las funciones de puntos/cuenta pueden requerir inicio de sesion." },
        ],
      };
    case "de-DE":
      return {
        heading: "FAQ",
        items: [
          { q: "Ist das kostenlos?", a: "Ja. Code Destiny bietet kostenlose Tarot- und Fortune-Erlebnisse (einige Funktionen können Punkte erfordern)." },
          { q: "Was ist Tarot Healing?", a: "Ein geführtes 4-Karten-Erlebnis, um deine aktuelle Situation zu ordnen und den nächsten Schritt zu finden." },
          { q: "Brauche ich ein Konto?", a: "Viele Inhalte sind ohne Registrierung verfügbar. Für Punkte/Account-Funktionen kann Login nötig sein." },
        ],
      };
    case "it-IT":
      return {
        heading: "FAQ",
        items: [
          { q: "È gratuito?", a: "Sì. Code Destiny offre esperienze gratuite (alcune funzioni potrebbero richiedere punti)." },
          { q: "Cos’è Tarot Healing?", a: "Un’esperienza guidata a 4 carte per chiarire la situazione attuale e il prossimo passo." },
          { q: "Serve un account?", a: "Molti contenuti sono disponibili senza registrazione. Le funzioni legate ai punti possono richiedere il login." },
        ],
      };
    case "th-TH":
      return {
        heading: "คำถามที่พบบ่อย (FAQ)",
        items: [
          { q: "ใช้งานฟรีไหม?", a: "ใช่ Code Destiny มีประสบการณ์ทาโรต์/ดวงชะตาฟรี (บางฟีเจอร์อาจต้องใช้แต้ม)" },
          { q: "Tarot Healing คืออะไร?", a: "ประสบการณ์แบบมีไกด์ 4 ใบ เพื่อช่วยจัดระเบียบสถานการณ์และหาทิศทางถัดไป" },
          { q: "ต้องสมัครสมาชิกไหม?", a: "ส่วนใหญ่ไม่ต้องสมัคร แต่ฟีเจอร์ที่เกี่ยวกับแต้ม/บัญชีอาจต้องเข้าสู่ระบบ" },
        ],
      };
    case "vi-VN":
      return {
        heading: "Câu hỏi thường gặp (FAQ)",
        items: [
          { q: "Có miễn phí không?", a: "Có. Code Destiny cung cấp trải nghiệm tarot và vận mệnh miễn phí (một số tính năng có thể cần điểm)." },
          { q: "Tarot Healing là gì?", a: "Trải nghiệm tarot 4 lá có hướng dẫn để làm rõ tình trạng hiện tại và bước tiếp theo." },
          { q: "Có cần đăng ký không?", a: "Nhiều nội dung không cần đăng ký. Tính năng điểm/tài khoản có thể yêu cầu đăng nhập." },
        ],
      };
    case "hi-IN":
      return {
        heading: "अक्सर पूछे जाने वाले प्रश्न (FAQ)",
        items: [
          { q: "क्या यह मुफ़्त है?", a: "हाँ। Code Destiny मुफ़्त टैरो/भाग्य अनुभव देता है (कुछ फीचर्स के लिए पॉइंट्स लग सकते हैं)।" },
          { q: "Tarot Healing क्या है?", a: "4 कार्ड का गाइडेड अनुभव जो वर्तमान स्थिति और अगले कदम को स्पष्ट करने में मदद करता है।" },
          { q: "क्या रजिस्ट्रेशन ज़रूरी है?", a: "कई कंटेंट बिना रजिस्ट्रेशन के उपलब्ध हैं। पॉइंट्स/अकाउंट फीचर्स के लिए लॉगिन लग सकता है।" },
        ],
      };
    case "ms-MY":
      return {
        heading: "Soalan lazim (FAQ)",
        items: [
          { q: "Adakah ia percuma?", a: "Ya. Code Destiny menawarkan pengalaman tarot dan nasib secara percuma (sesetengah ciri mungkin perlukan mata)." },
          { q: "Apa itu Tarot Healing?", a: "Pengalaman berpandu 4 kad untuk membantu anda memahami keadaan semasa dan langkah seterusnya." },
          { q: "Perlu daftar akaun?", a: "Kebanyakan kandungan boleh diakses tanpa daftar. Ciri mata/akaun mungkin memerlukan log masuk." },
        ],
      };
    default:
      return {
        heading: "FAQ",
        items: [
          { q: "Is it free?", a: "Yes. Code Destiny offers free tarot and fortune experiences (some features may require points)." },
          { q: "What is Tarot Healing?", a: "A guided 4-card tarot experience to clarify your current state and next step." },
          { q: "Do I need an account?", a: "Most content is available without sign-up. Point/account features may require login." },
        ],
      };
  }
}

export function LocaleFaq({ locale, canonicalUrl }: { locale: string; canonicalUrl: string }) {
  const { heading, items } = getFaq(locale);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  });

  return (
    <section
      style={{
        marginTop: "18px",
        background: "rgba(2, 6, 23, 0.55)",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        borderRadius: "14px",
        padding: "16px",
      }}
      aria-label={heading}
    >
      <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "10px" }}>{heading}</h2>
      <div style={{ display: "grid", gap: "10px" }}>
        {items.map((it) => (
          <details
            key={it.q}
            style={{
              borderRadius: "12px",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              padding: "10px 12px",
              background: "rgba(15, 23, 42, 0.55)",
            }}
          >
            <summary style={{ cursor: "pointer", fontWeight: 700, color: "#e2e8f0" }}>{it.q}</summary>
            <p style={{ marginTop: "8px", lineHeight: 1.75, opacity: 0.92 }}>{it.a}</p>
          </details>
        ))}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <link rel="canonical" href={canonicalUrl} />
    </section>
  );
}

