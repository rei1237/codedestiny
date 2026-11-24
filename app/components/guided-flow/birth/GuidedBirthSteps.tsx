'use client';

// 공용 출생 정보 입력 단계 묶음(W1). GuidedFlowShell 의 renderStep 안에서 출생 단계만 그린다.
// 순서·답 형식은 birth-steps.ts. 흐름(호스트)은 birthSteps(config) 뒤에 계산·결과 단계를 붙이고,
// 출생 단계가 아니면 null 을 돌려받아 자기 단계를 그린다.
// 태어난 장소 입력(BirthPlaceInput)은 그 단계에서만 늦게 불러 다른 흐름의 CSS 를 늘리지 않는다.
import { type ClipboardEvent, type KeyboardEvent, type ReactNode, Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import SavedBirthProfilePicker from '@/app/components/SavedBirthProfilePicker';
import { GuidedChoiceList } from '../GuidedFlowShell';
import type { GuidedFlow, GuidedStep } from '../useGuidedFlow';
import { useGuidedT } from '../useGuidedT';
import { formatBirthTime, maskBirthTimeInput, normalizeBirthTime } from '@/lib/birthTimeInput';
import {
  BIRTH_CONFIRM, type BirthField, type BirthProfileSeed, type BirthStepsConfig, type DateParts, SIJIN,
  birthAnswersFromSeed, birthDateText, dateFromParts, isBirthField, maskBirthDate, nextBirthStepAfterProfile, placeAnswer,
  readBirthAnswers, sijinForValue, splitBirthDate,
} from './birth-steps';
import styles from './guided-birth.module.css';

const BirthPlaceInput = lazy(() => import('@/app/components/BirthPlaceInput'));

export type GuidedBirthOptions = BirthStepsConfig & {
  /** 입력 id 접두어(한 화면에 흐름이 둘이어도 겹치지 않게). */
  idPrefix: string;
  /** 첫 출생 단계 위에 저장 프로필 고르기를 보인다. */
  profile?: boolean;
  /** 프로필을 고른 뒤 호스트가 할 일(원본 onSelect). 돌려준 답은 프로필 기본 매핑 위에 덮어쓴다. */
  onProfile?: (seed: BirthProfileSeed, profile: PickerProfile) => void | Record<string, string> | Promise<void | Record<string, string>>;
  /** false 면 프로필 기본 매핑(birthAnswersFromSeed)을 쓰지 않는다 — 호스트가 값을 바꿔 담는 경우(예: 음력→양력) 호스트 값이 답으로 흘러온다. */
  profileFill?: boolean;
  /** 성별에 '밝히지 않을래요'(unknown)를 둔다(기본 true). */
  genderUnknown?: boolean;
  nameMaxLength?: number;
  /** 생년월일 입력 모양. 'single' 은 한 칸(숫자만 누르면 0000.00.00), 기본은 년·월·일 세 칸. 판정(dateFromParts)·답 형식은 같다. */
  dateInput?: 'segments' | 'single';
  /** 태어난 장소. 기본 'lookup' 은 위치 조회(/api/geocode)로 경도·시간대를 확인한다.
   *  'record' 는 적은 글자만 남기고 확인 요약에 보인다 — 계산에 장소를 쓰지 않는 흐름용(조회·서버 전송 없음). */
  placeMode?: 'lookup' | 'record';
  /** 확인 요약 아래 '브라우저에서만 계산' 안내. 출생 정보를 서버로 보내지 않는 흐름만 켠다. */
  localNote?: boolean;
};

type T = ReturnType<typeof useGuidedT>;
type PickerProfile = Parameters<Parameters<typeof SavedBirthProfilePicker>[0]['onSelect']>[1];

/** 출생 단계 제목과 확인 단계 CTA('확인'). 호스트 제목이 있으면 호스트 쪽이 이긴다(호스트에서 펼쳐 덮어쓴다). */
export function guidedBirthTitles(t: T): Record<string, string> {
  return {
    name: t('birth.nameTitle'), gender: t('birth.genderTitle'), date: t('birth.dateTitle'), calendar: t('birth.calendarTitle'),
    time: t('birth.timeTitle'), place: t('birth.placeTitle'), [BIRTH_CONFIRM]: t('birth.confirmTitle'),
  };
}
export function guidedBirthCtaLabels(t: T): Record<string, string> {
  return { [BIRTH_CONFIRM]: t('birth.confirmCta') };
}

type StepProps = { flow: GuidedFlow; step: GuidedStep; options: GuidedBirthOptions };

/** 출생 단계면 그 화면, 아니면 null. */
export function GuidedBirthStep({ flow, step, options }: StepProps) {
  const t = useGuidedT();
  const id = step.id;
  if (id !== BIRTH_CONFIRM && !isBirthField(id)) return null;
  const firstField = flow.controller.steps.find((item: GuidedStep) => isBirthField(item.id))?.id;
  const picker = options.profile && id === firstField ? <ProfilePicker flow={flow} options={options} /> : null;
  let body: ReactNode = null;
  if (id === 'name') body = <NameStep flow={flow} options={options} t={t} />;
  else if (id === 'gender') body = <GuidedChoiceList flow={flow} label={t('birth.genderTitle')} options={[
    { value: 'female', label: t('birth.female') },
    { value: 'male', label: t('birth.male') },
    ...(options.genderUnknown === false ? [] : [{ value: 'unknown', label: t('birth.genderUnknown') }]),
  ]} />;
  else if (id === 'date') body = options.dateInput === 'single' ? <DateSingleStep flow={flow} options={options} t={t} /> : <DateStep flow={flow} options={options} t={t} />;
  else if (id === 'calendar') body = <GuidedChoiceList flow={flow} label={t('birth.calendarTitle')} options={[
    { value: 'solar', label: t('birth.solar') },
    { value: 'lunar', label: t('birth.lunar') },
    { value: 'leap', label: t('birth.leap'), hint: t('birth.leapHint') },
  ]} />;
  else if (id === 'time') body = <TimeStep flow={flow} options={options} t={t} />;
  else if (id === 'place') body = options.placeMode === 'record' ? <PlaceRecordStep flow={flow} options={options} t={t} /> : <PlaceStep flow={flow} options={options} t={t} />;
  else body = <ConfirmStep flow={flow} options={options} t={t} />;
  return <div className={styles.step}>{picker}{body}</div>;
}

function ProfilePicker({ flow, options }: { flow: GuidedFlow; options: GuidedBirthOptions }) {
  const { controller } = flow;
  const onSelect = useCallback(async (seed: BirthProfileSeed, profile: PickerProfile) => {
    const extra = await options.onProfile?.(seed, profile);
    controller.mergeAnswers({ ...(options.profileFill === false ? {} : birthAnswersFromSeed(seed, options.fields)), ...(extra || {}) });
    const target = nextBirthStepAfterProfile(controller.steps, controller.getState().answers);
    if (target) controller.goTo(target);
  }, [controller, options]);
  return <SavedBirthProfilePicker onSelect={onSelect} />;
}

const advanceOnEnter = (flow: GuidedFlow) => (event: KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter') { event.preventDefault(); flow.controller.next('cta'); }
};

function NameStep({ flow, options, t }: { flow: GuidedFlow; options: GuidedBirthOptions; t: T }) {
  const max = options.nameMaxLength ?? 20;
  const inputId = `${options.idPrefix}-name`;
  return <>
    <label className={styles.label} htmlFor={inputId}>{t('birth.nameLabel')}</label>
    <input id={inputId} name="name" className={styles.field} maxLength={max} autoComplete="nickname" enterKeyHint="next"
      placeholder={t('birth.namePlaceholder')} value={String(flow.state.answers.name || '')}
      onChange={(event) => flow.controller.setAnswer(event.target.value.slice(0, max))} onKeyDown={advanceOnEnter(flow)} />
    <p className={styles.hint}>{t('birth.nameHint')}</p>
  </>;
}

/* ── 생년월일: 년·월·일 숫자 칸. 칸이 차면 다음 칸으로, 빈 칸에서 지우면 앞 칸으로, 8자리 붙여넣기는 나눠 담는다. ── */
const SEGMENTS: { key: keyof DateParts; size: number }[] = [{ key: 'year', size: 4 }, { key: 'month', size: 2 }, { key: 'day', size: 2 }];

function DateStep({ flow, options, t }: { flow: GuidedFlow; options: GuidedBirthOptions; t: T }) {
  const answer = String(flow.state.answers.date || '');
  const [parts, setParts] = useState<DateParts>(() => splitBirthDate(answer));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const groupId = useId();
  const errorId = `${options.idPrefix}-date-error`;
  // 바깥(저장 프로필)에서 답이 바뀌면 칸을 다시 채운다. 입력 중 미완성 칸은 답이 ''라 건드리지 않는다.
  useEffect(() => {
    if (answer && dateFromParts(parts).value !== answer) setParts(splitBirthDate(answer));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- parts 는 비교용으로만 읽는다
  }, [answer]);
  const verdict = dateFromParts(parts);

  const update = (next: DateParts, focusIndex?: number) => {
    setParts(next);
    flow.controller.setAnswer(dateFromParts(next).value);
    if (focusIndex !== undefined) refs.current[focusIndex]?.focus();
  };
  const onChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (index === 0 && digits.length > 4) {
      update({ year: digits.slice(0, 4), month: digits.slice(4, 6), day: digits.slice(6, 8) }, digits.length >= 8 ? 2 : 1);
      return;
    }
    const { key, size } = SEGMENTS[index];
    const value = digits.slice(0, size);
    const next = { ...parts, [key]: value };
    const done = value.length === size || (key === 'month' && Number(value) > 1) || (key === 'day' && Number(value) > 3);
    update(next, done && index < 2 ? index + 1 : undefined);
  };
  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !event.currentTarget.value && index > 0) { event.preventDefault(); refs.current[index - 1]?.focus(); return; }
    if (event.key === 'Enter') { event.preventDefault(); flow.controller.next('cta'); }
  };
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '');
    if (digits.length !== 8) return;
    event.preventDefault();
    update({ year: digits.slice(0, 4), month: digits.slice(4, 6), day: digits.slice(6, 8) }, 2);
  };

  return <>
    <p className={styles.label} id={groupId}>{t('birth.dateLabel')}</p>
    <div className={styles.segments} role="group" aria-labelledby={groupId}>
      {SEGMENTS.map(({ key, size }, index) => (
        <label key={key} className={styles.segment} data-size={size}>
          <input
            ref={(node) => { refs.current[index] = node; }}
            id={`${options.idPrefix}-date-${key}`}
            name={`birth-${key}`}
            className={styles.segmentInput}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={`bday-${key}`}
            enterKeyHint={index < 2 ? 'next' : 'done'}
            maxLength={index === 0 ? 10 : size}
            placeholder={t(`birth.${key}Placeholder`)}
            aria-label={t(`birth.${key}`)}
            aria-invalid={verdict.invalid || undefined}
            aria-describedby={verdict.invalid ? errorId : undefined}
            value={parts[key]}
            onChange={(event) => onChange(index, event.target.value)}
            onKeyDown={onKeyDown(index)}
            onPaste={index === 0 ? onPaste : undefined}
          />
          <span className={styles.unit} aria-hidden="true">{t(`birth.${key}`)}</span>
        </label>
      ))}
    </div>
    {verdict.invalid
      ? <p className={styles.error} id={errorId} role="alert">{t('birth.dateInvalid')}</p>
      : <p className={styles.hint}>{t('birth.dateHint')}</p>}
  </>;
}

