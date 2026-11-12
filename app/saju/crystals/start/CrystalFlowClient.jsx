"use client";

// 사주 원석 추천 질문·결과 흐름. 계산은 이 브라우저 안에서 하고, 출생정보는 서버로 보내지 않는다.
// 저장: codeDestiny:sajuCrystal:<계정 범위>:<프로필 id> (lib/saju/crystal-flow.mjs). 비로그인 보관소이자 오프라인 캐시다.
// 로그인 사용자는 답변 기록(결과 본문 없음)을 프로필 카드 sajuCrystal에도 둬서 다른 기기에서 이어 본다.
// 서버가 이 필드를 아는지(상세 조회 응답에 키가 있는지) 확인된 뒤에만 올리고, 충돌하면 updatedAt이 늦은 쪽이 이긴다.
// 프로필이 바뀌면 상태를 처음부터 다시 연다.
import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { authFetch } from "@/app/_lib/auth-client";
import { readCurrentDestinyProfile, readDestinyProfileAccountId } from "@/app/_lib/profile-card-storage";
import { CRYSTAL_CATALOG, CRYSTAL_ELEMENT_KO } from "../../../../lib/saju/crystal-catalog.mjs";
import {
  SHELL_CALIBRATION_PREFIX, answersFromShellCalibration, buildCrystalRecord, crystalStorageKey, crystalYearWindow, isCrystalRecordReusable,
  loadServerCrystalRecord, parseCrystalRecord, profileToCrystalBirth, readStoredJson, resolveCrystalRecords, sanitizeCrystalFrom,
  saveServerCrystalRecord, writeStoredJson,
} from "../../../../lib/saju/crystal-flow.mjs";
import StoneCard, { ElementChip } from "../StoneCard";
import styles from "../crystals.module.css";

const DOMAINS = [
  ["work", "일·사업·학업"],
  ["money", "돈·생활 여건"],
  ["relationship", "연애·대인관계"],
  ["life", "생활 전반"],
];
const QUESTIONS = {
  good: {
    title: "돌이켜보면 유난히 잘 풀렸던 해가 있었나요?",
    listed: "좋았던 해가 떠올라요",
    yearsLabel: "잘 풀렸던 해",
    areaLabel: "어떤 일이 잘 풀렸나요? (여러 개 골라도 돼요)",
  },
  hard: {
    title: "반대로 유난히 버겁거나 일이 잘 풀리지 않았던 해는요?",
    listed: "힘들었던 해가 떠올라요",
    yearsLabel: "버거웠던 해",
    areaLabel: "어떤 일이 힘들었나요? (여러 개 골라도 돼요)",
  },
};
const STATUS_NOTE = {
  refined: "알려주신 시기가 한 관점과 잘 이어져서, 그 관점을 먼저 두었어요.",
  multiple: "알려주신 시기만으로는 한 가지로 가르기 어려워, 여러 후보를 함께 보여드려요.",
  base: "사주 전체의 흐름을 바탕으로 골랐어요.",
  insufficient: "지금 정보로는 도움이 되는 기운을 정하기 어려워요. 출생 정보를 확인해 주세요.",
};
const MATCH_KO = { agree: "맞음", disagree: "어긋남", ambiguous: "경계", neutral: "판단 없음" };
const PROFILE_EVENTS = ["cd:auth-changed", "cd:profile-changed", "destiny:profile-changed", "cd:current-profile-changed"];
const VERSIONS_FALLBACK = { engine: "", catalog: "", answers: "crystal-answers-v1" };
// 엔진(currentKstYear)과 같은 한국 시간 기준 올해. 엔진 모듈을 기다리지 않으려고 같은 식을 둔다.
const kstYear = () => new Date(Date.now() + 9 * 3600000).getUTCFullYear();
const catalogById = Object.fromEntries(CRYSTAL_CATALOG.map((c) => [c.id, c]));

const emptyRow = () => ({ year: "", month: "", areas: [], mixed: false });
const emptyDraft = () => ({ good: null, hard: null, rows: { good: [emptyRow()], hard: [emptyRow()] }, followups: [], asked: [] });

