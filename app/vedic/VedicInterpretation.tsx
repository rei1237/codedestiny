"use client";

import type { VedicChart } from "./useVedicChart";

const ELEMENT_BY_SIGN: Record<string, "fire" | "earth" | "air" | "water"> = {
  Aries: "fire",
  Leo: "fire",
  Sagittarius: "fire",
  Taurus: "earth",
  Virgo: "earth",
  Capricorn: "earth",
  Gemini: "air",
  Libra: "air",
  Aquarius: "air",
  Cancer: "water",
  Scorpio: "water",
  Pisces: "water",
};

type SectionProps = {
  chart: VedicChart;
};

export function PersonalitySection({ chart }: SectionProps) {
  const lagna = chart.ascendant;
  const moon = chart.planets.find((p) => p.id === "moon") || null;

  return (
    <section style={{ marginTop: 12 }}>
      <h1 className="vedic-detail-title">타고난 성향</h1>
      <p className="vedic-detail-desc" style={{ marginBottom: 14 }}>
        지금 보고 계신 해석은{" "}
        <strong style={{ color: "#e5e7eb" }}>
          라그나(상승궁)와 달의 배치
        </strong>
        를 중심으로, 당신의 기질과 삶의 기본 리듬을 부드럽게 짚어 주기 위한 안내입니다. 마치 옆에서 조용히
        방향을 짚어 주는 코치라고 생각해 주세요.
      </p>

      <div className="vedic-section-card">
        <h2 className="vedic-section-heading">라그나가 말해 주는 바깥의 나</h2>
        <p className="vedic-section-body">
          상승궁은 “세상이 바라보는 나의 첫인상”이자, 인생 전반의 톤을 정하는 무대 조명과도 같습니다. 지금
          차트에서는{" "}
          <strong style={{ color: "#e5e7eb" }}>
            라그나가 {lagna?.sign ?? "알 수 없는 위치"}에 놓여
          </strong>
          있어, 스스로를 표현하는 방식에 해당 별자리의 색이 자연스럽게 녹아들 가능성이 큽니다.
        </p>

        <p className="vedic-section-body">
          이 배치는 “어떻게 행동하느냐”와 “어떤 역할을 맡을 때 힘이 나는가”에 직접 연결됩니다. 주변의 기대에
          휘둘리기보다는,{" "}
          <strong>라그나가 놓인 별자리의 장점을 의식적으로 살려 주는 것</strong>
          만으로도 에너지가 훨씬 덜 소모되는 삶을 설계할 수 있습니다.
        </p>
      </div>

      <div className="vedic-section-card">
        <h2 className="vedic-section-heading">달이 들려주는 속마음의 리듬</h2>
        <p className="vedic-section-body">
          달은 당신의{" "}
          <strong>내면의 기분, 안전감, 정서적인 리듬</strong>을 보여 줍니다. 현재 차트에서 달은{" "}
          <strong style={{ color: "#e5e7eb" }}>{moon?.sign ?? "알 수 없는 위치"}</strong>
          에 자리하고 있어, 감정이 움직이는 패턴이 이 별자리의 언어로 이야기되고 있을 가능성이 높습니다.
        </p>

        <p className="vedic-section-body">
          그래서 스스로를 돌볼 때에는 “달이 있는 별자리의 기질”을 충분히 존중해 주는 것이 중요합니다. 예를
          들어 안정감을 중시하는 달이라면,{" "}
          <strong>루틴과 예측 가능한 일정</strong>
          을, 탐구를 즐기는 달이라면{" "}
          <strong>새로운 배움과 관찰의 시간</strong>
          을 일부러 확보해 두는 식입니다. 그렇게 할 때, 마음이 훨씬 덜 흔들리면서도 자연스럽게 자신답게 살아갈
          수 있습니다.
        </p>
      </div>
    </section>
  );
}