/* ── 생년월일 한 칸: 숫자만 누르면 점이 들어간다(0000.00.00). 판정은 세 칸과 같은 dateFromParts(1900년 ~ 오늘). ── */
function DateSingleStep({ flow, options, t }: { flow: GuidedFlow; options: GuidedBirthOptions; t: T }) {
  const answer = String(flow.state.answers.date || '');
  const [text, setText] = useState(() => birthDateText(answer));
  const inputId = `${options.idPrefix}-date`;
  const errorId = `${options.idPrefix}-date-error`;
  const hintId = `${options.idPrefix}-date-hint`;
  // 바깥(저장 프로필)에서 답이 바뀌면 칸을 다시 채운다. 입력 중 미완성·잘못된 값은 답이 ''라 건드리지 않는다.
  useEffect(() => {
    if (answer && dateFromParts(maskBirthDate(text).parts).value !== answer) setText(birthDateText(answer));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- text 는 비교용으로만 읽는다
  }, [answer]);
  const verdict = dateFromParts(maskBirthDate(text).parts);
  return <>
    <label className={styles.label} htmlFor={inputId}>{t('birth.dateLabel')}</label>
    <input id={inputId} name="birth-date" className={`${styles.field} ${styles.dateField}`} type="text" inputMode="numeric"
      autoComplete="bday" enterKeyHint="next" maxLength={20} placeholder={t('birth.dateSinglePlaceholder')}
      aria-invalid={verdict.invalid || undefined} aria-describedby={verdict.invalid ? errorId : hintId} value={text}
      onChange={(event) => { const masked = maskBirthDate(event.target.value); setText(masked.text); flow.controller.setAnswer(dateFromParts(masked.parts).value); }}
      onKeyDown={advanceOnEnter(flow)} />
    {verdict.invalid
      ? <p className={styles.error} id={errorId} role="alert">{t('birth.dateInvalid')}</p>
      : <p className={styles.hint} id={hintId}>{t('birth.dateSingleHint')}</p>}
  </>;
}

