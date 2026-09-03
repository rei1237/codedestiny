"use client";

/**
 * 결제 결정 지점에 붙이는 공용 가치 섹션.
 *
 * 왜 있는가: 유료 상담 랜딩들이 "무엇을 받는지" 를 말하지 않은 채 결제창을 띄웠다. 홈 상세
 * 시트(`#tilePvwOverlay`)와 허브 모달은 같은 카피를 이미 보여 주는데, 라우트 랜딩만 그
 * 정보가 없어 사용자가 금액을 결제창에서 처음 봤다.
 *
 * 🔴 문구를 여기서 짓지 않는다. 정본은 정적 셸의 `FEATURE_MARKETING_COPY` 이고, 이 컴포넌트는
 *    `npm run sync:marketing-copy` 가 옮겨 둔 생성 JSON 을 `useFeatureMarketingCopy` 로 읽는다.
 *    같은 훅을 모달이 쓰므로 두 화면의 문장·로케일 처리(필드별 dictNs, feats 우선, 무료 타깃
 *    valueCompare 차단)가 한 곳에서 결정된다 — 여기에 사본을 만들면 그 순간 갈라진다.
 *
 * 🔴 테마·variant prop 을 받지 않는다. 화면마다 색을 다르게 주기 시작하면 이 섹션이 다시
 *    화면별 포크가 된다. 배치(폭·여백)는 호출부의 감싸는 요소가 정한다.
 */

import { useFeatureMarketingCopy, type FeatureMarketingTarget } from "./FeatureMarketingDetailModal";
import { useT, useTPick } from "@/lib/i18n/useT";

/**
 * 사전 도착 표식. `useTPick` 은 사전에 값이 없으면 넘긴 값을 그대로 돌려주므로,
 * 이 값이 되돌아오면 아직 사전이 안 온 것이다(`preview.featuresLabel` 은 12로케일 전부에 있다).
 */
const DICTIONARY_PROBE = "__cd-paid-value-probe__";

/**
 * @param target 카피를 찾을 대상. 🔴 `accessType` 을 유료로 명시하지 않으면
 *   `isPaidMarketingTarget` 의 휴리스틱이 무료로 판정해 비교표가 통째로 빠진다.
 */
export function PaidValueSection({ target }: { target: FeatureMarketingTarget }) {
  const t = useT();
  const pick = useTPick();
  const copy = useFeatureMarketingCopy(target);

  // 사전이 오기 전 `useT` 는 "번역을 준비 중입니다" 를 돌려준다. 모달은 사용자가 연 뒤라
  // 그때는 이미 사전이 있지만, 이 섹션은 랜딩에 그대로 붙어 있어 제목 다섯 줄이 그 문구로
  // 뜰 수 있다. 사전이 도착할 때까지 통째로 비워 둔다 — 결제 CTA 아래라 밀리는 것이 없다.
  const dictionaryReady = pick("preview.featuresLabel", DICTIONARY_PROBE) !== DICTIONARY_PROBE;
  if (!copy || !dictionaryReady) return null;

  const questions = copy.answersQuestions || [];
  const compareRows = copy.valueCompare?.rows || [];
  const faq = copy.faq || [];
  // 카피 항목이 이 다섯 필드를 하나도 안 채웠으면 빈 테두리만 남는다 — 그럴 바엔 안 그린다.
  if (!copy.feats.length && !questions.length && !compareRows.length && !copy.trustNotes.length && !faq.length) return null;

  // 순서는 홈 상세 시트·허브 모달과 같다: 무엇을 얻는가 → 어떤 질문에 답하는가 →
  // 무료와 무엇이 다른가 → 신뢰 → FAQ.
  return (
    <div className="grid gap-3">
      {copy.feats.length > 0 && (
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
          <h2 className="m-0 mb-2 text-xs font-black text-sky-100">{t(copy.featsAreFeatures ? "preview.featuresLabel" : "preview.painPointsLabel")}</h2>
          <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
            {copy.feats.map((item) => <li key={item} className="list-none">• {item}</li>)}
          </ul>
        </section>
      )}

      {questions.length > 0 && (
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
          <h2 className="m-0 mb-2 text-xs font-black text-sky-100">{t("preview.questionsLabel")}</h2>
          <ul className="m-0 grid gap-1.5 p-0 text-sm leading-6 text-slate-200">
            {questions.map((item) => <li key={item} className="list-none">• {item}</li>)}
          </ul>
        </section>
      )}

      {compareRows.length > 0 && (
        <section>
          <h2 className="m-0 mb-2 text-xs font-black text-slate-300">{t("preview.compareLabel")}</h2>
          <div role="table" className="overflow-hidden rounded-lg border border-white/10">
            <div role="row" className="grid grid-cols-[1.1fr_1fr_1.2fr] border-b border-white/10 bg-white/[0.06]">
              {["", t("preview.compareFree"), t("preview.comparePremium")].map((head, index) => (
                <span key={head || "axis"} role="columnheader" className={`px-2.5 py-2 text-xs font-black text-slate-100${index === 2 ? " bg-white/[0.05]" : ""}`}>{head}</span>
              ))}
            </div>
            {compareRows.map((row) => (
              <div key={row.axis} role="row" className="grid grid-cols-[1.1fr_1fr_1.2fr] border-b border-white/10 last:border-b-0">
                <span role="cell" className="px-2.5 py-2 text-xs leading-5 text-slate-300">{row.axis}</span>
                <span role="cell" className="px-2.5 py-2 text-xs leading-5 text-slate-400">{row.free?.trim() || "—"}</span>
                <span role="cell" className="bg-white/[0.05] px-2.5 py-2 text-xs font-bold leading-5 text-slate-100">{row.premium}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {copy.trustNotes.length > 0 && (
        <section className="rounded-lg border border-emerald-200/16 bg-emerald-200/[0.055] p-3">
          <h2 className="m-0 mb-2 text-xs font-black text-emerald-100">{t("preview.outcomesLabel")}</h2>
          <ul className="m-0 grid gap-1.5 p-0 text-xs leading-5 text-emerald-50/86">
            {copy.trustNotes.map((item) => <li key={item} className="list-none">• {item}</li>)}
          </ul>
        </section>
      )}

      {faq.length > 0 && (
        <section>
          <h2 className="m-0 mb-1 text-xs font-black text-slate-300">{t("preview.faqLabel")}</h2>
          <div className="rounded-lg border border-white/10">
            {faq.map((item) => (
              <details key={item.q} className="border-b border-white/10 last:border-b-0">
                <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-bold text-slate-100">{item.q}</summary>
                <div className="px-3 pb-3 text-xs leading-6 text-slate-300">{item.a}</div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