export function LoveSection({ chart }: SectionProps) {
  const venus = chart.planets.find((p) => p.id === "venus") || null;
  const jupiter = chart.planets.find((p) => p.id === "jupiter") || null;
  const seventhHouse = chart.houses.find((h) => h.house === 7) || null;

  return (
    <section style={{ marginTop: 12 }}>
      <h1 className="vedic-detail-title">연애운</h1>
      <p className="vedic-detail-desc" style={{ marginBottom: 14 }}>
        연애와 관계는 “나의 기질”과 “상대와 맺는 방식”이 만나면서 만들어지는 섬세한 영역입니다. 아래 내용은{" "}
        <strong>금성과 목성, 그리고 7하우스</strong>를 바탕으로, 당신의 관계 패턴을 따뜻하게 비춰 보는
        해석입니다.
      </p>

      <div className="vedic-section-card">
        <h2 className="vedic-section-heading">금성이 보여 주는 사랑의 스타일</h2>
        <p className="vedic-section-body">
          금성은 사랑, 끌림, 즐거움의 방식을 상징합니다. 현재 차트에서 금성은{" "}
          <strong style={{ color: "#e5e7eb" }}>
            {venus?.sign ?? "알 수 없는 별자리"} · {venus?.house ? `${venus.house}하우스` : "하우스 정보 없음"}
          </strong>
          에 위치해 있어, 호감이 생길 때의 분위기와 관계 속에서 원하는 온도가 이 지점과 닿아 있습니다.
        </p>

        <p className="vedic-section-body">
          이 배치는 당신이{" "}
          <strong>어떤 순간에 설레고, 어떤 방식의 표현을 가장 자연스럽게 느끼는지</strong>
          를 잘 보여 줍니다. 앞으로의 연애에서, 스스로의 금성 기질을 존중하면서 표현하고 있는지만 점검해도
          관계의 만족도는 크게 달라질 수 있습니다.
        </p>
      </div>

      <div className="vedic-section-card">
        <h2 className="vedic-section-heading">목성과 7하우스가 말하는 “함께 성장하는 관계”</h2>
        <p className="vedic-section-body">
          목성은{" "}
          <strong>확장, 성장, 신뢰</strong>를 상징하는 별입니다. 차트에서 목성이 놓인 위치는 “어떤 관계에서
          함께 커 나갈 수 있는지”를 비춰 줍니다. 현재 목성은{" "}
          <strong style={{ color: "#e5e7eb" }}>
            {jupiter?.sign ?? "알 수 없는 별자리"} · {jupiter?.house ? `${jupiter.house}하우스` : "하우스 정보 없음"}
          </strong>
          에 있어, 이 영역에서 만나는 사람들과의 만남이 삶의 폭을 넓혀 줄 가능성이 큽니다.
        </p>

        <p className="vedic-section-body">
          특히{" "}
          <strong>7하우스({seventhHouse?.sign ?? "알 수 없는 별자리"})</strong>
          는 일대일 관계와 파트너십을 상징합니다. 이 하우스의 기질을 존중하는 방향으로 소통하고, 상대방을
          “함께 성장할 동반자”로 바라볼 때, 연애는 단순한 감정의 교류를 넘어 삶 전체를 단단하게 받쳐 주는
          기반으로 자라날 수 있습니다.
        </p>
      </div>
    </section>
  );
}

