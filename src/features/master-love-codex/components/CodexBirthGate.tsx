"use client";

/**
 * 생년 정보 입력 — 결제 직전 화면.
 *
 * 공용 훅 useAiProfileSeed 로 현재 선택된 프로필 카드에서 자동 프리필한다.
 * 사용자가 이미 손댄 값은 덮어쓰지 않는다(빈 값만 채움).
 * 입력 박스를 두지 않는다 — 필드는 잉크 위에 놓이고 아래 헤어라인만 남는다.
 *
 * 프롤로그가 산문으로 말한 "두 장을 겹쳐 본다"를 여기서는 목록으로 다시 보여 준다.
 * 결제가 붙은 버튼("결과 보기")이 이 화면에 있으므로, 무엇을 받고 무엇을 받지 못하는지가
 * 버튼 위에 반드시 함께 있어야 한다. 가격은 priceSlot(PriceBadge)만 쓰고 리터럴로 적지 않는다.
 *
 * 폼이 길어 CTA 까지 스크롤이 멀다 — 모바일에서는 하단 고정 바(floatingCta)가 지금 결제될
 * 금액을 계속 들고 있는다. 두 슬롯 모두 현재 모드(개인/궁합)의 SKU 를 따라간다.
 */

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import CodexReveal from "./CodexReveal";
import { CODEX_ACTS } from "../data/acts";
import { CODEX_HONEST_LIMITS, CODEX_VALUE_AXES } from "../data/value";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

export interface CodexBirthInput {
  name: string;
  gender: "male" | "female" | "";
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
  /** 상대 정보가 있으면 궁합 SKU 로 전환된다. null 이면 개인판. 금액은 서버 조회(PriceBadge)만 쓴다. */
  partner: CodexPartnerInput | null;
}

/** 상대는 생년월일만 필수다. 성별·시각은 없어도 명반을 정오 기준으로 세운다. */
export interface CodexPartnerInput {
  name: string;
  gender: "male" | "female" | "";
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
}

export const EMPTY_CODEX_PARTNER: CodexPartnerInput = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  isLeapMonth: false,
};

export const EMPTY_CODEX_BIRTH: CodexBirthInput = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  isLeapMonth: false,
  partner: null,
};

interface CodexBirthGateProps {
  value: CodexBirthInput;
  onChange: (next: CodexBirthInput) => void;
  onSubmit: () => void;
  busy: boolean;
  busyLabel: string;
  error: string;
  /** 결제 버튼 옆 금액 배지 — 상위가 현재 모드의 PriceBadge 를 넣는다 */
  priceSlot?: React.ReactNode;
  /** 화면 최상단 프리미엄 상품 요약(배지 + 금액) */
  headerSlot?: React.ReactNode;
  /** 모바일 하단 고정 CTA — 상위가 현재 모드로 구성해 넣는다 */
  floatingCta?: React.ReactNode;
}

