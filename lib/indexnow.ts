/**
 * IndexNow (https://www.indexnow.org/) — notify search engines of URL changes.
 * Key file must be served at https://{host}/{key}.txt (see public/).
 */

export const INDEXNOW_HOST = "code-destiny.com";

/** Bing-generated key; also the public filename (without .txt). */
export const INDEXNOW_KEY = "5bc08c66f3854c4bb6591216cfa84d29";

export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

// scripts/indexnow-submit.mjs 가 이 줄을 정규식으로 읽어 엔드포인트로 쓴다(지우지 말 것).
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
