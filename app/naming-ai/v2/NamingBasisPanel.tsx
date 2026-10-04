"use client";

// 작명 v2 무료 미리보기 — POST /api/naming-prompt/basis(로그인 없음·LLM 0회)의 상위 5개를 작명서 형식으로 그린다.
// 🔴 결제·이용권 판정과 무관하다. 유료 진행은 기존 결제 버튼(checkout)이 그대로 맡는다.

import { useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import styles from "./naming-v2.module.css";
import NamingV2Report from "./NamingV2Report";
import { getNamingV2Copy } from "./namingV2Copy";
import { isV2Engine, type V2BasisResponse, type V2Engine } from "./namingV2Types";
import { cx } from "./NamingArt";

interface NamingBasisPanelProps {
  locale: string;
  /** toRawInput(form) — 필수값이 모자라면 null */
  input: Record<string, unknown> | null;
  disabled?: boolean;
}

type BasisState = { status: "idle" | "loading" | "error" } | { status: "done"; engine: V2Engine; key: string };

export default function NamingBasisPanel({ locale, input, disabled = false }: NamingBasisPanelProps) {
  const copy = useMemo(() => getNamingV2Copy(locale), [locale]);
  const [state, setState] = useState<BasisState>({ status: "idle" });
  const [errorText, setErrorText] = useState("");
  const inputKey = input ? JSON.stringify(input) : "";
  const requestRef = useRef(0);

  // 입력이 바뀌면 이전 미리보기는 낡은 값이 된다 — 지우고 다시 누르게 한다.
  useEffect(() => {
    requestRef.current += 1;
    setState((prev) => (prev.status === "done" && prev.key === inputKey ? prev : { status: "idle" }));
    setErrorText("");
  }, [inputKey]);

  async function load() {
    if (!input || state.status === "loading") return;
    const ticket = ++requestRef.current;
    setState({ status: "loading" });
    setErrorText("");
    try {
      const response = await authFetch(
        "/api/naming-prompt/basis",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }) },
        { retryOn401: false },
      );
      const data = (await response.json().catch(() => ({}))) as V2BasisResponse;
      if (ticket !== requestRef.current) return;
      const engine = { surname: data.surname, saju: data.saju, notices: data.notices || [], candidates: data.candidates || [] };
      if (!response.ok || !data.ok || !isV2Engine(engine)) {
        // 서버 오류 문장은 한국어다 — 다른 로케일은 문구표의 일반 오류로 바꾼다.
        setErrorText(locale === "ko" && data.message ? data.message : copy.basisError);
        setState({ status: "error" });
        return;
      }
      setState({ status: "done", engine: engine as V2Engine, key: inputKey });
    } catch {
      if (ticket !== requestRef.current) return;
      setErrorText(copy.basisError);
      setState({ status: "error" });
    }
  }

  return (
    <section className={cx(styles.scope, styles.basis)} aria-live="polite">
      <div className={styles.basisHead}>
        <h3 className={styles.blockTitle}>{copy.basisTitle}</h3>
        <p className={styles.note}>{copy.basisLead}</p>
        {input ? (
          <button type="button" className={styles.button} onClick={() => void load()} disabled={disabled || state.status === "loading"}>
            {state.status === "loading" ? copy.basisLoading : copy.basisButton}
          </button>
        ) : (
          <p className={styles.note}>{copy.basisNeedInput}</p>
        )}
        {state.status === "error" ? <p className={styles.fieldWarn} role="alert">{errorText}</p> : null}
      </div>
      {state.status === "done" ? (
        <>
          <NamingV2Report engine={state.engine} tier="free" locale={locale} />
          <p className={styles.basisHint}>{copy.basisPaidHint}</p>
        </>
      ) : null}
    </section>
  );
}
