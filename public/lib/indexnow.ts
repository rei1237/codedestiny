/**
 * IndexNow (https://www.indexnow.org/) — notify search engines of URL changes.
 * Key file must be served at https://{host}/{key}.txt (see public/).
 */

export const INDEXNOW_HOST = "code-destiny.com";

/** Bing-generated key; also the public filename (without .txt). */
export const INDEXNOW_KEY = "5bc08c66f3854c4bb6591216cfa84d29";

export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

export async function submitIndexNowUrls(urls: string[]): Promise<Response> {
  if (urls.length === 0) {
    throw new Error("IndexNow: urlList is empty");
  }
  const body = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: urls,
  };
  return fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
}