/* ── 태어난 시각: 12지 시진 칩 + 직접 입력 + '시간을 몰라요' ── */
function TimeStep({ flow, options, t }: { flow: GuidedFlow; options: GuidedBirthOptions; t: T }) {
  const answer = String(flow.state.answers.time || '');
  const chip = sijinForValue(answer);
  const [text, setText] = useState(() => (chip ? '' : formatBirthTime(answer)));
  const inputId = `${options.idPrefix}-time`;
  const errorId = `${options.idPrefix}-time-error`;
  const invalid = Boolean(text) && !normalizeBirthTime(text);
  return <>
    <p className={styles.label}>{t('birth.sijinLabel')}</p>
    <div className={styles.sijin} role="group" aria-label={t('birth.sijinLabel')}>
      {SIJIN.map((item) => (
        <button key={item.key} type="button" className={styles.chip} aria-pressed={chip?.key === item.key}
          onClick={() => { setText(''); flow.controller.setAnswer(chip?.key === item.key ? '' : item.value); }}>
          <span className={styles.chipLabel}>{t(`birth.sijin.${item.key}`)}</span>
          <span className={styles.chipHint}>{item.from}~{item.to}</span>
        </button>
      ))}
    </div>
    <p className={styles.hint}>{t('birth.sijinLateHint')}</p>
    <label className={styles.label} htmlFor={inputId}>{t('birth.timeLabel')}</label>
    <input id={inputId} name="time" className={styles.field} type="text" inputMode="numeric" autoComplete="off" enterKeyHint="next"
      maxLength={5} placeholder={t('birth.timePlaceholder')} value={text}
      aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : undefined}
      onChange={(event) => { const masked = maskBirthTimeInput(event.target.value); setText(masked); flow.controller.setAnswer(normalizeBirthTime(masked)); }}
      onKeyDown={advanceOnEnter(flow)} />
    {invalid ? <p className={styles.error} id={errorId} role="alert">{t('birth.timeInvalid')}</p> : <p className={styles.hint}>{t('birth.timeHint')}</p>}
    <button type="button" className={styles.unknown} onClick={() => { setText(''); flow.controller.setAnswer(''); flow.controller.next('cta'); }}>
      {t('birth.timeUnknown')}
    </button>
  </>;
}

