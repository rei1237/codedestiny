import { readThroughCredentialCache } from "../lib/credential-scoped-cache.js";

export async function handleYeongnyangiProfiles(request, env) {
  const handler = async () => {
    const { handleYeongnyangiProfileRoutes } = await import("./profile.js");
    return handleYeongnyangiProfileRoutes(request, env);
  };
  if (request.method.toUpperCase() !== "GET") return handler();
  return readThroughCredentialCache({
    request,
    env,
    prefix: "yeongnyangi-profile-list:v1",
    handler,
    isCacheable: body => body.ok === true && Array.isArray(body.profiles),
  });
}
