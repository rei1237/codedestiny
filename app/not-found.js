import Link from "next/link";

const QUICK_LINKS = [
  { href: "/tarot/mingri", label: "명리 타로", emoji: "🔮" },
  { href: "/astrology/cosmic", label: "서양 점성술", emoji: "🌙" },
  { href: "/oracle/hwatu-life", label: "화투 인생 패", emoji: "🎴" },
  { href: "/insights", label: "운명 인사이트", emoji: "📖" },
];

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 200px)",
        display: "grid",
        placeItems: "center",
        padding: "28px 16px 56px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "940px",
          borderRadius: "24px",
          border: "1px solid rgba(148,163,184,0.3)",
          background:
            "radial-gradient(circle at 12% 12%, rgba(56,189,248,0.2), transparent 40%), radial-gradient(circle at 86% 20%, rgba(251,146,60,0.2), transparent 44%), linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.92))",
          boxShadow: "0 28px 60px rgba(2,6,23,0.45)",
          padding: "30px 20px",
          color: "#e2e8f0",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#94a3b8",
            fontWeight: 600,
            letterSpacing: "0.08em",
            fontSize: "0.78rem",
          }}
        >
          ERROR 404
        </p>
        <h1
          style={{
            margin: "8px 0 10px",
            color: "#f8fafc",
            fontSize: "clamp(2rem, 5.5vw, 3.1rem)",
            lineHeight: 1.2,
            fontWeight: 900,
          }}
        >
          페이지를 찾을 수 없습니다
        </h1>
        <p
          style={{
            margin: "0 auto",
            maxWidth: "640px",
            lineHeight: 1.8,
            color: "#cbd5e1",
            fontSize: "0.97rem",
          }}
        >
          주소가 변경되었거나 삭제된 페이지입니다. 아래 버튼으로 바로 이동해 서비스를 계속 이용하실 수 있습니다.
        </p>

        <div
          style={{
            marginTop: "18px",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "center",
          }}
        >
          <Link
            href="/"
            style={{
              borderRadius: "999px",
              background: "#f8fafc",
              color: "#0f172a",
              fontWeight: 800,
              padding: "10px 18px",
              textDecoration: "none",
            }}
          >
            홈으로 돌아가기
          </Link>
          <Link
            href="/saju/basic"
            style={{
              borderRadius: "999px",
              background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
              color: "#fff",
              fontWeight: 800,
              padding: "10px 18px",
              textDecoration: "none",
            }}
          >
            사주 메인 서비스로 이동
          </Link>
          <Link
            href="/ziwei/chart"
            style={{
              borderRadius: "999px",
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              color: "#fff",
              fontWeight: 800,
              padding: "10px 18px",
              textDecoration: "none",
            }}
          >
            자미두수 서비스로 이동
          </Link>
        </div>

        <div
          style={{
            marginTop: "18px",
            borderTop: "1px solid rgba(148,163,184,0.28)",
            paddingTop: "16px",
          }}
        >
          <p style={{ margin: "0 0 10px", color: "#94a3b8", fontSize: "0.86rem" }}>
            많이 찾는 페이지
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-w-md mt-2" style={{ marginInline: "auto" }}>
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <span>{link.emoji}</span>
            <span>{link.label}</span>
          </Link>
        ))}
          </div>
        </div>
      </section>
    </main>
  );
}
