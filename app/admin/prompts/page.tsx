"use client";

// 프롬프트 랩 — 각 운세가 실제로 LLM 에 보내는 프롬프트를 결제 없이 뽑아 보는 화면.
//
// 예전에는 이 기능이 /admin/insights 2299줄 페이지 안에 묻혀 있었고 6종만 지원했다.
// 무엇을 뽑을 수 있는지는 lib/admin/prompt-lab-registry.mjs 가 선언하고, 이 화면은 그 선언에서
// 셀렉트와 입력 폼을 자동으로 만든다 — 운세를 추가할 때 이 파일을 고칠 일이 없어야 한다.
//
// 🔴 이 화면은 LLM 을 호출하지 않는다. 서버가 프롬프트 문자열만 조립해 돌려준다(과금 0).

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, Loader2, Sparkles, TriangleAlert } from "lucide-react";

import {
  ADMIN_PROMPT_LAB_GROUPS,
  ADMIN_PROMPT_LAB_SERVICES,
  getAdminPromptLabService,
  promptLabServiceNeeds,
} from "@/lib/admin/prompt-lab-registry.mjs";
import { adminFetch, describeAdminError } from "../_lib/admin-api";

interface LabService {
  key: string;
  label: string;
  group: string;
  inputs: string[];
  note?: string;
  variantLabel?: string;
  variantOptions?: Array<{ key: string; label: string }>;
}

interface LabVariant {
  key: string;
  label: string;
}

interface LabResult {
  service: string;
  serviceLabel: string;
  title: string;
  prompt: string;
  systemPrompt: string;
  partial: boolean;
  partialReason: string;
  variantKey: string;
  variants: LabVariant[];
  notes: string[];
  questionUsed: boolean;
}

const SERVICES = ADMIN_PROMPT_LAB_SERVICES as unknown as LabService[];
const GROUPS = ADMIN_PROMPT_LAB_GROUPS as unknown as Array<{ id: string; label: string; order: number }>;

const DOMAINS: Array<{ key: string; label: string }> = [
  { key: "general", label: "전체" },
  { key: "love", label: "연애" },
  { key: "compatibility", label: "궁합" },
  { key: "career", label: "직업" },
  { key: "money", label: "재물" },
  { key: "health", label: "건강" },
  { key: "life_direction", label: "인생 방향" },
  { key: "personality", label: "성향" },
];

const DEFAULT_FORM = {
  service: SERVICES[0]?.key || "saju",
  domain: "general",
  variant: "",
  name: "",
  gender: "M",
  birthDate: "1990-03-15",
  birthTime: "09:30",
  birthTimeUnknown: false,
  calendarType: "solar",
  birthPlace: "서울",
  question: "지금 제 상황이 어떤지 봐 주세요.",
  targetYear: String(new Date().getFullYear() + 1),
  partnerName: "",
  partnerGender: "F",
  partnerBirthDate: "",
  partnerCalendarType: "solar",
  dreamText: "",
  petName: "",
  petSpecies: "dog",
  petBirthDate: "",
  petGender: "M",
};

type FormState = typeof DEFAULT_FORM;

function fieldClass(): string {
  return "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500";
}

function labelClass(): string {
  return "block text-xs text-slate-400";
}

