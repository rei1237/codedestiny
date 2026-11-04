import { STAGING_ORIGIN } from "../../lib/editions/staging.mjs";
import { createHttpError, json, readJson } from "../lib/http.js";

const key = "edition-workshop/v1/products.json";
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;

function storage(request, env) {
  if (env.APP_ENV !== "staging" || new URL(request.url).origin !== STAGING_ORIGIN) {
    throw createHttpError(404, "공방을 찾을 수 없어요.");
  }
  if (!env.INSIGHT_IMAGES_BUCKET) throw createHttpError(503, "상품 보관함에 연결하지 못했어요.");
  return env.INSIGHT_IMAGES_BUCKET;
}

export async function readIssueQueue(request, env) {
  if (request.method !== "GET") return json({}, {status:405});
  const object = await storage(request, env).get(key);
  const products = object ? await object.json() : [];
  return json({version:1, products:products.filter(product => product.issueCount > 0)});
}

export async function manageEditions(request, env, dispatch) {
  const bucket = storage(request, env);
  const previous = await bucket.get(key);
  const products = previous ? await previous.json() : [];
  if (request.method === "GET") return json({products});
  if (request.method !== "POST") return json({}, {status:405});
  const body = await readJson(request);
  if (!uuid.test(body.id)) throw createHttpError(400, "상품 식별자를 확인해 주세요.");
  const product = products.find(item => item.id === body.id);
  if (body.action === "add") {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 80 || !["yeoni","cat"].includes(body.character) ||
        !Number.isInteger(body.cap) || body.cap < 1 || body.cap > 100) {
      throw createHttpError(400, "상품명과 캐릭터, 발행 한도(1~100개)를 확인해 주세요.");
    }
    if (product) {
      if (product.title === title && product.cap === body.cap && product.character === body.character) return json({products});
      throw createHttpError(409, "이미 다른 상품이 저장됐어요. 목록을 새로고침해 주세요.");
    }
    if (products.length >= 100) throw createHttpError(409, "테스트 상품은 100개까지 등록할 수 있어요.");
    products.unshift({id:body.id,title,character:body.character,cap:body.cap,issueCount:0,portraitVersion:2});
  } else if (body.action === "mint") {
    if (!product) throw createHttpError(404, "상품을 찾을 수 없어요.");
    if (!Number.isInteger(body.serial) || body.serial < 1 || body.serial > product.cap || body.serial > product.issueCount+1) {
      throw createHttpError(409, "다음 발행 번호와 남은 한도를 확인해 주세요.");
    }
    if (body.serial <= product.issueCount) return json({products});
    product.issueCount = body.serial;
  } else {
    throw createHttpError(400, "상품 추가 또는 발행을 선택해 주세요.");
  }
  const onlyIf = previous ? {etagMatches:previous.etag} : new Headers({"If-None-Match":"*"});
  if (!await bucket.put(key, JSON.stringify(products), {onlyIf})) {
    throw createHttpError(409, "다른 창에서 목록을 변경했어요. 새로고침한 뒤 다시 시도해 주세요.");
  }
  if (body.action === "mint") {
    try {
      await dispatch();
      return json({products, notice:"발행을 접수했어요. 테스트 체인 검증이 끝나면 QR이 열려요."});
    } catch {
      return json({products, notice:"발행을 접수했어요. 다음 스테이징 예약 실행에서 처리해요."});
    }
  }
  return json({products});
}