/** 화면 초안 → crystal-answers-v1. */
function draftToAnswers(draft) {
  const entries = [];
  for (const kind of ["good", "hard"]) {
    if (draft[kind] !== "listed") continue;
    for (const row of draft.rows[kind]) {
      if (!row.year) continue;
      const areas = row.mixed ? { life: "mixed" } : Object.fromEntries(row.areas.map((d) => [d, kind]));
      entries.push({ year: Number(row.year), month: row.month ? Number(row.month) : null, kind, areas, source: "volunteered" });
    }
  }
  for (const f of draft.followups) entries.push({ year: f.year, month: null, kind: f.kind, areas: {}, source: "followup" });
  return { good: draft.good || "skip", hard: draft.hard || "skip", entries, asked: [...draft.asked] };
}

/** crystal-answers-v1 → 화면 초안(수정하기). */
function answersToDraft(answers) {
  const draft = emptyDraft();
  draft.good = answers.good || null;
  draft.hard = answers.hard || null;
  for (const kind of ["good", "hard"]) {
    const rows = (answers.entries || []).filter((e) => e.kind === kind && e.source !== "followup").map((e) => {
      const mixed = Object.values(e.areas || {}).includes("mixed");
      return { year: String(e.year), month: e.month ? String(e.month) : "", areas: mixed ? [] : Object.keys(e.areas || {}), mixed };
    });
    draft.rows[kind] = rows.length ? rows : [emptyRow()];
  }
  draft.followups = (answers.entries || []).filter((e) => e.source === "followup").map((e) => ({ year: e.year, kind: e.kind }));
  draft.asked = [...(answers.asked || [])];
  return draft;
}

function rowError(draft, kind) {
  if (draft[kind] !== "listed") return "";
  const years = draft.rows[kind].map((r) => r.year).filter(Boolean);
  if (!years.length) return "연도를 하나 이상 골라 주세요. 떠오르지 않으면 다른 답을 골라도 돼요.";
  if (new Set(years).size !== years.length) return "같은 해를 두 번 고르셨어요. 다른 해를 골라 주세요.";
  return "";
}

let enginePromise = null;
const loadEngine = () => (enginePromise ||= import("../../../../lib/saju/crystal-recommendation.mjs"));