export default function CodexBirthGate({
  value,
  onChange,
  onSubmit,
  busy,
  busyLabel,
  error,
  priceSlot,
  headerSlot,
  floatingCta,
}: CodexBirthGateProps) {
  const copy = useMasterLoveCodexCopy();
  const { seed, seedVersion, reload } = useAiProfileSeed();
  const [reloading, setReloading] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  // 프로필 카드 → 빈 칸만 채운다. 사용자가 이미 입력·수정한 값은 유지한다.
  useEffect(() => {
    if (!seed) return;
    const current = valueRef.current;
    const next: CodexBirthInput = {
      ...current,
      name: current.name || (seed.name || ""),
      gender: current.gender || (seed.gender === "male" || seed.gender === "female" ? seed.gender : ""),
      birthDate: current.birthDate || (seed.birthDate || ""),
      // 사용자가 직접 체크한 "시각 모릅니다"는 프로필 전환·재마운트로 되살려지지 않는다
      // (체크된 상태에서는 birthTime 이 빈 값이라, 시드로 채우면 그 선택이 조용히 뒤집힌다).
      birthTime: current.birthTimeUnknown ? "" : (current.birthTime || (seed.birthTime || "")),
      birthTimeUnknown: current.birthTimeUnknown || (current.birthTime ? false : Boolean(seed.birthTimeUnknown)),
      calendarType: current.calendarType !== "solar" ? current.calendarType : (seed.calendarType === "lunar" ? "lunar" : "solar"),
    };
    if (JSON.stringify(next) !== JSON.stringify(current)) onChange(next);
    // seedVersion 이 바뀔 때만 재적용한다(프로필 전환 반영).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  function patch(partial: Partial<CodexBirthInput>) {
    onChange({ ...value, ...partial });
  }

  // 상대 칸은 프로필 카드 시드로 채우지 않는다 — 프로필 카드는 본인 명식이다.
  function patchPartner(partial: Partial<CodexPartnerInput>) {
    onChange({ ...value, partner: { ...(value.partner || EMPTY_CODEX_PARTNER), ...partial } });
  }

  function togglePartner() {
    onChange({ ...value, partner: value.partner ? null : { ...EMPTY_CODEX_PARTNER } });
  }

  const partner = value.partner;

  async function handleReload() {
    setReloading(true);
    try { await reload(); } finally { setReloading(false); }
  }

  const labelClass = "mb-1 block text-[0.6875rem] tracking-[0.2em]";
  const labelStyle = { color: "var(--codex-gold-dim)" } as const;

  return (
    // justify-center 를 쓰지 않는다 — 가치 블록이 붙어 100svh 를 넘기면 오버레이 안에서
    // 위쪽이 잘려 아래 결제 버튼까지 스크롤로 닿지 못한다.
    // 오버레이는 자체 스크롤이라 body padding 이 닿지 않는다 — 하단 고정 바(+전역 모바일
    // 네비 --cd-mnav-offset) 높이만큼 직접 비운다. 안 그러면 마지막 입력이 바에 가린다.
    <section
      className="flex min-h-[100svh] flex-col justify-start pt-16"
      style={{ paddingBottom: "calc(var(--cd-mnav-offset, 0px) + 104px)" }}
      aria-label={copy.birthGateAriaLabel}
    >
      <div className={styles.measure}>
        <CodexReveal>
          {/* 지금 어떤 상품을 진행 중인지 화면 맨 위에서 먼저 알린다 */}
          {headerSlot ? <div className="mb-8">{headerSlot}</div> : null}
          <p className={`${styles.numeral} text-[0.6875rem]`} style={{ letterSpacing: "0.28em", color: "var(--codex-gold-dim)" }}>
            THE FIRST PAGE
          </p>
          <h2 className={`${styles.chapterTitle} mt-4`}>{copy.birthGateTitle}</h2>
          <p className="mt-5 max-w-[38ch] leading-8" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
            {copy.birthGateDesc}
          </p>
          <hr className={`${styles.rule} mt-9`} />
        </CodexReveal>

        <CodexReveal index={1} className="mt-10">
          <p className={`${styles.numeral} text-[0.6875rem]`} style={{ letterSpacing: "0.24em", color: "var(--codex-gold-dim)" }}>
            {copy.crossReadEyebrow}
          </p>
          <dl className="mt-6 space-y-6">
            {CODEX_VALUE_AXES.map((axis) => (
              <div key={axis.source} className="border-l pl-5" style={{ borderColor: "var(--codex-rule)" }}>
                <dt className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className={`${styles.numeral} text-[0.875rem]`} style={{ letterSpacing: "0.1em", color: "var(--codex-gold)" }}>
                    {axis.source}
                  </span>
                  <span className="text-[0.9375rem] leading-7" style={{ color: "var(--codex-ink-text)" }}>
                    {axis.reads}
                  </span>
                </dt>
                <dd className="mt-1.5 leading-7" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
                  {axis.detail}
                </dd>
              </div>
            ))}
          </dl>

          <p className={`${styles.numeral} mt-11 text-[0.6875rem]`} style={{ letterSpacing: "0.24em", color: "var(--codex-gold-dim)" }}>
            {copy.chaptersActsEyebrow}
          </p>
          <ol className="mt-5 space-y-3">
            {CODEX_ACTS.map((act) => (
              <li key={act.order} className="flex gap-4">
                <span
                  className={`${styles.numeral} w-6 shrink-0 pt-0.5 text-[0.8125rem]`}
                  style={{ letterSpacing: "0.06em", color: "var(--codex-gold-dim)" }}
                  aria-hidden="true"
                >
                  {act.numeral}
                </span>
                <span className="min-w-0">
                  <span className="text-[0.9375rem] leading-7" style={{ color: "var(--codex-ink-text)" }}>
                    {act.title}
                  </span>
                  <span className="mt-0.5 block leading-7" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
                    {act.line}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <p className={`${styles.numeral} mt-11 text-[0.6875rem]`} style={{ letterSpacing: "0.24em", color: "var(--codex-gold-dim)" }}>
            {copy.honestNoteEyebrow}
          </p>
          <ul className="mt-5 space-y-3">
            {CODEX_HONEST_LIMITS.map((limit) => (
              <li key={limit} className="leading-7" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
                {limit}
              </li>
            ))}
          </ul>

          <hr className={`${styles.rule} mt-11`} />
        </CodexReveal>

        <CodexReveal index={2} className="mt-10 space-y-9">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleReload()}
              disabled={reloading}
              className={`${styles.quiet} inline-flex items-center gap-1.5`}
            >
              {reloading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3 w-3" aria-hidden="true" />}
              {copy.reloadFromProfileButton}
            </button>
          </div>

          <div>
            <label className={labelClass} style={labelStyle} htmlFor="codex-name">{copy.nameLabel}</label>
            <input
              id="codex-name"
              className={styles.field}
              value={value.name}
              maxLength={20}
              placeholder={copy.namePlaceholder}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </div>

          <fieldset>
            <legend className={labelClass} style={labelStyle}>{copy.genderLegend}</legend>
            <div className="flex gap-2">
              {([["female", copy.genderFemale], ["male", copy.genderMale]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={value.gender === key}
                  onClick={() => patch({ gender: key })}
                  className={`${styles.choice} flex-1`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className={labelClass} style={labelStyle} htmlFor="codex-birth-date">{copy.birthDateLabel}</label>
            <input id="codex-birth-date" className={styles.field} {...birthDateTextInputProps(value.birthDate, (nextBirthDate) => patch({ birthDate: nextBirthDate }))} />
          </div>

          <fieldset>
            <legend className={labelClass} style={labelStyle}>{copy.calendarLegend}</legend>
            <div className="flex gap-2">
              {([["solar", copy.calendarSolar], ["lunar", copy.calendarLunar]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={value.calendarType === key}
                  onClick={() => patch({ calendarType: key, isLeapMonth: key === "lunar" ? value.isLeapMonth : false })}
                  className={`${styles.choice} flex-1`}
                >
                  {label}
                </button>
              ))}
            </div>
            {value.calendarType === "lunar" ? (
              <label className="mt-3 flex items-center gap-2" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#e8d5a3]"
                  checked={value.isLeapMonth}
                  onChange={(event) => patch({ isLeapMonth: event.target.checked })}
                />
                {copy.leapMonthLabel}
              </label>
            ) : null}
          </fieldset>

          <div>
            <label className={labelClass} style={labelStyle} htmlFor="codex-birth-time">{copy.birthTimeLabel}</label>
            <input
              id="codex-birth-time"
              type="time"
              className={styles.field}
              value={value.birthTime}
              disabled={value.birthTimeUnknown}
              onChange={(event) => patch({ birthTime: event.target.value })}
            />
            <label className="mt-3 flex items-center gap-2" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#e8d5a3]"
                checked={value.birthTimeUnknown}
                onChange={(event) => patch({ birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : value.birthTime })}
              />
              {copy.birthTimeUnknownLabel}
            </label>
            <p className="mt-2 leading-7" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
              {copy.birthTimeUnknownNote}
            </p>
          </div>
        </CodexReveal>

        {/*
          궁합 전환은 사용자가 명시적으로 선택한다 — 금액이 바뀌므로(개인 → 궁합) 모르는 채
          비싼 쪽으로 넘어가면 안 된다. 아래 결제 버튼의 priceSlot 이 즉시 금액을 다시 읽어 준다.
        */}
        <CodexReveal index={3} className="mt-12">
          <hr className={styles.rule} />
          <div className="mt-9">
            <p className={`${styles.numeral} text-[0.6875rem]`} style={{ letterSpacing: "0.24em", color: "var(--codex-gold-dim)" }}>
              {copy.partnerSectionEyebrow}
            </p>
            <h3 className="mt-4 text-[1.0625rem] leading-8" style={{ color: "var(--codex-ink-text)" }}>
              {copy.partnerSectionTitle}
            </h3>
            <p className="mt-3 max-w-[38ch] leading-8" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
              {copy.partnerSectionDesc}
            </p>

            <button
              type="button"
              onClick={togglePartner}
              aria-expanded={Boolean(partner)}
              aria-controls="codex-partner-fields"
              className={`${styles.choice} mt-6 w-full`}
            >
              {partner ? copy.partnerToggleRemove : copy.partnerToggleAdd}
            </button>

            {partner ? (
              <div id="codex-partner-fields" className="mt-9 space-y-9 border-l pl-5" style={{ borderColor: "var(--codex-rule)" }}>
                <div>
                  <label className={labelClass} style={labelStyle} htmlFor="codex-partner-name">{copy.partnerNameLabel}</label>
                  <input
                    id="codex-partner-name"
                    className={styles.field}
                    value={partner.name}
                    maxLength={20}
                    placeholder={copy.partnerNamePlaceholder}
                    onChange={(event) => patchPartner({ name: event.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass} style={labelStyle} htmlFor="codex-partner-birth-date">{copy.partnerBirthDateLabel}</label>
                  <input id="codex-partner-birth-date" className={styles.field} {...birthDateTextInputProps(partner.birthDate, (nextBirthDate) => patchPartner({ birthDate: nextBirthDate }))} />
                </div>

                <fieldset>
                  <legend className={labelClass} style={labelStyle}>{copy.partnerGenderLegend}</legend>
                  <div className="flex gap-2">
                    {([["female", copy.genderFemale], ["male", copy.genderMale]] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={partner.gender === key}
                        onClick={() => patchPartner({ gender: partner.gender === key ? "" : key })}
                        className={`${styles.choice} flex-1`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className={labelClass} style={labelStyle}>{copy.partnerCalendarLegend}</legend>
                  <div className="flex gap-2">
                    {([["solar", copy.calendarSolar], ["lunar", copy.calendarLunar]] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={partner.calendarType === key}
                        onClick={() => patchPartner({ calendarType: key, isLeapMonth: key === "lunar" ? partner.isLeapMonth : false })}
                        className={`${styles.choice} flex-1`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {partner.calendarType === "lunar" ? (
                    <label className="mt-3 flex items-center gap-2" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#e8d5a3]"
                        checked={partner.isLeapMonth}
                        onChange={(event) => patchPartner({ isLeapMonth: event.target.checked })}
                      />
                      {copy.leapMonthLabel}
                    </label>
                  ) : null}
                </fieldset>

                <div>
                  <label className={labelClass} style={labelStyle} htmlFor="codex-partner-birth-time">{copy.partnerBirthTimeLabel}</label>
                  <input
                    id="codex-partner-birth-time"
                    type="time"
                    className={styles.field}
                    value={partner.birthTime}
                    disabled={partner.birthTimeUnknown}
                    onChange={(event) => patchPartner({ birthTime: event.target.value })}
                  />
                  <label className="mt-3 flex items-center gap-2" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#e8d5a3]"
                      checked={partner.birthTimeUnknown}
                      onChange={(event) => patchPartner({ birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : partner.birthTime })}
                    />
                    {copy.partnerBirthTimeUnknownLabel}
                  </label>
                  <p className="mt-2 leading-7" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
                    {copy.partnerNote}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </CodexReveal>

        {error ? (
          <p role="alert" className="mt-9 leading-8" style={{ fontSize: "var(--codex-caption)", color: "#ffb4b4" }}>{error}</p>
        ) : null}

        {/* 결제가 붙은 버튼이다 — 누르기 전에 금액이 버튼 안에서 보여야 한다.
            문구는 "결과 보기" 하나로 유지한다(가격은 priceSlot 이 서버에서 읽어 온다). */}
        <CodexReveal index={4} className="mt-12 flex flex-col items-center gap-5">
          <button type="button" onClick={onSubmit} disabled={busy} className={styles.cta}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? busyLabel : (
              <>
                {priceSlot}
                <span aria-hidden="true">·</span>
                {copy.submitButton}
              </>
            )}
          </button>
          <p className={`${styles.numeral} text-[0.75rem]`} style={{ letterSpacing: "0.14em", color: "var(--codex-gold-dim)" }}>
            {copy.paymentDisclosure}
          </p>
        </CodexReveal>
      </div>

      {floatingCta}
    </section>
  );
}
