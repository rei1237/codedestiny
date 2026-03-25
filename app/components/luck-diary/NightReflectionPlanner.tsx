'use client';

import { useMemo, useState } from 'react';

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
  { id: 'wealth', label: '재물 흐름 설계', icon: '💰' },
  { id: 'love', label: '관계 기운 정돈', icon: '💞' },
  { id: 'health', label: '회복력 강화', icon: '🫀' },
  { id: 'focus', label: '집중/성과 모드', icon: '🎯' }
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

  const doneCount = checked.length;
  const effort = Math.round((doneCount / DEFAULT_ACTIONS.length) * 100);

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
            placeholder="실천하면서 느낀 변화, 막혔던 포인트, 내일 보완할 점을 기록해보세요."
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
              {loadingCoach ? '분석 중...' : 'AI 코칭 생성'}
            </button>
          </div>
          <div
            className={`mt-2 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-3 text-sm leading-6 text-slate-700 ${
              loadingCoach ? 'animate-pulse' : ''
            }`}
          >
            {loadingCoach && '실천 데이터를 분석하고 개운 설계 문장을 만들고 있어요...'}
            {!loadingCoach && coachLines.length === 0 &&
              '실천 체크와 메모를 입력한 뒤 AI 코칭 생성 버튼을 눌러주세요. 내일의 운 흐름에 맞춘 설계를 제안합니다.'}
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
