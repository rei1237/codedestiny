'use client';

import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

const NIGHT_REFLECTION_TEXT_TRANSLATIONS = {
  ko: {
    "nightReflection.blueprintWealth": "재물 흐름 설계",
    "nightReflection.blueprintLove": "관계 기운 정돈",
    "nightReflection.blueprintHealth": "회복력 강화",
    "nightReflection.blueprintFocus": "집중/성과 모드",
    "nightReflection.notePlaceholder": "실천하면서 느낀 변화, 막혔던 사인, 내일 보완할 점을 기록해보세요.",
    "nightReflection.originalPlaceholder": "오늘의 부정적 사건",
    "nightReflection.imaginedPlaceholder": "원하는 전개로 수정한 장면",
    "nightReflection.audioLofi": "Lofi 밤",
    "nightReflection.audioTheta": "Theta 밤",
    "nightReflection.affirmationPlaceholder": "문장을 그대로 타이핑해보세요",
  },
} as const;

function nightReflectionText(key: keyof typeof NIGHT_REFLECTION_TEXT_TRANSLATIONS.ko): string {
  return NIGHT_REFLECTION_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

type ActionItem = {
  id: string;
  text: string;
};

type BlueprintTheme = {
  id: 'wealth' | 'love' | 'health' | 'focus';
  label: string;
  icon: string;
};

const BLUEPRINTS: BlueprintTheme[] = [
  { id: 'wealth', label: nightReflectionText("nightReflection.blueprintWealth"), icon: '💰' },
  { id: 'love', label: nightReflectionText("nightReflection.blueprintLove"), icon: '💞' },
  { id: 'health', label: nightReflectionText("nightReflection.blueprintHealth"), icon: '🍃' },
  { id: 'focus', label: nightReflectionText("nightReflection.blueprintFocus"), icon: '🎯' }
];

const DEFAULT_ACTIONS: ActionItem[] = [
  { id: 'a1', text: '오전 핵심 할 일 1개 먼저 처리' },
  { id: 'a2', text: '15분 집중 세션 1회 실행' },
  { id: 'a3', text: '자기 전 30분 디지털 디톡스' },
  { id: 'a4', text: '수분/호흡 루틴으로 기운 정리' },
  { id: 'a5', text: '내일 우선순위 1개 예약' }
];

function buildCoachAdvice(done: ActionItem[], pending: ActionItem[], note: string, theme?: string) {
  const doneText = done[0]?.text ?? '핵심 루틴 1개';
  const pendingText = pending[0]?.text ?? '디지털 디톡스';
  const themeLabel = BLUEPRINTS.find((b) => b.id === theme)?.label ?? '핵심 루틴';
  const noteSummary = note.trim()
    ? `메모 흐름: ${note.trim().slice(0, 60)}${note.trim().length > 60 ? '...' : ''}`
    : '메모가 짧아 아직 데이터가 적습니다. 내일은 체감 포인트를 한 줄 더 남겨주세요.';

  return [
    `오늘 ${doneText}를 실천하셨으니, 내일은 집중 기운이 올라오는 시간대에 ${themeLabel} 액션을 먼저 배치하면 시너지가 커집니다.`,
    `보완 포인트는 ${pendingText}입니다. 같은 루틴을 같은 시간에 고정하면 운의 변동폭이 줄어듭니다.`,
    noteSummary
  ];
}

export default function NightReflectionPlanner() {
  const [checked, setChecked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [theme, setTheme] = useState<BlueprintTheme['id'] | ''>('');
  const [coachLines, setCoachLines] = useState<string[]>([]);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [revisionOriginal, setRevisionOriginal] = useState('');
  const [revisionImagined, setRevisionImagined] = useState('');
  const [revisionSec, setRevisionSec] = useState(60);
  const [revisionRunning, setRevisionRunning] = useState(false);
  const [revisionDone, setRevisionDone] = useState(0);
  const [satsScene, setSatsScene] = useState('원하는 결과가 이미 완료된 단 하나의 장면을 추천받아 몰입하세요.');
  const [satsSceneIndex, setSatsSceneIndex] = useState(-1);
  const [satsMode, setSatsMode] = useState(false);
  const [satsAudioMode, setSatsAudioMode] = useState<'lofi' | 'theta'>('lofi');
  const [affirmation, setAffirmation] = useState('나는 오늘 운의 흐름을 선택하고 실천하는 사람이다.');
  const [affirmationInput, setAffirmationInput] = useState('');
  const [iamDone, setIamDone] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const doneCount = checked.length;
  const effort = Math.round((doneCount / DEFAULT_ACTIONS.length) * 100);
  const meditationPoints = Math.min(100, revisionDone * 12 + (satsMode ? 20 : 0) + (iamDone ? 18 : 0));

  const doneItems = useMemo(() => DEFAULT_ACTIONS.filter((item) => checked.includes(item.id)), [checked]);
  const pendingItems = useMemo(() => DEFAULT_ACTIONS.filter((item) => !checked.includes(item.id)), [checked]);

  const confettiBits = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({ id: i, left: 35 + (i * 2.1) % 30, delay: (i % 8) * 40 })),
    []
  );

  const toggleAction = (id: string) => {
    setChecked((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];
      if (!has) {
        setShowConfetti(true);
        window.setTimeout(() => setShowConfetti(false), 900);
      }
      return next;
    });
  };

  const generateCoach = async () => {
    setLoadingCoach(true);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    setCoachLines(buildCoachAdvice(doneItems, pendingItems, note, theme || undefined));
    setLoadingCoach(false);
  };

  const tomorrowKeyword = useMemo(() => {
    const map: Record<string, string> = {
      wealth: '재물운 상승',
      love: '귀인 상봉',
      health: '회복력 강화',
      focus: '집중 성과 실현'
    };
    return map[theme] ?? '귀인 상봉';
  }, [theme]);

  const generateSatsScene = () => {
    const sceneByKeyword: Record<string, string[]> = {
      '재물운 상승': [
        '당신은 이미 재정적으로 안정된 상태입니다. 잔액 확인 후 안도하며 미소 짓는 장면에 머무르세요.',
        '입금 알림이 연속으로 도착하고 월간 목표를 체크하는 장면을 선명하게 떠올리세요.',
        '계획한 지출을 깔끔히 정리하고 여유 자금이 생긴 표정을 느껴보세요.'
      ],
      '귀인 상봉': [
        '당신은 이미 필요한 도움을 받았습니다. 고마운 눈빛과 따뜻한 악수의 감각을 느끼세요.',
        '정확한 조언을 주는 사람과 대화가 자연스럽게 이어지는 장면을 반복하세요.',
        '막혔던 일이 연락 한 통으로 풀리며 미소 짓는 순간을 상상하세요.'
      ],
      '회복력 강화': [
        '당신은 이미 활력으로 가득합니다. 가벼운 몸으로 아침 공기를 들이마시는 감각에 집중하세요.',
        '어깨 힘이 풀리고 호흡이 깊어지며 몸이 따뜻해지는 장면에 머무르세요.',
        '숙면 후 눈을 뜨자마자 개운함이 퍼지는 감각을 디테일하게 상상하세요.'
      ],
      '집중 성과 실현': [
        '당신은 이미 중요한 일을 완수했습니다. 전송 완료 후 깊게 안도하는 순간을 반복하세요.',
        '핵심 과제를 먼저 끝내고 체크 표시가 쌓이는 화면을 또렷하게 떠올리세요.',
        '회의에서 준비한 포인트를 정확히 전달해 신뢰를 얻는 장면을 느껴보세요.'
      ]
    };
    const pool = sceneByKeyword[tomorrowKeyword] ?? sceneByKeyword['귀인 상봉'];
    let nextIdx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && nextIdx === satsSceneIndex) {
      nextIdx = (nextIdx + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    }
    setSatsSceneIndex(nextIdx);
    setSatsScene(pool[nextIdx]);
  };

  const regenerateIam = () => {
    const map: Record<string, string> = {
      '재물운 상승': '나는 오늘 흐름을 읽고 부를 다루는 사람이다.',
      '귀인 상봉': '나는 오늘 좋은 인연을 자연스럽게 끌어당기는 사람이다.',
      '회복력 강화': '나는 오늘 안정된 호흡과 체력으로 중심을 지키는 사람이다.',
      '집중 성과 실현': '나는 오늘 가장 중요한 일을 끝까지 완성하는 사람이다.'
    };
    setAffirmation(map[tomorrowKeyword] ?? '나는 오늘 운의 흐름을 선택하고 실천하는 사람이다.');
    setIamDone(false);
    setAffirmationInput('');
  };

  const startRevision = () => {
    if (!revisionImagined.trim()) return;
    setRevisionRunning(true);
    setRevisionSec(60);
  };

  useEffect(() => {
    if (!revisionRunning) return;
    timerRef.current = window.setInterval(() => {
      setRevisionSec((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setRevisionRunning(false);
          setRevisionDone((v) => v + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [revisionRunning]);

  useEffect(() => {
    if (!satsMode) {
      if (audioRef.current) {
        audioRef.current.close().catch(() => undefined);
        audioRef.current = null;
      }
      return;
    }
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    audioRef.current = ctx;
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const gain = ctx.createGain();
    oscA.type = 'sine';
    oscB.type = 'sine';
    if (satsAudioMode === 'theta') {
      oscA.frequency.value = 220;
      oscB.frequency.value = 224;
    } else {
      oscA.frequency.value = 196;
      oscB.frequency.value = 198.2;
    }
    gain.gain.value = 0.03;
    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(ctx.destination);
    oscA.start();
    oscB.start();
    return () => {
      oscA.stop();
      oscB.stop();
      gain.disconnect();
      ctx.close().catch(() => undefined);
    };
  }, [satsMode, satsAudioMode]);

  const confirmIam = () => {
    const ok = affirmationInput.trim() === affirmation.trim();
    setIamDone(ok);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-sky-50 to-blue-50 p-5 shadow-sm sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-200/40 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-indigo-200/40 blur-2xl" />

      {showConfetti && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {confettiBits.map((bit) => (
            <span
              key={bit.id}
              className="absolute top-1/2 h-3 w-2 animate-[fall_900ms_ease-out_forwards] rounded-sm bg-cyan-400"
              style={{ left: `${bit.left}%`, animationDelay: `${bit.delay}ms` }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 space-y-4">
        <header>
          <p className="text-xs font-black tracking-[0.22em] text-cyan-700">NIGHT LUCK DESIGN</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">운 개선 실천 회고</h3>
          <p className="mt-1 text-sm text-slate-600">적중률 체크 대신, 오늘의 실천 데이터를 내일 설계로 연결합니다.</p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-black text-slate-900">1) Action Checklist</p>
          <div className="mt-2 grid gap-2">
            {DEFAULT_ACTIONS.map((item) => {
              const active = checked.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleAction(item.id)}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? 'border-cyan-300 bg-cyan-50'
                      : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-black ${
                      active ? 'border-cyan-400 bg-cyan-100 text-cyan-700' : 'border-slate-300 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{item.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-black text-slate-900">2) Effort Gauge</p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${effort}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-bold text-slate-600">오늘 실천도 {effort}% ({doneCount}/{DEFAULT_ACTIONS.length})</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-black text-slate-900">3) Reflection Note</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={500}
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
            placeholder={nightReflectionText("nightReflection.notePlaceholder")}
          />
          <p className="mt-1 text-right text-xs text-slate-400">{note.length}/500</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black text-slate-900">4) AI Luck Coach</p>
            <button
              type="button"
              onClick={generateCoach}
              disabled={loadingCoach}
              className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700 transition hover:bg-sky-100 disabled:opacity-60"
            >
              {loadingCoach ? '분석 중...' : '전문가 코칭 생성'}
            </button>
          </div>
          <div
            className={`mt-2 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-3 text-sm leading-6 text-slate-700 ${
              loadingCoach ? 'animate-pulse' : ''
            }`}
          >
            {loadingCoach && '실천 데이터를 분석하고 개운 설계 문장을 만들고 있어요...'}
            {!loadingCoach && coachLines.length === 0 &&
              '실천 체크와 메모를 입력한 뒤 전문가 코칭 생성 버튼을 눌러주세요. 내일의 운 흐름에 맞춘 설계를 제안합니다.'}
            {!loadingCoach && coachLines.length > 0 && (
              <ul className="space-y-1">
                {coachLines.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-black text-slate-900">5) Tomorrow Blueprint</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BLUEPRINTS.map((bp) => {
              const active = theme === bp.id;
              return (
                <button
                  key={bp.id}
                  type="button"
                  onClick={() => setTheme(bp.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                    active
                      ? 'border-transparent bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50'
                  }`}
                >
                  {bp.icon} {bp.label}
                </button>
              );
            })}
          </div>
        </div>

        <m.div
          className="rounded-2xl border border-slate-200 bg-white p-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <p className="text-xs font-black text-slate-900">6) 운명 개척 명상 가이드</p>

          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-800">수정의 가위 (Nightly Revision)</p>
            <textarea
              value={revisionOriginal}
              onChange={(e) => setRevisionOriginal(e.target.value)}
              rows={2}
              maxLength={220}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
              placeholder={nightReflectionText("nightReflection.originalPlaceholder")}
            />
            <textarea
              value={revisionImagined}
              onChange={(e) => setRevisionImagined(e.target.value)}
              rows={2}
              maxLength={220}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
              placeholder={nightReflectionText("nightReflection.imaginedPlaceholder")}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={startRevision}
                className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-black text-cyan-700"
              >
                1분 상상 시작
              </button>
              <span className="text-xs font-black text-slate-700">{String(Math.floor(revisionSec / 60)).padStart(2, '0')}:{String(revisionSec % 60).padStart(2, '0')}</span>
            </div>
            <p className="mt-2 text-xs text-slate-600">이제 눈을 감고 수정된 장면이 실제 사실인 것처럼 반복해서 상상하세요. 완료 {revisionDone}회</p>
          </div>

          <m.div
            className={`mt-3 rounded-xl border p-3 transition ${satsMode ? 'border-indigo-400 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800'}`}
            animate={{ scale: satsMode ? [1, 1.01, 1] : 1 }}
            transition={{ repeat: satsMode ? Infinity : 0, duration: 4, ease: 'easeInOut' }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black">SATS 시각화</p>
              <button
                type="button"
                onClick={generateSatsScene}
                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-black"
              >
                장면 추천
              </button>
            </div>
            <p className="mt-1 text-[11px]">내일 키워드: {tomorrowKeyword}</p>
            <AnimatePresence mode="wait">
              <m.p
                key={satsScene}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="mt-2 rounded-lg border border-slate-300/40 bg-white/10 p-2 text-xs leading-5"
              >
                {satsScene}
              </m.p>
            </AnimatePresence>

            <m.p
              className="mt-2 text-center text-xs font-semibold"
              animate={{ opacity: [0.45, 1, 0.45], scale: [0.99, 1.02, 0.99] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            >
              당신은 이미 이루어진 상태입니다. 감각에만 집중하며 잠드세요.
            </m.p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={satsAudioMode}
                onChange={(e) => setSatsAudioMode(e.target.value as 'lofi' | 'theta')}
                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-700"
              >
                <option value="lofi">{nightReflectionText("nightReflection.audioLofi")}</option>
                <option value="theta">{nightReflectionText("nightReflection.audioTheta")}</option>
              </select>
              <button
                type="button"
                onClick={() => setSatsMode(true)}
                className="rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-[11px] font-black text-indigo-700"
              >
                몰입 시작
              </button>
              <button
                type="button"
                onClick={() => setSatsMode(false)}
                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-black"
              >
                종료
              </button>
            </div>
          </m.div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-800">아침 I AM 선언</p>
            <p className="mt-2 rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-xs font-black text-slate-800">{affirmation}</p>
            <input
              value={affirmationInput}
              onChange={(e) => setAffirmationInput(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
              placeholder={nightReflectionText("nightReflection.affirmationPlaceholder")}
            />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={regenerateIam} className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-black">문구 새로고침</button>
              <button type="button" onClick={confirmIam} className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">선언 완료</button>
            </div>
            <p className="mt-2 text-xs text-slate-600">{iamDone ? '확언 완료: 오늘의 정체성이 기록되었습니다.' : '확언 문장을 동일하게 입력하면 완료됩니다.'}</p>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black">운세 실천 지수 연동</p>
              <span className="text-xs font-black text-cyan-300">명상 포인트 {meditationPoints}</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-300">명상 중에는 기기 방해 금지 모드를 켜고 전체화면으로 전환하면 몰입감이 올라갑니다.</p>
          </div>
        </m.div>
      </div>

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(220px) rotate(420deg);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}
