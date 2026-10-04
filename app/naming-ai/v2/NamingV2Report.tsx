"use client";

// 작명 v2 작명서 — 결정론 엔진 view(EngineView) + 서술(narration)을 그린다.
// tier="free": /basis 미리보기(사주 요약·후보 5·이름 상세). tier="paid": 표지 작명서·비교·편지·이미지 저장까지.
// 🔴 paid-result-locale-copy 가드의 화면(surface)이다: 주석 밖에 한글을 쓰지 않는다.
// 🔴 엔진 값은 계산하지 않고 보여 주기만 한다. 구 레코드(radical·counts 없음)는 해당 줄만 숨기거나 대체 문구로 그린다.

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import styles from "./naming-v2.module.css";
import { getNamingV2Copy, type NamingV2Copy } from "./namingV2Copy";
import {
  ElementChip,
  ElementPentagon,
  GradeBadge,
  GridPillars,
  HanjiFrame,
  PillarRow,
  SamjaeTiers,
  ScoreRadar,
  Seal,
  SoundLine,
  StrokeCard,
  cx,
  inlineSvgPaint,
  type RadarSeries,
} from "./NamingArt";
import { V2_GRIDS, elementTone, nameElementCounts, type V2Candidate, type V2Element, type V2Engine, type V2Narration } from "./namingV2Types";

export interface NamingV2ReportProps {
  engine: Pick<V2Engine, "surname" | "saju" | "notices" | "candidates">;
  narration?: V2Narration | null;
  tier: "free" | "paid";
  /** PDF 캡처 중 — 펼침 애니메이션을 끈다 */
  exportExpand?: boolean;
  /** 부모가 로케일 변경을 따라가면 넘긴다(없으면 현재 로케일 1회) */
  locale?: string;
}

const COMPARE_MAX = 3;

/*
 * html2canvas 1.4 는 글자 기준선을 라이브 document 에 1×1 gif <img> 를 붙여 잰다(FontMetrics.parseMetrics).
 * Tailwind preflight 의 `img { display: block }` 가 그 탐침을 다음 줄로 밀어 기준선을 크게 재고(96px 한자 149 vs 실제 110),
 * PDF 에서 글자가 아래로 처진다. PDF 캡처 동안만 탐침 img 를 inline 으로 돌려놓는다.
 */
const H2C_PROBE_FIX = 'img[src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"]{display:inline !important}';

function noticeTexts(copy: NamingV2Copy, codes: string[] | undefined): string[] {
  const out: string[] = [];
  for (const code of codes || []) {
    if (code === "samjae.reference-only") continue; // 삼재 블록이 samjaeReference 로 직접 말한다
    const relaxed = /^relaxed\.stage-(\d+)$/.exec(code);
    if (relaxed) out.push(copy.relaxedNotice(relaxed[1]));
    else if (copy.notices[code]) out.push(copy.notices[code]);
  }
  return out;
}

function usefulFilled(candidate: V2Candidate, useful: V2Element[]): V2Element[] {
  const hits = new Set<V2Element>();
  for (const char of candidate.chars) if (char.jawon && useful.includes(char.jawon)) hits.add(char.jawon);
  return [...hits];
}

const firstHun = (hun: string | null | undefined) => (hun ? hun.split(/[,;]/)[0].trim() : "");