export default function CrystalFlowClient({ stoneImageIds = [] }) {
  const stoneImages = new Set(stoneImageIds);
  const [phase, setPhase] = useState("loading");
  const [person, setPerson] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saved, setSaved] = useState(null);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [savedNotice, setSavedNotice] = useState("");
  const [yearWindow, setYearWindow] = useState(null);
  const ctx = useRef({ from: "direct", inputs: null, versions: VERSIONS_FALLBACK, started: false, steps: 0, scope: "guest", key: "", token: 0, remoteSupported: false });

  const init = useCallback(async () => {
    const c = ctx.current;
    const token = (c.token += 1);
    c.inputs = null;
    c.started = false;
    c.steps = 0;
    setResult(null);
    setMessage("");
    setSavedNotice("");
    setDraft(emptyDraft());
    const info = profileToCrystalBirth(readCurrentDestinyProfile());
    setPerson(info);
    if (!info) {
      setSaved(null);
      setYearWindow(null);
      setPhase("no-profile");
      return;
    }
    // 연도 범위는 엔진의 민용(양력) 출생연도를 따른다. 음력 프로필의 birthYear는 1년 다를 수 있다.
    let inputs = null;
    try {
      const engine = await loadEngine();
      inputs = engine.buildCrystalInputs({ birth: info.birth, gender: info.gender });
    } catch {
      inputs = null; // 계산 실패는 질문 뒤 run()에서 오류 화면으로 안내한다.
    }
    if (token !== c.token) return; // 그사이 프로필이 바뀌었다.
    c.inputs = inputs;
    const years = crystalYearWindow(inputs, { birthYear: info.birthYear, currentYear: kstYear() });
    setYearWindow(years);
    c.scope = readDestinyProfileAccountId() || "guest";
    c.key = crystalStorageKey(c.scope, info.profileId);
    c.remoteSupported = false;
    const local = parseCrystalRecord(readStoredJson(window.localStorage, c.key));
    let previous = local;
    if (c.scope !== "guest") {
      // 로그인 사용자: 서버 프로필의 기록과 맞춘다. 서버를 못 읽으면 이 브라우저 기록(오프라인 캐시)으로 계속한다.
      const remote = await loadServerCrystalRecord(authFetch, info.profileId);
      if (token !== c.token) return;
      c.remoteSupported = remote.ok && remote.supported;
      const merged = resolveCrystalRecords({ local, remote: remote.record, remoteSupported: c.remoteSupported });
      previous = merged.record;
      if (merged.cacheLocal) writeStoredJson(window.localStorage, c.key, merged.record);
      if (merged.pushRemote) saveServerCrystalRecord(authFetch, info.profileId, merged.record).catch(() => {});
    }
    if (previous && !isCrystalRecordReusable(previous, c.versions)) previous = null;
    let prevAnswers = previous?.answers || null;
    if (!prevAnswers) {
      const shell = readStoredJson(window.localStorage, `${SHELL_CALIBRATION_PREFIX}${info.profileId}`);
      prevAnswers = answersFromShellCalibration(shell, { birthYear: years?.fromYear, currentYear: years?.toYear });
    }
    setSaved(prevAnswers ? { answers: prevAnswers, fromShell: !previous } : null);
    setPhase(prevAnswers ? "resume" : "good");
  }, []);

  useEffect(() => {
    ctx.current.from = sanitizeCrystalFrom(new URLSearchParams(window.location.search).get("from"));
    loadEngine()
      .then((m) => {
        ctx.current.versions = { engine: m.CRYSTAL_ENGINE_VERSION, catalog: m.CATALOG_VERSION, answers: m.CRYSTAL_ANSWERS_VERSION };
      })
      .catch(() => {})
      .finally(init);
    const onStorage = (event) => {
      if (!event.key || /auth|profile|PROFILE/.test(event.key)) init();
    };
    PROFILE_EVENTS.forEach((name) => window.addEventListener(name, init));
    document.addEventListener("destinyProfileChanged", init);
    window.addEventListener("storage", onStorage);
    return () => {
      PROFILE_EVENTS.forEach((name) => window.removeEventListener(name, init));
      document.removeEventListener("destinyProfileChanged", init);
      window.removeEventListener("storage", onStorage);
    };
  }, [init]);

  const markStarted = () => {
    if (ctx.current.started) return;
    ctx.current.started = true;
    trackEvent("crystal_questionnaire_start", { from: ctx.current.from });
  };

  const inputsFor = async () => {
    const engine = await loadEngine();
    if (!ctx.current.inputs) ctx.current.inputs = engine.buildCrystalInputs({ birth: person.birth, gender: person.gender });
    return { engine, inputs: ctx.current.inputs };
  };

  const run = async (nextDraft, { complete = false } = {}) => {
    setPhase("computing");
    setMessage("");
    try {
      const { engine, inputs } = await inputsFor();
      const answers = draftToAnswers(nextDraft);
      const out = engine.recommendCrystals({ natal: inputs.natal, periods: inputs.periods, answers });
      setDraft(nextDraft);
      setResult({ out, answers, currentYear: inputs.currentYear });
      if (out.followups.length && !complete) {
        setPhase("followup");
        return;
      }
      trackEvent("crystal_questionnaire_complete", { steps: ctx.current.steps, followups: nextDraft.followups.length + nextDraft.asked.length });
      trackEvent("crystal_result_view", { status: out.status });
      setSavedNotice("");
      setPhase("result");
    } catch (error) {
      if (error?.code === "INVALID_CRYSTAL_ANSWERS") {
        setMessage("답변을 다시 확인해 주세요. 같은 해가 겹치거나 아직 오지 않은 해가 들어 있을 수 있어요.");
        setPhase("good");
      } else {
        setMessage("계산하는 중에 문제가 생겼어요. 출생 정보를 확인하거나 잠시 뒤 다시 시도해 주세요.");
        setPhase("error");
      }
    }
  };

  const save = async () => {
    if (!result || !person) return;
    const c = ctx.current;
    const token = c.token;
    const record = buildCrystalRecord({ answers: result.answers, result: result.out, versions: c.versions });
    const ok = writeStoredJson(window.localStorage, c.key, record);
    let synced = false;
    if (c.scope !== "guest" && c.remoteSupported) {
      setSavedNotice("보관하는 중이에요…");
      synced = (await saveServerCrystalRecord(authFetch, person.profileId, record)).ok;
      if (token !== c.token) return; // 그사이 프로필이 바뀌었다.
    }
    setSavedNotice(synced
      ? "이 프로필에 답변을 보관했어요. 같은 계정으로 로그인하면 다른 기기에서도 이어서 볼 수 있어요."
      : ok
        ? "이 브라우저에 답변을 보관했어요. 다음에 오면 이어서 볼 수 있어요."
        : "이 브라우저에서는 보관할 수 없어요(사생활 보호 모드 등).");
    if (ok || synced) {
      setSaved({ answers: result.answers, fromShell: false });
      trackEvent("crystal_result_save");
    }
  };

  const setKind = (kind, flag) => setDraft((d) => ({ ...d, [kind]: flag }));
  const updateRow = (kind, index, patch) =>
    setDraft((d) => ({ ...d, rows: { ...d.rows, [kind]: d.rows[kind].map((r, i) => (i === index ? { ...r, ...patch } : r)) } }));
  const addRow = (kind) => setDraft((d) => ({ ...d, rows: { ...d.rows, [kind]: [...d.rows[kind], emptyRow()].slice(0, 3) } }));
  const removeRow = (kind, index) =>
    setDraft((d) => {
      const rows = d.rows[kind].filter((_, i) => i !== index);
      return { ...d, rows: { ...d.rows, [kind]: rows.length ? rows : [emptyRow()] } };
    });

  if (phase === "loading" || phase === "computing") {
    return (
      <section className={styles.panel} aria-busy="true">
        <p role="status">{phase === "computing" ? "사주 흐름과 알려주신 시기를 함께 살펴보는 중이에요…" : "저장된 프로필을 불러오는 중이에요…"}</p>
      </section>
    );
  }

  if (phase === "no-profile") {
    return (
      <section className={styles.panel}>
        <h2>먼저 출생 정보가 필요해요</h2>
        <p>저장된 프로필을 찾지 못했어요. 무료 만세력에서 출생 정보를 입력하고 프로필을 저장한 뒤 다시 와 주세요.</p>
        <div className={styles.ctaRow}>
          <a className={styles.cta} href="/ggulggul/">출생 정보 입력하러 가기</a>
          <a className={styles.ghost} href="/saju/crystals/">사주 원석 추천 알아보기</a>
        </div>
      </section>
    );
  }

  const who = person?.name ? `${person.name} 님` : "지금 프로필";
  const profileLine = (
    <p className={styles.hint}>
      {who}의 사주로 살펴봐요{person && !person.hourKnown ? " · 출생시간을 몰라 해마다의 흐름(세운)으로만 비교해요" : ""}
    </p>
  );

  if (phase === "error") {
    return (
      <section className={styles.panel}>
        <h2>잠시 문제가 생겼어요</h2>
        <p>{message}</p>
        <div className={styles.ctaRow}>
          <button type="button" className={styles.cta} onClick={() => run(draft)}>다시 시도하기</button>
          <button type="button" className={styles.ghost} onClick={() => setPhase("good")}>답변 수정하기</button>
        </div>
      </section>
    );
  }

  if (phase === "resume" && saved) {
    const count = saved.answers.entries.length;
    return (
      <section className={styles.panel}>
        {profileLine}
        <h2>이전에 알려주신 시기로 살펴볼까요?</h2>
        <p>
          {saved.fromShell ? "사주 결과 화면에서 알려주신" : "지난번에 보관한"} 좋았던 해·힘들었던 해 {count}개가 있어요.
        </p>
        <div className={styles.ctaRow}>
          <button
            type="button"
            className={styles.cta}
            onClick={() => {
              markStarted();
              ctx.current.steps = 0;
              run(answersToDraft(saved.answers), { complete: true });
            }}
          >
            이 시기로 살펴보기
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => {
              markStarted();
              setDraft(answersToDraft(saved.answers));
              setPhase("good");
            }}
          >
            수정하기
          </button>
        </div>
      </section>
    );
  }

  if (phase === "good" || phase === "hard") {
    const kind = phase;
    const q = QUESTIONS[kind];
    const options = [
      ["listed", q.listed],
      ["none", "특별히 떠오르는 해가 없어요"],
      ["unsure", "잘 기억나지 않아요"],
      ...(kind === "hard" ? [["skip", "건너뛰기"]] : []),
    ];
    const { fromYear, toYear } = yearWindow || { fromYear: person.birthYear, toYear: kstYear() };
    const years = [];
    for (let y = toYear; y >= fromYear; y -= 1) years.push(y);
    const err = rowError(draft, kind);
    const next = () => {
      if (!draft[kind] || err) return;
      markStarted();
      ctx.current.steps += 1;
      if (kind === "good") {
        setPhase("hard");
        return;
      }
      run({ ...draft, followups: [], asked: [] });
    };
    return (
      <section className={styles.panel} aria-labelledby="crystal-q">
        {profileLine}
        <p className={styles.progress}>{kind === "good" ? "1 / 2" : "2 / 2"}</p>
        <h2 id="crystal-q">{q.title}</h2>
        <div className={styles.choices} role="group" aria-labelledby="crystal-q">
          {options.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={styles.choice}
              aria-pressed={draft[kind] === value}
              onClick={() => {
                markStarted();
                setKind(kind, value);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {draft[kind] === "listed" && (
          <div>
            <p className={styles.hint}>최대 3개까지 알려주세요. 월은 기억날 때만 골라도 돼요.</p>
            {draft.rows[kind].map((row, index) => (
              <div key={index} className={styles.yearRow}>
                <div className={styles.yearFields}>
                  <label>
                    <span className={styles.visuallyHidden}>{`${q.yearsLabel} ${index + 1}`}</span>
                    <select value={row.year} onChange={(e) => updateRow(kind, index, { year: e.target.value })}>
                      <option value="">연도 선택</option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y === toYear ? `${y}년 (지금까지)` : `${y}년`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={styles.visuallyHidden}>월(선택)</span>
                    <select value={row.month} onChange={(e) => updateRow(kind, index, { month: e.target.value })}>
                      <option value="">월 (선택)</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{`${m}월`}</option>
                      ))}
                    </select>
                  </label>
                  {draft.rows[kind].length > 1 && (
                    <button type="button" className={styles.ghost} onClick={() => removeRow(kind, index)}>
                      빼기
                    </button>
                  )}
                </div>
                <p className={styles.hint}>{q.areaLabel}</p>
                <div className={styles.areaGroup} role="group" aria-label={q.areaLabel}>
                  {DOMAINS.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={styles.choice}
                      aria-pressed={!row.mixed && row.areas.includes(id)}
                      onClick={() =>
                        updateRow(kind, index, {
                          mixed: false,
                          areas: row.areas.includes(id) ? row.areas.filter((a) => a !== id) : [...row.areas, id],
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.choice}
                    aria-pressed={row.mixed}
                    onClick={() => updateRow(kind, index, { mixed: !row.mixed, areas: [] })}
                  >
                    여러 일이 섞여 있었어요
                  </button>
                </div>
              </div>
            ))}
            {draft.rows[kind].length < 3 && (
              <button type="button" className={styles.ghost} onClick={() => addRow(kind)}>
                + 해 더하기
              </button>
            )}
            {kind === "good" && (
              <p className={styles.hint}>같은 해에 힘든 일도 있었다면 다음 질문에서 그 해를 한 번 더 골라 주세요.</p>
            )}
            {err && <p className={styles.error}>{err}</p>}
          </div>
        )}
        {message && <p className={styles.error}>{message}</p>}
        <div className={styles.ctaRow}>
          {kind === "hard" && (
            <button type="button" className={styles.ghost} onClick={() => setPhase("good")}>
              이전
            </button>
          )}
          <button type="button" className={styles.cta} disabled={!draft[kind] || Boolean(err)} onClick={next}>
            {kind === "good" ? "다음" : "원석 찾기"}
          </button>
        </div>
      </section>
    );
  }

  if (phase === "followup" && result) {
    const pending = result.out.followups;
    const answer = (year, value) => {
      const nextDraft = {
        ...draft,
        followups: value === "unsure" ? draft.followups : [...draft.followups, { year, kind: value }],
        asked: value === "unsure" ? [...draft.asked, year] : draft.asked,
      };
      ctx.current.steps += 1;
      run(nextDraft);
    };
    const year = pending[0].year;
    return (
      <section className={styles.panel} aria-labelledby="crystal-f">
        {profileLine}
        <p className={styles.progress}>조금만 더 여쭤볼게요</p>
        <h2 id="crystal-f">{year}년은 어떤 해로 기억되나요?</h2>
        <p className={styles.hint}>후보끼리 운의 흐름이 갈리는 해예요. 정답이 있는 질문이 아니니 떠오르는 대로 골라 주세요.</p>
        <div className={styles.choices}>
          <button type="button" className={styles.choice} onClick={() => answer(year, "good")}>좋았던 일이 많았어요</button>
          <button type="button" className={styles.choice} onClick={() => answer(year, "hard")}>힘들었던 일이 많았어요</button>
          <button type="button" className={styles.choice} onClick={() => answer(year, "unsure")}>잘 기억나지 않아요</button>
        </div>
        <div className={styles.ctaRow}>
          <button type="button" className={styles.ghost} onClick={() => run(draft, { complete: true })}>
            건너뛰고 결과 보기
          </button>
        </div>
      </section>
    );
  }

  if (phase === "result" && result) {
    const { out } = result;
    const s = out.structure;
    const edit = () => {
      setPhase("good");
      setSavedNotice("");
    };
    return (
      <section aria-labelledby="crystal-r">
        <div className={styles.panel}>
          {profileLine}
          <h2 id="crystal-r">함께 살펴볼 기운</h2>
          {s.primaryElements.length > 0 ? (
            <div className={styles.chipRow}>
              {s.primaryElements.map((el) => (
                <ElementChip key={el} element={el} label={`우선 · ${CRYSTAL_ELEMENT_KO[el]}`} size="lg" />
              ))}
              {s.supportElements.map((el) => (
                <ElementChip key={el} element={el} label={`보조 · ${CRYSTAL_ELEMENT_KO[el]}`} size="lg" />
              ))}
            </div>
          ) : null}
          <p className={styles.status}>{STATUS_NOTE[out.status] || STATUS_NOTE.base}</p>
        </div>

        {out.crystals.length > 0 && (
          <div className={styles.section}>
            <h2>나에게 어울리는 원석</h2>
            <div className={styles.stoneGrid}>
              {out.crystals.map((c) => (
                <StoneCard
                  key={c.id}
                  crystal={{ ...c, description: catalogById[c.id]?.description || "" }}
                  elementKo={CRYSTAL_ELEMENT_KO[c.element]}
                  hasImage={stoneImages.has(c.id)}
                  roleLabel={c.role === "primary" ? "우선 기운의 원석" : "보조 기운의 원석"}
                  reason={c.reason}
                />
              ))}
            </div>
          </div>
        )}

        <div className={styles.section}>
          <h2>이렇게 골랐어요</h2>
          <h3>사주 전체에서 본 이유</h3>
          <ul className={styles.reasonList}>
            {s.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <h3 style={{ marginTop: 16 }}>알려주신 시기를 참고한 이유</h3>
          <ul className={styles.reasonList}>
            {out.experience.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>

        <details className={styles.basis}>
          <summary>상세 근거 펼쳐보기</summary>
          <p className={styles.hint}>사주 전체에서 본 관점(순서대로)</p>
          <ul className={styles.reasonList}>
            {s.hypotheses
              .filter((h) => s.priority.includes(h.id))
              .sort((a, b) => s.priority.indexOf(a.id) - s.priority.indexOf(b.id))
              .map((h) => (
                <li key={h.id}>
                  {h.label}: 도움 {h.useful.map((el) => CRYSTAL_ELEMENT_KO[el]).join("·") || "없음"}
                  {h.avoid.length ? ` / 조심 ${h.avoid.map((el) => CRYSTAL_ELEMENT_KO[el]).join("·")}` : ""}
                </li>
              ))}
          </ul>
          {out.experience.used.length > 0 && (
            <table>
              <caption className={styles.visuallyHidden}>알려주신 시기와 관점별 비교</caption>
              <thead>
                <tr>
                  <th scope="col">시기</th>
                  <th scope="col">영역</th>
                  {s.priority.map((id) => (
                    <th key={id} scope="col">{s.hypotheses.find((h) => h.id === id)?.label || id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {out.experience.used.map((row) => (
                  <tr key={`${row.year}-${row.domain}-${row.kind}`}>
                    <td>
                      {row.year}년{row.month ? ` ${row.month}월` : ""} {row.kind === "good" ? "좋았음" : "힘들었음"}
                      {row.partial ? " (지금까지)" : ""}
                    </td>
                    <td>{row.areaAssumed ? "전반" : row.domainKo}</td>
                    {s.priority.map((id) => (
                      <td key={id}>{MATCH_KO[row.byHypothesis[id]] || "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className={styles.hint}>참고할 점</p>
          <ul className={styles.reasonList}>
            {out.limitations.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </details>

        <div className={styles.ctaRow}>
          <button type="button" className={styles.cta} onClick={save}>이 프로필에 보관하기</button>
          <button type="button" className={styles.ghost} onClick={edit}>답변 수정하기</button>
        </div>
        {savedNotice && <p className={styles.status} role="status">{savedNotice}</p>}
        <p className={styles.disclaimer}>{CRYSTAL_DISCLAIMER_TEXT}</p>
      </section>
    );
  }

  return null;
}

const CRYSTAL_DISCLAIMER_TEXT = "원석의 오행과 의미는 전통적 해석과 문화적 상징을 바탕으로 하며, 건강이나 운세의 변화를 보장하지 않습니다.";
