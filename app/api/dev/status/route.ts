import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

async function runGit(args: string[]) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      timeout: 1200,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const now = new Date();

  const [branch, commit, status, diffStat] = await Promise.all([
    runGit(["rev-parse", "--abbrev-ref", "HEAD"]),
    runGit(["rev-parse", "HEAD"]),
    runGit(["status", "--porcelain=v1", "-b"]),
    runGit(["diff", "--stat"]),
  ]);

  return NextResponse.json(
    {
      ok: true,
      serverTime: now.toISOString(),
      nodeEnv: process.env.NODE_ENV,
      node: process.version,
      // Helps when reverse proxies are involved.
      request: {
        pathname: url.pathname,
        search: url.search,
      },
      git: {
        branch,
        commit,
        status,
        diffStat,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    },
  );
}