/* ── 태어난 장소(선택): 비우면 지금처럼 서울 경도 기준. ── */
function PlaceStep({ flow, options, t }: { flow: GuidedFlow; options: GuidedBirthOptions; t: T }) {
  const current = readBirthAnswers(flow.state.answers);
  const text = useRef(current.placeText);
  text.current = current.placeText;
  return <>
    <Suspense fallback={<p className={styles.hint}>{t('birth.placeLoading')}</p>}>
      <BirthPlaceInput
        id={`${options.idPrefix}-place`}
        value={current.placeText}
        confirmed={Boolean(current.place)}
        label={t('birth.placeLabel')}
        placeholder={t('birth.placePlaceholder')}
        onChange={(value) => { text.current = value; flow.controller.setAnswer(placeAnswer(value, null)); }}
        onResolved={(resolved) => flow.controller.setAnswer(placeAnswer(text.current, resolved))}
      />
    </Suspense>
    <p className={styles.hint}>{t('birth.placeHint')}</p>
  </>;
}

/* ── 태어난 장소(기록만): 적은 글자를 확인 요약에 남긴다. 계산에 쓰지 않고 위치 조회도 하지 않는다. 모르면 건너뛴다. ── */
const PLACE_MAX = 60;
function PlaceRecordStep({ flow, options, t }: { flow: GuidedFlow; options: GuidedBirthOptions; t: T }) {
  const current = readBirthAnswers(flow.state.answers);
  const inputId = `${options.idPrefix}-place`;
  return <>
    <label className={styles.label} htmlFor={inputId}>{t('birth.placeLabel')}</label>
    <input id={inputId} name="birth-place" className={styles.field} type="text" maxLength={PLACE_MAX} autoComplete="off" enterKeyHint="next"
      placeholder={t('birth.placePlaceholder')} value={current.placeText}
      onChange={(event) => flow.controller.setAnswer(placeAnswer(event.target.value.slice(0, PLACE_MAX), null))} onKeyDown={advanceOnEnter(flow)} />
    <p className={styles.hint}>{t('birth.placeRecordHint')}</p>
    <button type="button" className={styles.unknown} onClick={() => { flow.controller.setAnswer([]); flow.controller.next('cta'); }}>
      {t('birth.placeSkip')}
    </button>
  </>;
}