export default function AdminPromptLabPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [result, setResult] = useState<LabResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const service = useMemo(
    () => (getAdminPromptLabService(form.service) as unknown as LabService | null),
    [form.service],
  );

  const grouped = useMemo(
    () => GROUPS
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((group) => ({ group, services: SERVICES.filter((item) => item.group === group.id) }))
      .filter((entry) => entry.services.length > 0),
    [],
  );

  // 서버가 돌려준 변형 목록(장·궁·섹션)이 있으면 그것을, 없으면 레지스트리의 정적 목록을 쓴다.
  const variants: LabVariant[] = useMemo(() => {
    if (result?.service === form.service && result.variants.length) return result.variants;
    return service?.variantOptions || [];
  }, [result, form.service, service]);

  const needs = useCallback(
    (input: string) => promptLabServiceNeeds(form.service, input) as boolean,
    [form.service],
  );

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const generate = useCallback(async () => {
    setLoading(true);
    setError("");
    setCopied("");

    try {
      const data = await adminFetch<LabResult>("/api/admin/prompt-lab/generate", {
        method: "POST",
        body: {
          service: form.service,
          domain: form.domain,
          variant: form.variant,
          question: form.question,
          name: form.name,
          gender: form.gender,
          birthDate: form.birthDate,
          birthTime: form.birthTimeUnknown ? "" : form.birthTime,
          birthTimeUnknown: form.birthTimeUnknown,
          calendarType: form.calendarType,
          birthPlace: form.birthPlace,
          targetYear: Number(form.targetYear) || undefined,
          partnerName: form.partnerName,
          partnerGender: form.partnerGender,
          partnerBirthDate: form.partnerBirthDate,
          partnerCalendarType: form.partnerCalendarType,
          dreamText: form.dreamText,
          pet: {
            name: form.petName,
            species: form.petSpecies,
            birthDate: form.petBirthDate,
            gender: form.petGender,
          },
        },
      });

      setResult(data);
      // 서버가 실제로 쓴 변형을 폼에 되맞춘다 — 안 그러면 다음 생성에서 선택이 초기화된 것처럼 보인다.
      if (data?.variantKey && !form.variant) update("variant", data.variantKey);
    } catch (caught) {
      setError(describeAdminError(caught, "프롬프트를 만들지 못했습니다.").message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [form, update]);

  const copy = useCallback(async (text: string, tag: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("클립보드 복사에 실패했습니다. 직접 선택해 복사해 주세요.");
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#0d0f18] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[380px_1fr]">
        {/* 입력 */}
        <aside className="border-b border-slate-800 bg-[#10121b] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-300" aria-hidden="true" />
              <h1 className="text-base font-semibold">프롬프트 랩</h1>
            </div>
            <Link
              href="/admin/content"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:border-slate-500"
              aria-label="글 편집으로 이동"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              글 편집
            </Link>
          </div>

          <div className="space-y-4 p-4">
            <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] leading-5 text-slate-400">
              각 운세가 실제로 AI 에 보내는 프롬프트를 <strong className="text-slate-200">결제 없이</strong> 그대로 뽑아 봅니다.
              AI 를 호출하지 않으므로 비용이 들지 않습니다.
            </p>

            <label className={labelClass()}>
              운세
              <select
                value={form.service}
                onChange={(event) => {
                  update("service", event.target.value);
                  update("variant", "");
                  setResult(null);
                }}
                className={fieldClass()}
              >
                {grouped.map((entry) => (
                  <optgroup key={entry.group.id} label={entry.group.label}>
                    {entry.services.map((item) => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            {service?.note ? (
              <p className="text-[11px] leading-4 text-slate-500">{service.note}</p>
            ) : null}

            {needs("variant") && variants.length ? (
              <label className={labelClass()}>
                {service?.variantLabel || "세부 선택"}
                <select
                  value={form.variant}
                  onChange={(event) => update("variant", event.target.value)}
                  className={fieldClass()}
                >
                  <option value="">기본값</option>
                  {variants.map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
              </label>
            ) : null}

            {needs("domain") ? (
              <label className={labelClass()}>
                분야
                <select
                  value={form.domain}
                  onChange={(event) => update("domain", event.target.value)}
                  className={fieldClass()}
                >
                  {DOMAINS.map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
              </label>
            ) : null}

            {needs("profile") ? (
              <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">생년 정보</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className={labelClass()}>
                    이름
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => update("name", event.target.value)}
                      placeholder="선택"
                      className={fieldClass()}
                    />
                  </label>
                  <label className={labelClass()}>
                    성별
                    <select value={form.gender} onChange={(event) => update("gender", event.target.value)} className={fieldClass()}>
                      <option value="M">남성</option>
                      <option value="F">여성</option>
                    </select>
                  </label>
                  <label className={labelClass()}>
                    생년월일
                    <input
                      type="date"
                      value={form.birthDate}
                      onChange={(event) => update("birthDate", event.target.value)}
                      className={fieldClass()}
                    />
                  </label>
                  <label className={labelClass()}>
                    달력
                    <select value={form.calendarType} onChange={(event) => update("calendarType", event.target.value)} className={fieldClass()}>
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                    </select>
                  </label>
                  <label className={labelClass()}>
                    태어난 시각
                    <input
                      type="time"
                      value={form.birthTime}
                      disabled={form.birthTimeUnknown}
                      onChange={(event) => update("birthTime", event.target.value)}
                      className={`${fieldClass()} disabled:opacity-40`}
                    />
                  </label>
                  <label className={labelClass()}>
                    출생지
                    <input
                      type="text"
                      value={form.birthPlace}
                      onChange={(event) => update("birthPlace", event.target.value)}
                      placeholder="서울"
                      className={fieldClass()}
                    />
                  </label>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={form.birthTimeUnknown}
                    onChange={(event) => update("birthTimeUnknown", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                  />
                  시간 모름
                </label>
              </div>
            ) : null}

            {needs("targetYear") ? (
              <label className={labelClass()}>
                대상 연도
                <input
                  type="number"
                  value={form.targetYear}
                  onChange={(event) => update("targetYear", event.target.value)}
                  className={fieldClass()}
                />
              </label>
            ) : null}

            {needs("partner") ? (
              <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">상대방 정보</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className={labelClass()}>
                    이름
                    <input type="text" value={form.partnerName} onChange={(e) => update("partnerName", e.target.value)} className={fieldClass()} />
                  </label>
                  <label className={labelClass()}>
                    성별
                    <select value={form.partnerGender} onChange={(e) => update("partnerGender", e.target.value)} className={fieldClass()}>
                      <option value="M">남성</option>
                      <option value="F">여성</option>
                    </select>
                  </label>
                  <label className={labelClass()}>
                    생년월일
                    <input type="date" value={form.partnerBirthDate} onChange={(e) => update("partnerBirthDate", e.target.value)} className={fieldClass()} />
                  </label>
                  <label className={labelClass()}>
                    달력
                    <select value={form.partnerCalendarType} onChange={(e) => update("partnerCalendarType", e.target.value)} className={fieldClass()}>
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {needs("dreamText") ? (
              <label className={labelClass()}>
                꿈 내용
                <textarea
                  value={form.dreamText}
                  onChange={(event) => update("dreamText", event.target.value)}
                  rows={5}
                  placeholder="꿈의 장면을 8자 이상 적어 주세요."
                  className={fieldClass()}
                />
              </label>
            ) : null}

            {needs("petInfo") ? (
              <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">반려동물 정보</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className={labelClass()}>
                    이름
                    <input type="text" value={form.petName} onChange={(e) => update("petName", e.target.value)} className={fieldClass()} />
                  </label>
                  <label className={labelClass()}>
                    종
                    <select value={form.petSpecies} onChange={(e) => update("petSpecies", e.target.value)} className={fieldClass()}>
                      <option value="dog">강아지</option>
                      <option value="cat">고양이</option>
                    </select>
                  </label>
                  <label className={labelClass()}>
                    생년월일
                    <input type="date" value={form.petBirthDate} onChange={(e) => update("petBirthDate", e.target.value)} className={fieldClass()} />
                  </label>
                  <label className={labelClass()}>
                    성별
                    <select value={form.petGender} onChange={(e) => update("petGender", e.target.value)} className={fieldClass()}>
                      <option value="M">수컷</option>
                      <option value="F">암컷</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {needs("question") ? (
              <label className={labelClass()}>
                질문
                <textarea
                  value={form.question}
                  onChange={(event) => update("question", event.target.value)}
                  rows={3}
                  className={fieldClass()}
                />
                {/* 질문을 받아 놓고 아무 데도 안 쓰면 "입력했는데 왜 그대로지?"만 남는다.
                    서버가 실제 결과를 보고 판정한 값을 그대로 보여 준다. */}
                {result?.service === form.service && form.question.trim() ? (
                  <span className={`mt-1 block text-[11px] ${result.questionUsed ? "text-emerald-300" : "text-slate-500"}`}>
                    {result.questionUsed
                      ? "이 질문이 아래 프롬프트에 반영됐습니다."
                      : "이 기능의 프롬프트에는 질문이 그대로 실리지 않습니다."}
                  </span>
                ) : null}
              </label>
            ) : null}

            <button
              type="button"
              onClick={() => { void generate(); }}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
              {loading ? "만드는 중..." : "프롬프트 뽑기"}
            </button>

            {error ? <p className="text-xs leading-5 text-rose-300">{error}</p> : null}
          </div>
        </aside>

        {/* 결과 */}
        <section className="min-w-0 p-4 lg:p-6">
          {!result ? (
            <div className="rounded-xl border border-slate-800 bg-[#12141f] p-6 text-sm text-slate-400">
              <p>왼쪽에서 운세를 고르고 <strong className="text-slate-200">프롬프트 뽑기</strong>를 누르세요.</p>
              <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-500">
                등록된 운세 {SERVICES.length}종의 시스템 프롬프트와, 생년 정보로 조립되는 운세는 완성 프롬프트까지 그대로 보여 줍니다.
                일부 운세는 사용자 프롬프트가 앞선 계산 결과(명식·카드·리딩 스냅샷)를 입력으로 받기 때문에
                시스템 프롬프트만 표시되며, 그 이유를 함께 안내합니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-100">{result.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {result.serviceLabel}
                    {result.variantKey ? ` · ${result.variantKey}` : ""}
                  </p>
                </div>
              </div>

              {result.partial ? (
                <p className="flex items-start gap-2 rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs leading-5 text-amber-200">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {result.partialReason}
                </p>
              ) : null}

              {result.notes.length ? (
                <ul className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-5 text-slate-400">
                  {result.notes.map((note) => <li key={note}>· {note}</li>)}
                </ul>
              ) : null}

              {result.systemPrompt ? (
                <PromptBlock
                  title="시스템 프롬프트"
                  hint="이 운세의 성격·말투·금칙을 정하는 최상위 지시문"
                  text={result.systemPrompt}
                  copied={copied === "system"}
                  onCopy={() => { void copy(result.systemPrompt, "system"); }}
                />
              ) : null}

              {result.prompt ? (
                <PromptBlock
                  title="사용자 프롬프트"
                  hint="계산 결과까지 넣어 실제로 모델에 전달되는 본문"
                  text={result.prompt}
                  copied={copied === "user"}
                  onCopy={() => { void copy(result.prompt, "user"); }}
                />
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

interface PromptBlockProps {
  title: string;
  hint: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
}

function PromptBlock({ title, hint, text, copied, onCopy }: PromptBlockProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#12141f]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="text-[11px] text-slate-500">{hint} · {text.length.toLocaleString("ko-KR")}자</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 hover:border-slate-500"
          aria-label={`${title} 복사`}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5 text-slate-300">
        {text}
      </pre>
    </div>
  );
}
