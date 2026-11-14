import {CENTER_GATES} from '../../../lib/human-design/centers';
import {AUTHORITY_COPY,CENTER_COPY,CROSS_ANGLE_COPY,NOT_SELF_COPY,PLANET_COPY,SIGNATURE_COPY,STRATEGY_COPY,TYPE_COPY,UI_TEXT,pick} from '../../../app/human-design/_copy';
import {GuideParagraphs} from '../../../app/human-design/_components/LivingGuide';
import type {HdGuide} from '../../../app/human-design/_lib/guide-access';
import type {HdChart,HdSelection} from '../../../app/human-design/_lib/types';
import styles from '../../../app/human-design/human-design.module.css';

// The web chart's free detail sections, using the same source copy and selection contract.
export default function HumanDesignDetails({chart,selection,setSelection,guide=null}:{chart:HdChart;selection:HdSelection;setSelection:(value:HdSelection)=>void;guide?:HdGuide|null}){
 const locale='ko' as const;
 const typeCopy=TYPE_COPY[chart.type as keyof typeof TYPE_COPY];
 const authorityCopy=AUTHORITY_COPY[chart.authority as keyof typeof AUTHORITY_COPY];
 const activeGateSet=new Set(chart.activeGates),defined=new Set(chart.definedCenters);
 const centerRows=Object.entries(CENTER_GATES).map(([center,gates])=>({center,defined:defined.has(center),active:gates.filter((gate:number)=>activeGateSet.has(gate)).length,total:gates.length}));
  const activationRail = (layer: "personality" | "design") => {
    if (!chart) return null;
    const label = layer === "personality" ? pick(UI_TEXT.personality, locale) : pick(UI_TEXT.design, locale);

    return (
      <section
        className={`${styles.chartRail} ${layer === "personality" ? styles.chartRailPersonality : styles.chartRailDesign}`}
        aria-label={label}
      >
        <h2 className={styles.chartRailHeading}>{label}</h2>
        <ul className={styles.chartRailList}>
          {chart.layers[layer].map((activation) => {
            const planet = PLANET_COPY[activation.planet as keyof typeof PLANET_COPY];
            const planetLabel = pick(planet, locale);
            return (
              <li key={`board-${layer}-${activation.planet}`}>
                <button
                  type="button"
                  className={styles.chartRailRow}
                  data-active={selection?.kind === "planet" && selection.planet === activation.planet && selection.layer === layer ? "true" : undefined}
                  onClick={() => setSelection({ kind: "planet", planet: activation.planet, layer })}
                  aria-label={`${planetLabel} ${activation.gate}.${activation.line}`}
                >
                  <span className={styles.chartRailGlyph} aria-hidden="true">{planet?.glyph || "•"}</span>
                  <span className={styles.chartRailCell}>{activation.gate}.{activation.line}</span>
                  <span className={styles.chartRailName}>{planetLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

 return <><div className={styles.block}>{activationRail("design")}{activationRail("personality")}</div>            {/* ② 타입 */}
            <section className={styles.block} id="hd-type">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionType, locale)}</h2>
              <p className={styles.blockLead}>{pick(typeCopy?.name, locale)}</p>
              <p className={styles.blockBody}>{pick(typeCopy?.summary, locale)}</p>
              {guide && <GuideParagraphs section={guide.type} ui={guide.ui} />}
              <dl className={styles.pairs}>
                <div>
                  <dt>{pick(UI_TEXT.signature, locale)}</dt>
                  <dd>{pick(SIGNATURE_COPY[chart.signature as keyof typeof SIGNATURE_COPY], locale)}</dd>
                </div>
                <div>
                  <dt>{pick(UI_TEXT.notSelf, locale)}</dt>
                  <dd>{pick(NOT_SELF_COPY[chart.notSelfTheme as keyof typeof NOT_SELF_COPY], locale)}</dd>
                </div>
              </dl>
              {guide && <p className={styles.blockBody}>{guide.themeQuestion}</p>}
            </section>

            {/* ③ 전략 */}
            <section className={styles.block} id="hd-strategy">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionStrategy, locale)}</h2>
              <p className={styles.blockLead}>
                {pick(STRATEGY_COPY[chart.strategy as keyof typeof STRATEGY_COPY], locale)}
              </p>
              <p className={styles.blockBody}>{guide?.type.example}</p>
              {guide && <p className={styles.blockBody}>{guide.type.caution}</p>}
            </section>

            {/* ④ 내적 권위 */}
            <section className={styles.block} id="hd-authority">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionAuthority, locale)}</h2>
              <p className={styles.blockLead}>{pick(authorityCopy?.name, locale)}</p>
              <p className={styles.blockBody}>{pick(authorityCopy?.summary, locale)}</p>
              {guide && <GuideParagraphs section={guide.authority} ui={guide.ui} />}
            </section>

            {/* ⑤ 프로파일 */}
            <section className={styles.block} id="hd-profile">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionProfile, locale)}</h2>
              <p className={`${styles.blockLead} ${styles.coreNumeral}`}>{chart.profile}</p>
              <p className={styles.blockBody}>
                {pick(UI_TEXT.profileLines, locale)} — {chart.profileLines.personality} / {chart.profileLines.design}
              </p>
              {guide && <div className={styles.guideText}><h3>{guide.ui.profile}</h3>{guide.profileText.map(line => <p key={line}>{line}</p>)}<p>{guide.profileBridge}</p><p>{guide.profileQuestion}</p><h3>{guide.definition}</h3><p>{guide.definitionText}</p></div>}
              <dl className={styles.pairs}>
                <div>
                  <dt>{pick(UI_TEXT.incarnationCross, locale)}</dt>
                  <dd>
                    {pick(CROSS_ANGLE_COPY[chart.incarnationCross.angle as keyof typeof CROSS_ANGLE_COPY], locale)}
                    <span className={styles.pairNote}>{chart.incarnationCross.notation}</span>
                  </dd>
                </div>
              </dl>
            </section>

            {/* ⑥ 센터 — 누르면 차트에서 같은 센터가 선택된다. */}
            <section className={styles.block} id="hd-centers">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionCenters, locale)}</h2>
              <p className={styles.blockBody}>{pick(UI_TEXT.centersDefinedHint, locale)}</p>
              <ul className={styles.rowList}>
                {centerRows.map((row) => (
                  <li key={row.center}>
                    <button
                      type="button"
                      className={styles.row}
                      data-active={selection?.kind === "center" && selection.center === row.center ? "true" : undefined}
                      onClick={() => setSelection({ kind: "center", center: row.center })}
                    >
                      <span className={`${styles.rowDot} ${row.defined ? styles.rowDotOn : ""}`} aria-hidden="true" />
                      <span className={styles.rowName}>
                        {pick(CENTER_COPY[row.center as keyof typeof CENTER_COPY]?.name, locale)}
                      </span>
                      <span className={styles.rowState}>
                        {guide?.centers.find(c => c.id === row.center)?.label || (row.defined ? pick(UI_TEXT.defined, locale) : pick(UI_TEXT.undefined, locale))}
                      </span>
                      <span className={styles.rowCount}>{row.active}/{row.total}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* ⑦ 채널 */}
            <section className={styles.block} id="hd-channels">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionChannels, locale)}</h2>
              <p className={styles.blockBody}>{pick(UI_TEXT.channelsHint, locale)}</p>
              {chart.channels.length === 0 ? (
                <p className={styles.blockEmpty}>{pick(UI_TEXT.noneYet, locale)}</p>
              ) : (
                <ul className={styles.rowList}>
                  {chart.channels.map((channel) => (
                    <li key={channel.channelId}>
                      <button
                        type="button"
                        className={styles.row}
                        data-active={selection?.kind === "channel" && selection.channelId === channel.channelId ? "true" : undefined}
                        onClick={() => setSelection({ kind: "channel", channelId: channel.channelId })}
                      >
                        <span className={`${styles.rowDot} ${styles.rowDotOn}`} aria-hidden="true" />
                        <span className={`${styles.rowName} ${styles.coreNumeral}`}>{channel.channelId}</span>
                        <span className={styles.rowState}>
                          {pick(CENTER_COPY[channel.centerA as keyof typeof CENTER_COPY]?.name, locale)}
                          {" ↔ "}
                          {pick(CENTER_COPY[channel.centerB as keyof typeof CENTER_COPY]?.name, locale)}
                        </span>
                        <span className={styles.rowCount}>
                          {channel.composition === "MIXED"
                            ? "P+D"
                            : (channel.composition === "PERSONALITY_ONLY" ? "P" : "D")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ⑧ 게이트 */}
            <section className={styles.block} id="hd-gates">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionGates, locale)}</h2>
              <p className={styles.blockBody}>{pick(UI_TEXT.gatesHint, locale)}</p>
              <div className={styles.gateGrid}>
                {[...chart.activeGates].sort((a, b) => a - b).map((gate) => (
                  <button
                    key={gate}
                    type="button"
                    className={styles.gateChip}
                    data-active={selection?.kind === "gate" && selection.gate === gate ? "true" : undefined}
                    onClick={() => setSelection({ kind: "gate", gate })}
                  >
                    {gate}
                  </button>
                ))}
              </div>
            </section>

</>;
}
