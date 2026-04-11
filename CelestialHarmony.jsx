import { useMemo, useState } from "react";

const PLANETS = [
  { name: "태양", question: "다른 사람들이 나에게서 가장 먼저 알아보는 것은 무엇인가" },
  { name: "수성", question: "나는 다른 사람들과 어떻게 지적으로 교류하는가" },
  { name: "금성", question: "나는 내 삶에서 다른 사람들을 어떻게 사랑하는가" },
  { name: "지구", question: "무엇이 나를 안정적인 사람으로 만드는가" },
  { name: "달", question: "내가 가장 강하게 느끼는 감정은 무엇인가" },
  { name: "화성", question: "나는 대립이나 갈등 상황에 어떻게 대처하는가" },
  { name: "목성", question: "나는 재정적인 삶을 어떻게 관리하는가" },
  { name: "토성", question: "나는 어떻게 더 규율을 잘 지킬 수 있는가" },
  { name: "천왕성", question: "내 삶에서 나를 옭아매는 제약은 무엇인가" },
  { name: "해왕성", question: "나는 어떻게 무조건적인 사랑을 보여줄 수 있는가" },
  { name: "명왕성", question: "내 삶에서 변형하고 탈바꿈해야 할 것은 무엇인가" },
];

const MAJOR = [
  { n: "바보", e: "The Fool", r: "0" },
  { n: "마법사", e: "The Magician", r: "I" },
  { n: "여사제", e: "The High Priestess", r: "II" },
  { n: "여황제", e: "The Empress", r: "III" },
  { n: "황제", e: "The Emperor", r: "IV" },
  { n: "교황", e: "The Hierophant", r: "V" },
  { n: "연인", e: "The Lovers", r: "VI" },
  { n: "전차", e: "The Chariot", r: "VII" },
  { n: "힘", e: "Strength", r: "VIII" },
  { n: "은둔자", e: "The Hermit", r: "IX" },
  { n: "운명의 바퀴", e: "Wheel of Fortune", r: "X" },
  { n: "정의", e: "Justice", r: "XI" },
  { n: "매달린 자", e: "The Hanged Man", r: "XII" },
  { n: "죽음", e: "Death", r: "XIII" },
  { n: "절제", e: "Temperance", r: "XIV" },
  { n: "악마", e: "The Devil", r: "XV" },
  { n: "탑", e: "The Tower", r: "XVI" },
  { n: "별", e: "The Star", r: "XVII" },
  { n: "달", e: "The Moon", r: "XVIII" },
  { n: "태양", e: "The Sun", r: "XIX" },
  { n: "심판", e: "Judgement", r: "XX" },
  { n: "세계", e: "The World", r: "XXI" },
];

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function CelestialHarmony() {
  const [spread, setSpread] = useState([]);
  const [goldenCard, setGoldenCard] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const canGenerate = spread.length === 11 && !loading;

  const draw = () => {
    const deck = shuffle(MAJOR);
    const picked = PLANETS.map((planet, i) => ({ idx: i + 1, planet, tarot: deck[i] }));
    setSpread(picked);
    setGoldenCard(deck[11] || deck[0]);
    setResult(null);
  };

  const runGemini = async () => {
    if (!canGenerate) return;
    setLoading(true);
    try {
      const cards = spread.map((item) => ({
        idx: item.idx,
        planet: item.planet.name,
        question: item.planet.question,
        tarot: item.tarot,
      }));

      const response = await fetch("/api/celestial-harmony", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards, goldenCard }),
      });
      const payload = await response.json();
      if (!payload?.ok || !payload?.result) {
        throw new Error(payload?.message || "Gemini 리딩 생성 실패");
      }
      setResult(payload.result);
    } catch (error) {
      setResult({
        perCard: [],
        finalGolden: {
          title: "황금빛 통합 카드",
          goldenCard: `${goldenCard?.r || ""} ${goldenCard?.n || ""}`,
          summary: String(error?.message || "리딩 생성 중 문제가 발생했습니다."),
          toneManner: "차분한 톤으로 다시 시도해 주세요.",
          healing: "지금 잠깐 멈추고 숨을 고르셔도 괜찮습니다.",
          encouragement: "당신의 질문은 충분히 가치 있고, 답은 반드시 찾아옵니다.",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => result?.finalGolden || null, [result]);

  return (
    <section style={{ padding: 20, color: "#f3e7c3", background: "#0c1028", borderRadius: 16 }}>
      <h2 style={{ marginTop: 0 }}>천체의 선율 (Gemini Edition)</h2>
      <p>행성 11카드 스프레드와 황금빛 통합 카드까지 한 번에 해석합니다.</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button type="button" onClick={draw}>카드 배치하기</button>
        <button type="button" onClick={runGemini} disabled={!canGenerate}>
          {loading ? "Gemini 리딩 생성 중..." : "Gemini 상세 리딩"}
        </button>
      </div>

      {!!spread.length && (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          {spread.map((item) => (
            <li key={item.idx} style={{ marginBottom: 8 }}>
              <strong>{item.planet.name}</strong> - {item.planet.question} / {item.tarot.r} {item.tarot.n}
            </li>
          ))}
        </ol>
      )}

      {!!result?.perCard?.length && (
        <div style={{ marginTop: 18 }}>
          {result.perCard.map((item) => (
            <article key={item.idx} style={{ borderTop: "1px solid #6f5930", paddingTop: 10, marginTop: 10 }}>
              <h4 style={{ margin: "0 0 8px" }}>{item.idx}. {item.planet} - {item.cardName}</h4>
              <p><strong>핵심 해석</strong> {item.core}</p>
              <p><strong>패턴 분석</strong> {item.patterns}</p>
              <p><strong>실행 조언</strong> {item.advice}</p>
              <p><strong>오늘의 행동</strong> {item.action}</p>
              <p><strong>확언</strong> {item.affirmation}</p>
            </article>
          ))}
        </div>
      )}

      {summary && (
        <article style={{ marginTop: 18, padding: 14, border: "1px solid #d6b56f", borderRadius: 12, background: "rgba(133,98,23,.22)" }}>
          <h3 style={{ marginTop: 0 }}>{summary.title}</h3>
          <p><strong>황금 카드</strong> {summary.goldenCard}</p>
          <p><strong>요약</strong> {summary.summary}</p>
          <p><strong>톤앤매너</strong> {summary.toneManner}</p>
          <p><strong>힐링</strong> {summary.healing}</p>
          <p><strong>응원</strong> {summary.encouragement}</p>
        </article>
      )}
    </section>
  );
}
