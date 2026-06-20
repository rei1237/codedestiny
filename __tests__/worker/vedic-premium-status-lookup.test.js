/**
 * @jest-environment node
 */

const { execFileSync } = require("child_process");

function buildQueryInNode(payload) {
  const script = `
    const mod = await import('./worker/routes/astro.js');
    const query = mod.buildVedicPremiumStatusLookupQuery(${JSON.stringify(payload)});
    console.log(JSON.stringify(query));
  `;
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
  }));
}

describe("vedic premium status lookup", () => {
  test("uses both sessionId and reportId so archived PDF results do not fall through to 404", () => {
    const query = buildQueryInNode({
      userId: "507f1f77bcf86cd799439011",
      sessionId: "stale-session",
      reportId: "vedic-report-live",
    });

    expect(query).toMatchObject({
      userId: "507f1f77bcf86cd799439011",
      $and: [
        {
          $or: expect.arrayContaining([
            { sessionId: "stale-session" },
            { "metadata.archive.sessionId": "stale-session" },
            { reportId: "vedic-report-live" },
            { "metadata.archive.reportId": "vedic-report-live" },
          ]),
        },
        {
          $or: expect.arrayContaining([
            { reportType: "vedicPremium" },
            { "metadata.serviceKey": "vedic-premium" },
            { "metadata.archive.reportType": "vedic_book" },
          ]),
        },
      ],
    });
  });
});
