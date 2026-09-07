import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Read-only GitHub metadata. Never collect logs, request headers, or secret values.
const args = process.argv.slice(2);
const value = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const repo = value('repo') || 'rei1237/codedestiny';
if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Invalid repository');
const token = process.env.GH_TOKEN;
if (value('env-file')) throw new Error('Credential files are not accepted; use an explicitly authorized GH_TOKEN');
if (!token) throw new Error('GitHub authentication unavailable');
async function get(path) {
  const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`GitHub metadata HTTP ${response.status}`);
  return response.json();
}
const seconds = (start, end) => start && end ? Math.max(0, (Date.parse(end) - Date.parse(start)) / 1000) : null;
const prs = await get('pulls?state=closed&sort=updated&direction=desc&per_page=30');
const output = { measuredAt: new Date().toISOString(), repository: repo, cacheHitStatus: 'unavailable_without_logs', pullRequests: [] };
for (const pr of prs) {
  const runs = await get(`actions/runs?event=pull_request&head_sha=${pr.head.sha}&per_page=100`);
  const entry = { number: pr.number, sha: pr.head.sha, runs: [] };
  for (const run of runs.workflow_runs.filter((item) => item.status === 'completed')) {
    const jobs = [];
    for (let page = 1; ; page++) {
      const response = await get(`actions/runs/${run.id}/jobs?per_page=100&page=${page}`);
      jobs.push(...response.jobs);
      if (response.jobs.length < 100) break;
    }
    entry.runs.push({ id: run.id, name: run.name, conclusion: run.conclusion,
      queueSeconds: seconds(run.created_at, run.run_started_at),
      elapsedSeconds: seconds(run.run_started_at, run.updated_at),
      jobs: jobs.map((job) => ({ name: job.name, conclusion: job.conclusion,
        seconds: seconds(job.started_at, job.completed_at),
        steps: job.steps.map((step) => ({ name: step.name, conclusion: step.conclusion, seconds: seconds(step.started_at, step.completed_at) })) })) });
  }
  output.pullRequests.push(entry);
}
writeFileSync(resolve(value('output') || 'docs/dev-ci-metrics.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ pullRequests: output.pullRequests.length, runs: output.pullRequests.reduce((sum, pr) => sum + pr.runs.length, 0), cacheHitStatus: output.cacheHitStatus }));
