"use client";

// 센터 · 게이트 · 채널 · 행성 상세 (요구사항 20).
//
// 🔴 여기 나오는 값은 전부 **계산으로 확인된 사실**이다 — 번호, 라인, 그 게이트를 켠 행성과
//    계층, 소속 센터, 채널 완성 여부. 게이트/채널의 개인 해석은 지어내지 않고 같은 결제로
//    열리는 AI 리딩에 맡긴다(_copy/index.ts 상단 주석 참고).

import { useEffect, useRef, useState } from "react";
// 🔴 스크롤 잠금을 새로 만들지 않는다 — 공용 훅이 이미 잠금 카운트와 스크롤바 보정을 갖고 있고,
//    여기서 또 만들면 결제 오버레이와 겹칠 때 서로의 복원값을 덮어쓴다(코딩 원칙 6).
import { useBodyScrollLock } from "@/app/_lib/body-scroll-lock";
import { CHANNELS, channelsOfGate } from "@/lib/human-design/channels";
import { CENTER_GATES, centerOfGate } from "@/lib/human-design/centers";
import { CENTER_COPY, GATE_ICHING, PLANET_COPY, UI_TEXT, pick, type Locale } from "../_copy";
import type { HdChart, HdSelection } from "../_lib/types";
import styles from "./detail-sheet.module.css";

type Props = {
  chart: HdChart;
  locale: Locale;
  selection: HdSelection;
  onClose: () => void;
};

function centerName(center: string, locale: Locale): string {
  return pick(CENTER_COPY[center as keyof typeof CENTER_COPY]?.name, locale) || center;
}

function planetName(planet: string, locale: Locale): string {
  const entry = PLANET_COPY[planet as keyof typeof PLANET_COPY];
  if (!entry) return planet;
  return locale === "ko" ? entry.ko : entry.en;
}

function layerName(layer: string, locale: Locale): string {
  return layer === "personality" ? pick(UI_TEXT.personality, locale) : pick(UI_TEXT.design, locale);
}

/** 바텀시트로 뜨는 좁은 화면인가. 데스크탑에서는 옆에 붙는 패널이라 스크롤을 잠그지 않는다. */
function useNarrowViewport(): boolean {
  // 🔴 초기값은 서버와 같은 false 여야 한다. 여기서 window 를 바로 읽으면 하이드레이션이 어긋난다.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 899px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return narrow;
}

