"use client";

import type { LoadingLocale } from "@/constants/loadingMessages";
import {
  tarotTalismanCards,
  tarotTalismanImageCandidates,
  tarotTalismanReading,
  type TarotOrientation,
  type TarotTalismanCard,
  type TarotTalismanDeck,
  type TarotTalismanGroup,
} from "./tarot-talisman-data";

const GROUPS: TarotTalismanGroup[] = ["major", "wands", "cups", "swords", "pentacles"];

function tarotUi(locale: LoadingLocale) {
  if (locale === "ko") return {
    deck: "카드의 세계관", yeongnyangi: "영냥이 · 달빛 덱", teahouse: "연이 · 운명의 찻집",
    group: "카드 계열", groups: ["메이저", "완드", "컵", "소드", "펜타클"], choose: "부적으로 간직할 카드",
    upright: "정방향", reversed: "역방향", meaning: "카드가 비추는 흐름", shadow: "마음의 그림자",
    advice: "오늘의 선택", journal: "마음에 남길 질문", badge: "TAROT TALISMAN", source: "기존 상담 카드 해설",
  };
  if (locale === "ja") return {
    deck: "カードの世界観", yeongnyangi: "ヨンニャンイ・月光デッキ", teahouse: "ヨニ・運命の茶屋",
    group: "カード系列", groups: ["大アルカナ", "ワンド", "カップ", "ソード", "ペンタクル"], choose: "お守りにするカード",
    upright: "正位置", reversed: "逆位置", meaning: "カードが映す流れ", shadow: "心の影",
    advice: "今日の選択", journal: "心に残す問い", badge: "TAROT TALISMAN", source: "既存相談カードの解説",
  };
  return {
    deck: "Card world", yeongnyangi: "Yeongnyangi · Moonlight deck", teahouse: "Yeoni · Destiny teahouse",
    group: "Arcana", groups: ["Major", "Wands", "Cups", "Swords", "Pentacles"], choose: "Choose a card to keep",
    upright: "Upright", reversed: "Reversed", meaning: "The current this card reflects", shadow: "The shadow to notice",
    advice: "Today’s choice", journal: "A question to keep", badge: "TAROT TALISMAN", source: "From the existing consultation deck",
  };
}

export function TarotTalismanControls({
  locale,
  deck,
  group,
  card,
  orientation,
  onDeck,
  onGroup,
  onCard,
  onOrientation,
}: {
  locale: LoadingLocale;
  deck: TarotTalismanDeck;
  group: TarotTalismanGroup;
  card: TarotTalismanCard;
  orientation: TarotOrientation;
  onDeck: (value: TarotTalismanDeck) => void;
  onGroup: (value: TarotTalismanGroup) => void;
  onCard: (value: TarotTalismanCard) => void;
  onOrientation: (value: TarotOrientation) => void;
}) {
  const ui = tarotUi(locale);
  const visible = tarotTalismanCards.filter((item) => item.group === group);
  return <div className="cd-tarot-picker">
    <section className="cd-tarot-choice" aria-labelledby="cd-tarot-deck-label">
      <h3 id="cd-tarot-deck-label">{ui.deck}</h3>
      <div className="cd-tarot-segmented">
        <button type="button" aria-pressed={deck === "yeongnyangi"} onClick={() => onDeck("yeongnyangi")}>{ui.yeongnyangi}</button>
        <button type="button" aria-pressed={deck === "teahouse"} onClick={() => onDeck("teahouse")}>{ui.teahouse}</button>
      </div>
    </section>
    <section className="cd-tarot-choice" aria-labelledby="cd-tarot-group-label">
      <h3 id="cd-tarot-group-label">{ui.group}</h3>
      <div className="cd-tarot-filters">
        {GROUPS.map((item, index) => <button key={item} type="button" aria-pressed={group === item} onClick={() => onGroup(item)}>{ui.groups[index]}</button>)}
      </div>
    </section>
    <section className="cd-tarot-choice" aria-labelledby="cd-tarot-card-label">
      <h3 id="cd-tarot-card-label">{ui.choose}</h3>
      <div className="cd-tarot-card-grid">
        {visible.map((item) => <button key={item.id} type="button" aria-pressed={card.id === item.id} onClick={() => onCard(item)}>
          <i style={{ backgroundImage: `url(${tarotTalismanImageCandidates(item, deck, locale)[0]})` }} aria-hidden />
          <span><b>{item.nameKo}</b><small>{item.nameEn}</small></span>
        </button>)}
      </div>
    </section>
    <div className="cd-tarot-segmented cd-tarot-orientation" aria-label={`${card.nameKo} direction`}>
      <button type="button" aria-pressed={orientation === "upright"} onClick={() => onOrientation("upright")}>{ui.upright}</button>
      <button type="button" aria-pressed={orientation === "reversed"} onClick={() => onOrientation("reversed")}>{ui.reversed}</button>
    </div>
  </div>;
}

export function TarotTalismanMeaning({ locale, deck, card, orientation }: {
  locale: LoadingLocale;
  deck: TarotTalismanDeck;
  card: TarotTalismanCard;
  orientation: TarotOrientation;
}) {
  const ui = tarotUi(locale);
  const reading = tarotTalismanReading(card, orientation);
  const direction = orientation === "upright" ? card.upright : card.reversed;
  return <article className="cd-tarot-meaning" aria-labelledby="cd-tarot-meaning-title">
    <div className="cd-tarot-meaning-head">
      <p>{ui.badge} · {deck === "yeongnyangi" ? ui.yeongnyangi : ui.teahouse}</p>
      <h2 id="cd-tarot-meaning-title">{card.nameKo}</h2>
      <span>{card.nameEn} · {orientation === "upright" ? ui.upright : ui.reversed}</span>
    </div>
    <div className="cd-tarot-keywords">{direction.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div>
    <blockquote>{reading.coreSymbol}</blockquote>
    <div className="cd-tarot-reading-grid">
      <section><h3>{ui.meaning}</h3><p>{orientation === "upright" ? reading.uprightMeaning : reading.reversedMeaning}</p></section>
      <section><h3>{ui.shadow}</h3><p>{reading.relationshipShadow}</p><p>{reading.emotionalPattern}</p></section>
      <section><h3>{ui.advice}</h3><p>{reading.advice}</p><p className="cd-tarot-caution">{reading.avoidAction}</p></section>
      <section><h3>{ui.journal}</h3><p>{reading.yesNoNuance}</p><p>{reading.timingNuance}</p></section>
    </div>
    <footer><span aria-hidden>☾</span><p>{reading.yeoniMetaphor}</p><small>{ui.source}</small></footer>
  </article>;
}