export function WealthSection({ chart }: SectionProps) {
  const venus = chart.planets.find((p) => p.id === "venus") || null;
  const jupiter = chart.planets.find((p) => p.id === "jupiter") || null;
  const secondHouse = chart.houses.find((h) => h.house === 2) || null;
  const eleventhHouse = chart.houses.find((h) => h.house === 11) || null;

  return (
    <section style={{ marginTop: 12 }}>
      <h1 className="vedic-detail-title">재물운</h1>
      <p className="vedic-detail-desc" style={{ marginBottom: 14 }}>
        여기서는{" "}
        <strong>2하우스(소득의 기반), 11하우스(수익과 네트워크), 금성과 목성</strong>
        을 중심으로, 당신이 어떤 방식으로 자원을 불려 나갈 때 안정감과 만족감을 느끼기 쉬운지를 살펴봅니다.
      </p>

      <div className="vedic-section-card">
        <h2 className="vedic-section-heading">2하우스와 금성 – “나만의 자원”을 다루는 방식</h2>
        <p className="vedic-section-body">
          2하우스는{" "}
          <strong>돈, 재능, 나만의 기술</strong>
          을 포함한 “내가 가진 것들”의 방입니다. 현재 차트에서 2하우스는{" "}
          <strong style={{ color: "#e5e7eb" }}>{secondHouse?.sign ?? "알 수 없는 별자리"}</strong>
          의 색을 띠고 있으며, 금성은{" "}
          <strong style={{ color: "#e5e7eb" }}>
            {venus?.sign ?? "알 수 없는 별자리"} · {venus?.house ? `${venus.house}하우스` : "하우스 정보 없음"}
          </strong>
          에 위치합니다.
        </p>

        <p className="vedic-section-body">
          이 조합은{" "}
          <strong>어떤 재능을 돈으로 연결했을 때 가장 자연스러운 흐름이 만들어지는지</strong>
          를 암시합니다. 억지로 맞지 않는 역할을 끌고 가기보다는, 이미 손에 쥐고 있는 재능·감각·관계를 살려
          수익 구조를 만드는 것이 훨씬 효율적이라는 메시지로 읽을 수 있습니다.
        </p>
      </div>

      <div className="vedic-section-card">
        <h2 className="vedic-section-heading">11하우스와 목성 – 장기적인 풍요의 그릇</h2>
        <p className="vedic-section-body">
          11하우스는{" "}
          <strong>수익, 네트워크, 장기적인 성취</strong>
          의 방입니다. 현재 11하우스는{" "}
          <strong style={{ color: "#e5e7eb" }}>{eleventhHouse?.sign ?? "알 수 없는 별자리"}</strong>
          의 성향을 띠고 있고, 목성은{" "}
          <strong style={{ color: "#e5e7eb" }}>
            {jupiter?.sign ?? "알 수 없는 별자리"} · {jupiter?.house ? `${jupiter.house}하우스` : "하우스 정보 없음"}
          </strong>
          에 놓여 있습니다.
        </p>

        <p className="vedic-section-body">
          목성은 “늘어나는 것들”을 상징하기 때문에,{" "}
          <strong>목성이 있는 하우스와 11하우스가 맡고 있는 삶의 영역</strong>
          에 투자하고 시간을 쌓을수록, 장기적인 풍요의 그릇도 함께 커지기 쉽습니다. 이 점을 염두에 두고,
          단기적인 이득보다{" "}
          <strong>꾸준히 쌓을 수 있는 구조</strong>
          에 초점을 맞춰 보시는 것을 권합니다.
        </p>
      </div>
    </section>
  );
}

