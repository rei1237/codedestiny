import {
  HEAD as consumeHead,
  OPTIONS as consumeOptions,
  PATCH as consumePatch,
  POST as consumePost,
  PUT as consumePut,
  DELETE as consumeDelete,
} from "../../fortune/pig-coin/consume/route";

export const runtime = "nodejs";

export async function POST(request) {
  return consumePost(request);
}

export async function PUT(request) {
  return consumePut(request);
}

export async function PATCH(request) {
  return consumePatch(request);
}

export async function DELETE(request) {
  return consumeDelete(request);
}

export async function OPTIONS(request) {
  return consumeOptions(request);
}

export async function HEAD(request) {
  return consumeHead(request);
}