/* ── 확인 요약: 줄마다 '수정하기'(그 단계로 이동), 하단 CTA '확인'. ── */
function ConfirmStep({ flow, options, t }: { flow: GuidedFlow; options: GuidedBirthOptions; t: T }) {
  const answers = readBirthAnswers(flow.state.answers);
  const fields = flow.controller.steps.map((item: GuidedStep) => item.id).filter(isBirthField) as BirthField[];
  const value = (field: BirthField): string => {
    if (field === 'name') return answers.name || t('birth.empty');
    if (field === 'gender') return answers.gender === 'female' ? t('birth.female') : answers.gender === 'male' ? t('birth.male') : t('birth.genderUnknown');
    if (field === 'date') {
      const parts = splitBirthDate(answers.date);
      return parts.year ? t('birth.dateFormat', { y: parts.year, m: Number(parts.month), d: Number(parts.day) }) : t('birth.empty');
    }
    if (field === 'calendar') return answers.calendar ? t(`birth.${answers.calendar}`) : t('birth.empty');
    if (field === 'time') {
      if (!answers.time) return t('birth.timeUnknownValue');
      const chip = sijinForValue(answers.time);
      return chip ? `${t(`birth.sijin.${chip.key}`)} (${chip.from}~${chip.to})` : answers.time;
    }
    if (options.placeMode === 'record') return answers.placeText.trim() ? t('birth.placeRecorded', { place: answers.placeText.trim() }) : t('birth.placeDefault');
    return answers.place ? (answers.place.name || answers.place.text) : t('birth.placeDefault');
  };
  const rows = useMemo(() => fields, [fields.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className={styles.summary} aria-labelledby="gf-birth-summary">
      <h3 className={styles.summaryTitle} id="gf-birth-summary">{t('birth.summaryTitle')}</h3>
      <dl className={styles.rows}>
        {rows.map((field) => (
          <div key={field} className={styles.row}>
            <dt className={styles.rowLabel}>{t(`birth.row.${field}`)}</dt>
            <dd className={styles.rowValue}>{value(field)}</dd>
            <dd className={styles.rowAction}>
              <button type="button" className={styles.edit} aria-label={t('birth.editAria', { label: t(`birth.row.${field}`) })}
                onClick={() => flow.controller.goTo(field)}>
                {t('birth.edit')}
              </button>
            </dd>
          </div>
        ))}
      </dl>
      {options.localNote ? <p className={styles.hint}>{t('birth.localNote')}</p> : null}
    </section>
  );
}