export default function DetailSheet({ chart, locale, selection, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const narrow = useNarrowViewport();
  useBodyScrollLock(narrow && Boolean(selection));

  useEffect(() => {
    if (!selection) return undefined;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, onClose]);

  if (!selection) return null;

  const completedById = new Map(chart.channels.map((channel) => [channel.channelId, channel]));
  const activeGates = new Set(chart.activeGates);

  let title = "";
  let subtitle = "";
  const rows: Array<{ label: string; value: string }> = [];
  const listBlocks: Array<{ heading: string; items: string[] }> = [];

  if (selection.kind === "center") {
    const center = selection.center;
    const isDefined = chart.definedCenters.includes(center);
    const copy = CENTER_COPY[center as keyof typeof CENTER_COPY];
    const gates = CENTER_GATES[center as keyof typeof CENTER_GATES] || [];
    const centerChannels = chart.channels.filter((c) => c.centerA === center || c.centerB === center);

    title = centerName(center, locale);
    subtitle = pick(copy?.role, locale);
    rows.push({
      label: pick(UI_TEXT.center, locale),
      value: isDefined ? pick(UI_TEXT.defined, locale) : pick(UI_TEXT.undefined, locale),
    });
    listBlocks.push({
      heading: `${pick(UI_TEXT.gate, locale)} (${gates.filter((g) => activeGates.has(g)).length}/${gates.length})`,
      items: gates.map((gate) => `${gate}${activeGates.has(gate) ? " ●" : ""}`),
    });
    listBlocks.push({
      heading: pick(UI_TEXT.activeChannels, locale),
      items: centerChannels.length
        ? centerChannels.map((c) => `${c.channelId} · ${centerName(c.centerA, locale)} ↔ ${centerName(c.centerB, locale)}`)
        : ["—"],
    });
  }

  if (selection.kind === "gate") {
    const gate = selection.gate;
    const center = centerOfGate(gate);
    const activations = chart.activations.filter((a) => a.gate === gate);
    const gateChannels = channelsOfGate(gate);

    title = `${pick(UI_TEXT.gate, locale)} ${gate}`;
    subtitle = pick(GATE_ICHING[gate], locale);
    rows.push({ label: pick(UI_TEXT.belongsTo, locale), value: centerName(center, locale) });
    rows.push({
      label: pick(UI_TEXT.ichingName, locale),
      value: pick(GATE_ICHING[gate], locale),
    });
    listBlocks.push({
      heading: pick(UI_TEXT.activatedBy, locale),
      items: activations.length
        ? activations.map((a) => `${gate}.${a.line} · ${planetName(a.planet, locale)} · ${layerName(a.layer, locale)}`)
        : ["—"],
    });
    listBlocks.push({
      heading: pick(UI_TEXT.participatesIn, locale),
      items: gateChannels.map((channel) => {
        const done = completedById.has(channel.channelId);
        const state = done ? pick(UI_TEXT.complete, locale) : pick(UI_TEXT.incomplete, locale);
        return `${channel.channelId} · ${centerName(channel.centerA, locale)} ↔ ${centerName(channel.centerB, locale)} · ${state}`;
      }),
    });
  }

  if (selection.kind === "channel") {
    const meta = CHANNELS.find((channel) => channel.channelId === selection.channelId);
    const complete = completedById.get(selection.channelId);
    if (meta) {
      title = `${pick(UI_TEXT.channel, locale)} ${meta.channelId}`;
      subtitle = `${centerName(meta.centerA, locale)} ↔ ${centerName(meta.centerB, locale)}`;
      rows.push({
        label: pick(UI_TEXT.channel, locale),
        value: complete ? pick(UI_TEXT.complete, locale) : pick(UI_TEXT.incomplete, locale),
      });
      if (complete) {
        const compositionLabel = complete.composition === "MIXED"
          ? `${pick(UI_TEXT.personality, locale)} + ${pick(UI_TEXT.design, locale)}`
          : layerName(complete.composition === "PERSONALITY_ONLY" ? "personality" : "design", locale);
        rows.push({ label: locale === "ko" ? "구성" : "Composition", value: compositionLabel });
      }
      listBlocks.push({
        heading: pick(UI_TEXT.gate, locale),
        items: [meta.gateA, meta.gateB].map((gate) => {
          const activations = chart.activations.filter((a) => a.gate === gate);
          const detail = activations.length
            ? activations.map((a) => `${a.line} · ${planetName(a.planet, locale)}(${layerName(a.layer, locale)})`).join(", ")
            : "—";
          return `${gate} · ${centerName(centerOfGate(gate), locale)} · ${detail}`;
        }),
      });
    }
  }

  if (selection.kind === "planet") {
    const activation = chart.layers[selection.layer]?.find((a) => a.planet === selection.planet);
    if (activation) {
      title = `${planetName(activation.planet, locale)} ${activation.gate}.${activation.line}`;
      subtitle = layerName(activation.layer, locale);
      rows.push({ label: pick(UI_TEXT.gate, locale), value: String(activation.gate) });
      rows.push({ label: pick(UI_TEXT.line, locale), value: String(activation.line) });
      rows.push({ label: pick(UI_TEXT.belongsTo, locale), value: centerName(centerOfGate(activation.gate), locale) });
      rows.push({ label: pick(UI_TEXT.ichingName, locale), value: pick(GATE_ICHING[activation.gate], locale) });
    }
  }

  return (
    <div className={styles.layer}>
      {/* 좁은 화면에서만 보이는 배경막. 눌러서 닫을 수 있다. */}
      <button
        type="button"
        className={styles.scrim}
        aria-label={pick(UI_TEXT.close, locale)}
        onClick={onClose}
      />
      {/* 🔴 aria-modal 은 false 를 유지한다 — 이 저장소에는 포커스 트랩이 없고,
          true 라고 적으면 보조기술에 없는 계약을 약속하게 된다. */}
      <aside className={styles.sheet} role="dialog" aria-modal="false" aria-label={title}>
        <span className={styles.grip} aria-hidden="true" />
        <header className={styles.head}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={pick(UI_TEXT.close, locale)}>
          ✕
        </button>
      </header>

      {rows.length ? (
        <dl className={styles.rows}>
          {rows.map((row) => (
            <div className={styles.row} key={row.label + row.value}>
              <dt className={styles.rowLabel}>{row.label}</dt>
              <dd className={styles.rowValue}>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {listBlocks.map((block) => (
        <section className={styles.block} key={block.heading}>
          <h4 className={styles.blockHeading}>{block.heading}</h4>
          <ul className={styles.list}>
            {block.items.map((item) => <li className={styles.listItem} key={item}>{item}</li>)}
          </ul>
        </section>
      ))}

        <p className={styles.note}>{pick(UI_TEXT.interpretationPending, locale)}</p>
      </aside>
    </div>
  );
}