export function HealthYogaSection({ chart }: SectionProps) {
  const sixthHouse = chart.houses.find((h) => h.house === 6) || null;
  const sun = chart.planets.find((p) => p.id === "sun") || null;
  const lagnaSign = chart.ascendant?.sign || null;
  const element = lagnaSign ? ELEMENT_BY_SIGN[lagnaSign] : undefined;

  const yogaSuggestions: { title: string; poses: string; intent: string }[] = [];

  if (element === "fire") {
    yogaSuggestions.push({
      title: "불의 기운을 부드럽게 식혀 주는 요가",
      poses: "차일드 포즈(Balasana), 누운 비틀기(Supta Matsyendrasana), 부드러운 캣카우(Cat–Cow)",
      intent: "강한 추진력은 살리되, 몸과 신경계가 과열되지 않도록 진정시키는 데 초점을 둡니다.",
    });
  } else if (element === "earth") {
    yogaSuggestions.push({
      title: "땅의 에너지를 가볍게 깨우는 요가",
      poses: "산자세(Tadasana), 반 태양경배 동작, 간단한 플랭크 변형",
      intent: "안정적인 기운에 약간의 활력을 더해, 몸과 마음이 무겁지 않게 움직일 수 있도록 돕습니다.",
    });
  } else if (element === "air") {
    yogaSuggestions.push({
      title: "공기의 산만함을 모아 주는 요가",
      poses: "나무자세(Vrksasana), 워리어2(Virabhadrasana II), 서서 앞으로 숙이기(Uttanasana)",
      intent: "생각이 분산될 때, 균형과 하체 집중을 통해 의식과 호흡을 한곳에 모아 줍니다.",
    });
  } else if (element === "water") {
    yogaSuggestions.push({
      title: "물의 감정을 부드럽게 흐르게 하는 요가",
      poses: "코브라(Bhujangasana), 브리지(Bridge Pose), 비둘기 변형(Pigeon variation)",
      intent: "가슴과 골반을 여유 있게 열어 주면서, 묵직한 감정이 안전하게 흘러나가도록 돕습니다.",
    });
  }

  return (
    <section style={{ marginTop: 12 }}>
      <h1 className="vedic-detail-title">건강 및 요가</h1>
      <p className="vedic-detail-desc" style={{ marginBottom: 14 }}>
        건강 운세는{" "}
        <strong>6하우스(질병·루틴)와 태양의 상태</strong>
        를 함께 보면서, 어떤 생활 패턴이 몸과 에너지를 지켜 줄 수 있는지 살펴보는 과정입니다. 아래 내용은
        의료적 진단이 아니라, 일상 속에서 자신을 더 아끼기 위한 방향 제안으로 읽어 주세요.
      </p>

      <div className="vedic-section-card">
        <h2 className="vedic-section-heading">6하우스가 알려 주는 관리 포인트</h2>
        <p className="vedic-section-body">
          지금 차트에서 6하우스는{" "}
          <strong style={{ color: "#e5e7eb" }}>{sixthHouse?.sign ?? "알 수 없는 별자리"}</strong>
          의 기운을 띠고 있습니다. 이 위치는{" "}
          <strong>“어떤 방식으로 몸을 관리해야 건강이 지켜지는가”</strong>
          에 대한 힌트를 줍니다.
        </p>

        <p className="vedic-section-body">
          예를 들어, 6하우스의 별자리가 규칙성과 실천을 중시한다면{" "}
          <strong>짧더라도 매일 반복하는 루틴</strong>
          이 중요할 수 있고, 감수성이 강한 별자리라면{" "}
          <strong>정서적 스트레스를 덜어내는 시간</strong>
          이 무엇보다 우선일 수 있습니다. 어떤 경우든, 몸이 보내는 작은 신호를 무시하지 않고 주기적으로
          점검하는 습관이 가장 큰 방어막이 됩니다.
        </p>
      </div>

      <div className="vedic-section-card">
        <h2 className="vedic-section-heading">태양과 에너지 관리</h2>
        <p className="vedic-section-body">
          태양은{" "}
          <strong>활력, 자존감, “나”라는 중심</strong>
          을 상징합니다. 현재 태양은{" "}
          <strong style={{ color: "#e5e7eb" }}>
            {sun?.sign ?? "알 수 없는 별자리"} · {sun?.house ? `${sun.house}하우스` : "하우스 정보 없음"}
          </strong>
          에 놓여 있어, 어느 영역에서 에너지가 잘 타오르고, 어디에서 쉽게 소진되는지를 보여 줍니다.
        </p>

        <p className="vedic-section-body">
          자신의 태양이 빛나기 쉬운 영역에 충분히 시간을 배분해 줄수록,{" "}
          <strong>면역력과 회복력 역시 자연스럽게 뒷받침</strong>
          되는 경우가 많습니다. 반대로, 에너지가 잘 맞지 않는 일에 장기간 자신을 묶어 두면, 몸이 먼저
          피로를 호소할 수 있다는 점을 기억해 두세요.
        </p>
      </div>

      {yogaSuggestions.length > 0 && (
        <div className="vedic-section-card">
          <h2 className="vedic-section-heading">당신의 에너지를 보완하는 요가 루틴</h2>
          {yogaSuggestions.map((s) => (
            <div key={s.title} style={{ marginBottom: 10 }}>
              <p className="vedic-section-body">
                <strong style={{ color: "#e5e7eb" }}>{s.title}</strong>
              </p>
              <p className="vedic-section-body">
                추천 자세: <strong>{s.poses}</strong>
              </p>
              <p className="vedic-section-body">{s.intent}</p>
            </div>
          ))}
          <p className="vedic-section-body" style={{ marginTop: 8 }}>
            가능한 범위 안에서,{" "}
            <strong>통증 없이 편안하게 느껴지는 정도까지만</strong>
            따라 해 보시고, 건강 상태에 따라 전문 의료진이나 요가 지도자의 조언을 함께 참고하시면 가장
            안전합니다.
          </p>
        </div>
      )}
    </section>
  );
}

