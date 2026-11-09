"use client";
import { useEffect, useState } from "react";
import { businessProducts, addKstMonth } from "@/lib/business-api/products.mjs";
import samples from "@/lib/business-api/examples.json";
import { authFetch } from "@/app/_lib/auth-client";
import { getApiBaseUrl } from "@/app/_lib/api-config";
import appContext from "@/js/core/app-context.js";
import { requestPortOneSinglePayment } from "@/lib/payment/portone";
const base = "/business/api/";
const kst = (value) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value)) + " KST";
function login(path) {
  location.assign("/login/?next=" + encodeURIComponent(path));
}
async function call(path, method = "GET", body) {
  const response = await authFetch(path, {
    method,
    cache: "no-store",
    ...(method === "GET"
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body || {}),
        }),
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(data.message || "잠시 후 다시 확인해 주세요."),
      { status: response.status, code: data.code },
    );
  return data;
}
const productNotes = {
  saju: "출생시각이 있으면 네 기둥을 표시해요. 시각을 모르면 시주를 비워 두고 나머지 세 기둥을 읽을 수 있어요.",
  ziwei:
    "명궁과 신궁이 어디에 놓였는지 찾고, 열두 궁에 어떤 별이 모였는지 명반으로 보여줄 수 있어요.",
  astrology:
    "행성의 별자리는 황도 위의 위치를, 하우스는 출생지에서 본 하늘의 구역을 나타내요.",
  vedic:
    "달의 위치를 라시와 낙샤트라로 읽어요. 파다는 낙샤트라를 다시 네 구간으로 나눈 자리예요.",
  sukuyo:
    "달의 위치를 스물일곱 숙에 대응해요. 같은 날에도 달이 경계를 지나면 본명숙이 달라질 수 있어요.",
  tarot:
    "한 장의 카드로 오늘의 핵심을 보거나, 세 장을 과거·현재·미래 순서로 놓고 방향을 함께 표시해요.",
};
function ReadingPreview({ product, sample }) {
  return (
    <div className="biz-reading">
      <img
        loading="lazy"
        src={`/assets/yeongnyangi/original/${product.slug}.webp`}
        alt=""
      />
      <div>
        <h3>{product.name.replace(" API", "")}</h3>
        <p>{productNotes[product.slug]}</p>
        {sample?.pillars && (
          <p>
            연주 {sample.pillars.year} · 월주 {sample.pillars.month} · 일주{" "}
            {sample.pillars.day} · 시주 {sample.pillars.hour ?? "미상"}
          </p>
        )}
        {sample?.palaces && (
          <p>
            명궁 {sample.mingGong} · 신궁 {sample.shenGong} ·{" "}
            {sample.palaces[0].name}의 별 {sample.palaces[0].stars.join(" · ")}
          </p>
        )}
        {sample?.cards?.map((card) => (
          <p key={card.id}>
            {card.position} · {card.name} ·{" "}
            {card.direction === "upright" ? "정방향" : "역방향"}
          </p>
        ))}
        {sample?.planets?.Sun?.signIndex != null && (
          <p>
            태양 황경 {sample.planets.Sun.longitude.toFixed(2)}° · 상승점{" "}
            {sample.ascendant.toFixed(2)}°
          </p>
        )}
        {sample?.planets?.Moon?.nakshatra && (
          <p>
            달 · {sample.planets.Moon.rashi} · {sample.planets.Moon.nakshatra}{" "}
            {sample.planets.Moon.pada}파다
          </p>
        )}
        {sample?.mansion && (
          <p>
            본명숙 {sample.mansion} · 27숙 중 {sample.index + 1}번째
          </p>
        )}
      </div>
    </div>
  );
}
function UsageTerms() {
  return (
    <p>
      구매한 상품의 응답은 사업자가 운영하는 앱과 웹사이트에 표시할 수 있습니다.
      키는 서버 환경변수에 보관하고 제3자에게 공유하지 마세요.{" "}
      <a href="/terms-of-service/">이용약관</a> ·{" "}
      <a href="/refund-policy/">환불 정책</a> · <a href="/contact/">문의</a>
    </p>
  );
}
export default function Business({ mode }) {
  const [catalog, setCatalog] = useState(null),
    [account, setAccount] = useState(undefined),
    [slug, select] = useState("saju");
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [secret, setSecret] = useState(""),
    [consent, setConsent] = useState(false),
    [now, setNow] = useState(null);
  const items = catalog?.products || businessProducts;
  const [variant, setVariant] = useState(false);
  const product = items.find((it) => it.slug === slug) || items[0];
  const alternative = samples.variants[product.slug];
  const p =
    variant && alternative
      ? { ...product, input: alternative.input, example: alternative.output }
      : product;
  const dashboard = mode === "dashboard";
  const limitNotice = catalog
    ? `계정·상품별 분당 ${catalog.perMinute}회까지 호출할 수 있습니다. 한도 초과 시 추가 청구 없이 HTTP 429를 반환합니다.`
    : "호출 한도를 확인하고 있습니다.";
  async function refresh() {
    const result = await call("/api/business/dashboard");
    setAccount(result);
    return result;
  }
  useEffect(() => {
    setNow(Date.now());
    const q = new URLSearchParams(location.search);
    if (businessProducts.some((it) => it.slug === q.get("product")))
      select(q.get("product"));
    call("/api/business/catalog")
      .then(setCatalog)
      .catch((e) => setMessage(e.message));
    const returnedOrder = dashboard && q.get("order");
    const settle = returnedOrder
      ? call(
          "/api/payments/orders/" +
            encodeURIComponent(returnedOrder) +
            "/confirm",
          "POST",
        ).catch(() => {})
      : Promise.resolve();
    settle.then(refresh).catch((e) => {
      if (e.status === 401 && dashboard)
        login(base + "dashboard/" + location.search);
      else if (e.status === 401) setAccount(null);
      else setMessage(e.message);
    });
  }, [dashboard]);
  async function perform(action) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  function choose(s) {
    setVariant(false);
    select(s);
    history.replaceState(null, "", "?product=" + s + location.hash);
  }
  async function buy(it, resumeOrderId) {
    if (appContext.isApp())
      throw Error("기업 API 구매는 웹 브라우저에서 진행해 주세요.");
    if (!account) {
      login(base + "?product=" + it.slug + "#pricing");
      return;
    }
    if (!consent && !resumeOrderId) {
      setMessage("구매 전 이용 조건을 확인해 주세요.");
      return;
    }
    const result = await call("/api/payments/prepare", "POST", {
      productId: it.id,
      featureKey: it.id,
      idempotencyKey: crypto.randomUUID(),
      resumeOrderId,
      paymentMethod: "card_general",
      refundConsent: true,
      returnPath: base + "dashboard/",
    });
    const o = result.order;
    if (
      (resumeOrderId
        ? o.merchantUid !== resumeOrderId
        : o.paymentAmount !== it.priceKRW) ||
      o.featureKey !== it.id
    )
      throw Error("주문 상품과 금액을 다시 확인해 주세요.");
    const dest =
      base +
      "dashboard/?product=" +
      it.slug +
      "&order=" +
      encodeURIComponent(o.merchantUid);
    const pg = await requestPortOneSinglePayment({
      apiBase: getApiBaseUrl(),
      paymentId: o.merchantUid,
      orderName: o.orderName,
      totalAmount: o.paymentAmount,
      redirectPath: dest,
      customer: o.customer,
      storeId: o.storeId,
      channelKey: o.channelKey,
      payFields: { payMethod: "CARD" },
    });
    if (pg.ok)
      await call(
        "/api/payments/orders/" +
          encodeURIComponent(o.merchantUid) +
          "/confirm",
        "POST",
      ).catch(() => {});
    location.assign(dest);
  }
  const cmd =
    'curl --request POST "https://code-destiny.com/api/business/v1/' +
    p.slug +
    '" \\\n  --header "Authorization: Bearer $GGUL_FORTUNE_API_KEY" \\\n  --header "Content-Type: application/json" \\\n  --data ' +
    String.fromCharCode(39) +
    JSON.stringify(p.input) +
    String.fromCharCode(39);
  const example = (
    <section id="examples">
      <h2>{dashboard ? "첫 호출" : "API 응답 예시"}</h2>
      <label>
        예시 상품{" "}
        <select value={p.slug} onChange={(e) => choose(e.target.value)}>
          {items.map((it) => (
            <option key={it.id} value={it.slug}>
              {it.name}
            </option>
          ))}
        </select>
      </label>
      {alternative && (
        <button
          type="button"
          aria-pressed={variant}
          onClick={() => setVariant(!variant)}
        >
          {alternative.label} 예시
        </button>
      )}
      {!dashboard && (
        <ReadingPreview product={p} sample={p.example || samples[p.slug]} />
      )}
      {p.input ? (
        <>
          {p.reason && <p>{p.reason}</p>}
          <p>{p.inputHelp}</p>
          <h3>가상 입력</h3>
          <pre tabIndex={0}>{JSON.stringify(p.input, null, 2)}</pre>
          <h3>응답 JSON</h3>
          <pre tabIndex={0}>
            {JSON.stringify(p.example || samples[p.slug], null, 2)}
          </pre>
          <h3>서버에서 호출하기</h3>
          <pre tabIndex={0}>{cmd}</pre>
          <button
            onClick={() =>
              perform(async () => {
                await navigator.clipboard.writeText(cmd);
                setMessage("cURL을 복사했습니다.");
              })
            }
          >
            cURL 복사
          </button>
        </>
      ) : (
        <p>{p.reason}</p>
      )}
    </section>
  );
  return (
    <>
      {mode === "landing" && (
        <section id="pricing">
          <h2>상품별 요금</h2>
          <p>{limitNotice}</p>
          <UsageTerms />
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />{" "}
            상업 이용 범위와 환불 정책을 확인했습니다.
          </label>
          <p className="biz-message" role="status">
            {message}
          </p>
          <div className="biz-cards">
            {items.map((it) => {
              const owned = account?.products.find((o) => o.id === it.id);
              const pending = owned?.pending.length > 0;
              return (
                <article
                  key={it.id}
                  className="biz-card"
                  aria-current={slug === it.slug ? "true" : undefined}
                >
                  <h3>{it.name}</h3>
                  <strong>{it.priceKRW.toLocaleString("ko-KR")}원</strong>
                  <small>1개월 이용 · 자동결제 없음</small>
                  {now && (
                    <small>
                      예상 만료{" "}
                      {kst(
                        addKstMonth(
                          Math.max(now, Date.parse(owned?.expiresAt) || 0),
                        ),
                      )}
                    </small>
                  )}
                  {pending ? (
                    <a href={base + "dashboard/"}>결제 확인 중 · 내 API 관리</a>
                  ) : (
                    <button
                      className="biz-primary"
                      disabled={busy || !catalog || account === undefined || !!it.reason}
                      onClick={() =>
                        perform(async () => {
                          choose(it.slug);
                          await buy(it);
                        })
                      }
                    >
                      {it.name} 1개월 구매 ·{" "}
                      {it.priceKRW.toLocaleString("ko-KR")}원
                    </button>
                  )}
                  <p>{it.use}</p>
                  <p>{it.fields ? "반환 항목 · " + it.fields : it.reason}</p>
                  {it.fields && it.reason && <small>{it.reason}</small>}
                  <a href="#examples" onClick={() => choose(it.slug)}>
                    {it.input ? "입력·응답 보기" : "상품 설명 보기"}
                  </a>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {dashboard && (
        <section>
          <h2>상품 이용 현황</h2>
          {!account ? (
            <p>계정을 확인하고 있습니다.</p>
          ) : (
            <>
              <div className="biz-cards">
                {account.products.map((row) => {
                  const it = items.find((it) => it.id === row.id);
                  return (
                    <article key={row.id} className="biz-card">
                      <h3>{it.name}</h3>
                      <strong>
                        {Date.parse(row.expiresAt) > Date.now()
                          ? "활성"
                          : row.expiresAt
                            ? "만료"
                            : "미구매"}
                      </strong>
                      <p>
                        {row.expiresAt ? "만료 " + kst(row.expiresAt) : ""} ·
                        누적 호출 {row.usage}회
                      </p>
                      {row.pending.length ? (
                        <div>
                          결제 확인 중
                          {row.pending.map((id) => (
                            <button
                              key={id}
                              disabled={busy}
                              onClick={() =>
                                perform(async () => {
                                  try {
                                    await call(
                                      "/api/payments/orders/" +
                                        encodeURIComponent(id) +
                                        "/confirm",
                                      "POST",
                                    );
                                    await refresh();
                                  } catch (e) {
                                    if (e.code === "PG_PAYMENT_NOT_PAID")
                                      await buy(it, id);
                                    else {
                                      await refresh();
                                      throw e;
                                    }
                                  }
                                })
                              }
                            >
                              기존 주문 확인·계속하기
                            </button>
                          ))}
                        </div>
                      ) : (
                        <a href={base + "?product=" + it.slug + "#pricing"}>
                          {row.expiresAt ? "연장 구매" : "요금 보기"}
                        </a>
                      )}
                    </article>
                  );
                })}
              </div>
              <button
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    for (const id of account.products.flatMap((r) => r.pending))
                      await call(
                        "/api/payments/orders/" +
                          encodeURIComponent(id) +
                          "/confirm",
                        "POST",
                      ).catch(() => {});
                    await refresh();
                    setMessage("이용 상태를 새로 확인했습니다.");
                  })
                }
              >
                상태 새로고침
              </button>
              <h2>서버 API 키</h2>
              <p>
                발급한 키는 이 화면에서 한 번만 확인할 수 있습니다. 재발급하면
                이전 키는 즉시 폐기됩니다.
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    setSecret("");
                    const data = await call("/api/business/key", "POST");
                    setSecret(data.key);
                    await refresh();
                  })
                }
              >
                {account.keyIssuedAt ? "키 재발급" : "키 발급"}
              </button>{" "}
              {account.keyIssuedAt && (
                <button
                  disabled={busy}
                  onClick={() =>
                    perform(async () => {
                      await call("/api/business/key", "DELETE");
                      setSecret("");
                      await refresh();
                      setMessage("키를 폐기했습니다.");
                    })
                  }
                >
                  키 폐기
                </button>
              )}
              {secret && (
                <p>
                  <output>{secret}</output>
                </p>
              )}
            </>
          )}
        </section>
      )}
      {example}
      {mode !== "landing" && <p>{limitNotice}</p>}
      {mode === "docs" && (
        <section>
          <p><a href="/licenses/astronomy-engine.txt">천문 계산 라이브러리 라이선스</a></p>
          <h2>오류 응답</h2>
          <p>
            400 INVALID_INPUT · 입력값을 확인하세요. 401 INVALID_KEY · 키를
            확인하세요. 403 NO_ENTITLEMENT · 해당 상품의 이용 기간을 확인하세요.
            403 UNAVAILABLE · 제공 준비 중입니다. 429 RATE_LIMIT · Retry-After
            이후 다시 호출하세요. 503 TEMPORARY_FAILURE · 잠시 후 다시
            시도하세요.
          </p>
          <UsageTerms />
        </section>
      )}
      {mode !== "landing" && (
        <p className="biz-message" role="status">
          {message}
        </p>
      )}
    </>
  );
}