export default function NamingV2Report({ engine, narration, tier, exportExpand = false, locale }: NamingV2ReportProps) {
  const copy = useMemo(() => getNamingV2Copy(locale || getCurrentLoadingLocale()), [locale]);
  const { surname, saju } = engine;
  const candidates = useMemo(() => engine.candidates || [], [engine.candidates]);
  const paid = tier === "paid";
  const [selectedRank, setSelectedRank] = useState<number>(candidates[0]?.rank ?? 1);
  const [compare, setCompare] = useState<number[]>(() => (paid ? candidates.slice(0, 2).map((c) => c.rank) : []));
  const [compareNote, setCompareNote] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const certRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!exportExpand) return;
    const style = document.createElement("style");
    style.setAttribute("data-nv2-h2c-probe", "");
    style.textContent = H2C_PROBE_FIX;
    document.head.appendChild(style);
    return () => style.remove();
  }, [exportExpand]);

  const selected =candidates.find((c) => c.rank === selectedRank) || candidates[0];
  const pick = candidates[0];
  const notices = noticeTexts(copy, engine.notices);
  const surnameChars = Array.from(surname.hanja || "");
  const surnameSyllables = Array.from(surname.hangul || "");
  const fullHangul = (c: V2Candidate) => `${surname.hangul}${c.hangul}`;
  const narrationOf = (c: V2Candidate) => narration?.names?.find((n) => n.rank === c.rank) || null;
  const letter = narration?.letters?.find((l) => l.rank === selected?.rank) || narration?.letters?.[0] || null;

  if (!candidates.length || !selected) {
    return (
      <section className={cx(styles.scope, styles.report)}>
        <p className={styles.note}>{copy.noCandidates}</p>
      </section>
    );
  }

  function openDetail(rank: number) {
    setSelectedRank(rank);
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  }

  function toggleCompare(rank: number) {
    setCompareNote("");
    setCompare((prev) => {
      if (prev.includes(rank)) return prev.filter((r) => r !== rank);
      if (prev.length >= COMPARE_MAX) {
        setCompareNote(copy.compareFull);
        return prev;
      }
      return [...prev, rank];
    });
  }

  async function saveImage() {
    const element = certRef.current;
    if (!element || saveState === "saving") return;
    setSaveState("saving");
    try {
      await document.fonts?.ready;
      const { toBlob } = await import("html-to-image");
      const restore = inlineSvgPaint(element);
      let blob: Blob | null;
      try {
        const backgroundColor = window.getComputedStyle(element).getPropertyValue("--nv2-bg").trim() || undefined;
        blob = await toBlob(element, { pixelRatio: 3, cacheBust: true, backgroundColor });
      } finally {
        restore();
      }
      if (!blob) throw new Error("empty image");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `naming-certificate-${surname.hanja}${pick.hanja}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  }

  const compared = compare.map((rank) => candidates.find((c) => c.rank === rank)).filter((c): c is V2Candidate => Boolean(c));
  const seriesColors = ["var(--nv2-violet)", "var(--nv2-gold)", elementTone("water").color];
  const selectedNarration = narrationOf(selected);

  return (
    <section className={cx(styles.scope, styles.report, exportExpand && styles.exporting)} data-naming-v2={tier}>
      {paid ? (
        <>
          <div data-naming-pdf-page className={styles.certWrap}>
            <div ref={certRef} className={styles.certificate}>
              <HanjiFrame reveal={!exportExpand} className={styles.certFrame}>
                <div className={styles.certHead}>
                  <span className={cx(styles.han, styles.kicker)}>{copy.reportKicker}</span>
                  <Seal text={copy.sealBrand} size={40} tilt={4} round />
                </div>
                <h2 className={styles.certTitle}>{copy.reportTitle}</h2>
                <p className={styles.certLead}>{copy.reportLead(surname.hangul)}</p>
                <p className={styles.certPickLabel}>{copy.finalPickLabel}</p>
                <div className={styles.certName}>
                  <span className={cx(styles.han, styles.certHanja)} lang="ko">{surname.hanja}{pick.hanja}</span>
                  <Seal text={copy.sealNaming} size={60} tilt={-5} stamp={!exportExpand} />
                </div>
                <p className={styles.certHangul}>{fullHangul(pick)}</p>
                <ul className={styles.certChars}>
                  {pick.chars.map((char, k) => (
                    <li key={`${char.ch}${k}`}>
                      <span className={styles.han} lang="ko">{char.ch}</span>
                      <span>{firstHun(char.hun) || char.hangul}</span>
                    </li>
                  ))}
                </ul>
                <div className={styles.certGrid}>
                  {V2_GRIDS.map((grid) => (
                    <div key={grid} className={styles.certGridCell}>
                      <span className={styles.han}>{copy.grids[grid].han}</span>
                      <b>{pick.grids[grid]}</b>
                      <GradeBadge copy={copy} grade={pick.grades[grid]} />
                    </div>
                  ))}
                </div>
                <div className={styles.certFoot}>
                  <div className={styles.certFootInfo}>
                    <span className={styles.certTotal}>{copy.totalLabel} <b>{pick.total}</b></span>
                    <span className={styles.chipRow}>
                      {usefulFilled(pick, saju.useful).map((el) => <ElementChip key={el} copy={copy} element={el} suffix="" />)}
                    </span>
                  </div>
                  <Seal text={copy.sealDone} size={50} tilt={-8} stamp={!exportExpand} />
                </div>
              </HanjiFrame>
            </div>
          </div>
          <div className={styles.saveRow}>
            <button type="button" className={styles.button} onClick={() => void saveImage()} disabled={saveState === "saving"}>
              {saveState === "saving" ? copy.saving : copy.saveImage}
            </button>
            <span className={styles.note} role="status" aria-live="polite">
              {saveState === "saved" ? copy.saved : saveState === "failed" ? copy.saveFailed : ""}
            </span>
          </div>
        </>
      ) : null}

      <section data-naming-pdf-page className={styles.block}>
        <h2 className={styles.blockTitle}>{copy.sajuTitle}</h2>
        <PillarRow copy={copy} saju={saju} />
        <dl className={styles.elementRows}>
          <div>
            <dt>{copy.usefulLabel}</dt>
            <dd className={styles.chipRow}>{saju.useful.map((el) => <ElementChip key={el} copy={copy} element={el} />)}</dd>
          </div>
          {saju.derivedSupport?.length ? (
            <div>
              <dt>{copy.supportLabel}</dt>
              <dd className={styles.chipRow}>{saju.derivedSupport.map((el) => <ElementChip key={el} copy={copy} element={el} />)}</dd>
            </div>
          ) : null}
          {saju.caution?.length ? (
            <div>
              <dt>{copy.cautionLabel}</dt>
              <dd className={styles.chipRow}>{saju.caution.map((el) => <ElementChip key={el} copy={copy} element={el} />)}</dd>
            </div>
          ) : null}
        </dl>
        <p className={styles.pentagonFor}>
          {copy.nameAddsLabel} · <span className={styles.han} lang="ko">{surname.hanja}{selected.hanja}</span> {fullHangul(selected)}
        </p>
        <ElementPentagon copy={copy} counts={saju.counts} adds={nameElementCounts(selected)} />
      </section>

      {notices.length || copy.koOnlyNotice ? (
        <ul className={styles.notices}>
          {copy.koOnlyNotice ? <li>{copy.koOnlyNotice}</li> : null}
          {notices.map((text) => <li key={text}>{text}</li>)}
        </ul>
      ) : null}

      <section data-naming-pdf-page className={styles.block}>
        <h2 className={styles.blockTitle}>{copy.candidatesTitle}</h2>
        <p className={styles.lead}>{copy.candidatesLead}</p>
        <ol className={styles.cards}>
          {candidates.map((c) => {
            const active = c.rank === selected.rank;
            const inCompare = compare.includes(c.rank);
            const fills = usefulFilled(c, saju.useful);
            return (
              <li key={c.rank} className={cx(styles.card, active && styles.cardActive)}>
                <div className={styles.cardTop}>
                  <span className={styles.rank}>{copy.rankLabel(c.rank)}</span>
                  <span className={styles.total}>{copy.totalLabel} <b>{c.total}</b></span>
                </div>
                <span className={cx(styles.han, styles.cardHanja)} lang="ko">{surname.hanja}{c.hanja}</span>
                <span className={styles.cardHangul}>{fullHangul(c)}</span>
                <span className={styles.chipRow}>{c.chars.map((char, k) => <ElementChip key={`${char.ch}${k}`} copy={copy} element={char.jawon} />)}</span>
                {fills.length ? <span className={styles.cardFill}>{copy.fillsUseful(fills.map((el) => copy.elements[el]).join(", "))}</span> : null}
                <span className={styles.cardGrades}>
                  {V2_GRIDS.map((grid) => (
                    <span key={grid}><span className={styles.han}>{copy.grids[grid].han}</span> {copy.grades[c.grades[grid]]}</span>
                  ))}
                </span>
                <div className={styles.cardActions}>
                  <button type="button" className={cx(styles.button, styles.buttonGhost)} aria-pressed={active} onClick={() => openDetail(c.rank)}>
                    {copy.detailOpen}
                  </button>
                  {paid ? (
                    <button type="button" className={cx(styles.button, styles.buttonGhost)} aria-pressed={inCompare} onClick={() => toggleCompare(c.rank)}>
                      {inCompare ? copy.compareRemove : copy.compareAdd}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        {compareNote ? <p className={styles.note} role="status">{compareNote}</p> : null}
      </section>

      <section ref={detailRef} data-naming-pdf-page className={styles.block} style={{ scrollMarginTop: 88 }}>
        <h2 className={styles.blockTitle}>
          {copy.detailTitle} · <span className={styles.han} lang="ko">{surname.hanja}{selected.hanja}</span> {fullHangul(selected)}
        </h2>

        <h3 className={styles.subTitle}>{copy.strokesTitle} · {copy.method[selected.strokes.method] || selected.strokes.method}</h3>
        <div className={styles.strokeRow}>
          {surnameChars.map((ch, k) => (
            <StrokeCard key={`s${k}`} copy={copy} compact char={{ ch, hangul: surnameSyllables[k], strokes: selected.strokes.surname[k] ?? surname.strokes[k] ?? 0 }} />
          ))}
          {selected.chars.map((char, k) => <StrokeCard key={`n${k}`} copy={copy} char={char} />)}
        </div>

        <h3 className={styles.subTitle}>{copy.soundTitle}</h3>
        <SoundLine
          copy={copy}
          syllables={[...surnameSyllables, ...Array.from(selected.hangul)]}
          elements={selected.sound.elements}
          relations={selected.sound.relations}
        />
        {copy.mapping[selected.sound.mapping] ? <p className={styles.note}>{copy.mapping[selected.sound.mapping]}</p> : null}

        <h3 className={styles.subTitle}>{copy.gridsTitle}</h3>
        <p className={styles.caption}>{copy.gridsCaption}</p>
        <GridPillars copy={copy} candidate={selected} surnameHanja={surname.hanja} />

        <div className={styles.twoCol}>
          <div>
            <h3 className={styles.subTitle}>{copy.samjaeTitle}</h3>
            <SamjaeTiers copy={copy} samjae={selected.samjae} />
          </div>
          <div>
            <h3 className={styles.subTitle}>{copy.radarTitle}</h3>
            <ScoreRadar copy={copy} series={[{ key: String(selected.rank), label: fullHangul(selected), scores: selected.scores, color: "var(--nv2-violet)" }]} />
          </div>
        </div>

        {selectedNarration ? (
          <div className={styles.narration}>
            <h3 className={styles.subTitle}>{copy.narrationTitle}</h3>
            <dl>
              <div><dt>{copy.meaningLabel}</dt><dd>{selectedNarration.meaning}</dd></div>
              <div><dt>{copy.sajuSupportLabel}</dt><dd>{selectedNarration.sajuSupport}</dd></div>
              <div><dt>{copy.soundFeelLabel}</dt><dd>{selectedNarration.soundFeel}</dd></div>
            </dl>
          </div>
        ) : null}
      </section>

      {paid ? (
        <section data-naming-pdf-page className={styles.block}>
          <h2 className={styles.blockTitle}>{copy.compareTitle}</h2>
          <p className={styles.lead}>{copy.compareLead}</p>
          {compared.length < 2 ? (
            <p className={styles.note}>{copy.compareEmpty}</p>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.compareTable}>
                  <thead>
                    <tr>
                      <th scope="col"><span className={styles.srOnly}>{copy.compareTitle}</span></th>
                      {compared.map((c) => (
                        <th key={c.rank} scope="col">
                          <span className={cx(styles.han, styles.compareHanja)} lang="ko">{c.hanja}</span>
                          <span className={styles.compareHangul}>{fullHangul(c)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">{copy.totalLabel}</th>
                      {compared.map((c) => <td key={c.rank}><b className={styles.compareTotal}>{c.total}</b></td>)}
                    </tr>
                    {V2_GRIDS.map((grid) => (
                      <tr key={grid}>
                        <th scope="row">{copy.grids[grid].name}</th>
                        {compared.map((c) => <td key={c.rank}>{c.grids[grid]} <GradeBadge copy={copy} grade={c.grades[grid]} /></td>)}
                      </tr>
                    ))}
                    <tr>
                      <th scope="row">{copy.samjaeTitle}</th>
                      {compared.map((c) => <td key={c.rank}><GradeBadge copy={copy} grade={c.samjae.grade} /></td>)}
                    </tr>
                    <tr>
                      <th scope="row">{copy.soundTitle}</th>
                      {compared.map((c) => <td key={c.rank}>{c.sound.relations.map((rel) => copy.relations[rel]).join(" · ")}</td>)}
                    </tr>
                    <tr>
                      <th scope="row">{copy.jawonLabel}</th>
                      {compared.map((c) => (
                        <td key={c.rank}><span className={styles.chipRow}>{c.chars.map((char, k) => <ElementChip key={`${char.ch}${k}`} copy={copy} element={char.jawon} />)}</span></td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <ScoreRadar
                copy={copy}
                series={compared.map<RadarSeries>((c, k) => ({ key: String(c.rank), label: fullHangul(c), scores: c.scores, color: seriesColors[k] || seriesColors[0] }))}
              />
            </>
          )}
        </section>
      ) : null}

      {paid && letter ? (
        <section data-naming-pdf-page className={styles.block}>
          <HanjiFrame medallion={false} className={styles.letterFrame}>
            <h2 className={styles.blockTitle}>{copy.lettersTitle}</h2>
            <p className={styles.letter}>{letter.letter}</p>
            <div className={styles.letterSeal}><Seal text={copy.sealNaming} size={44} tilt={-3} /></div>
          </HanjiFrame>
        </section>
      ) : null}
    </section>
  );
}
