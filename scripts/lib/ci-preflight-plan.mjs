// CI YAML remains the command registry. Unknown execution settings fail closed.
export function ciPreflightPlan(workflow, tier) {
  if (!["fast", "standard", "critical"].includes(tier)) throw new Error("Unknown CI tier");
  const lanes = new Set(["classify", "landing-order", "fast", "guards", "critical", "build"]);
  if (workflow.jobs?.["ci-required"]?.needs?.some(lane => !lanes.has(lane))) throw new Error("Unsupported required CI lane");
  const commands = [];
  for (const lane of ["fast", "guards", "critical", "build"]) {
    const job = workflow.jobs?.[lane];
    if (!job?.steps || job.if || job.env) throw new Error(`Unsupported CI lane: ${lane}`);
    for (const step of job.steps) {
      if (!step.run) {
        if (!/^actions\/(?:checkout|setup-node|cache)@/.test(step.uses || "")) throw new Error(`Unsupported CI action: ${step.uses}`);
        continue; // Checkout, dependency/cache setup is provided by the snapshot.
      }
      const source = step.run.trim();
      if (source === "npm ci" || source === "npx playwright install --with-deps chromium" || /^echo "::notice::[^"\r\n]*"$/.test(source)) continue;
      const expected = lane === "build" ? "needs.classify.outputs.runs_build == 'true' && github.event.pull_request.draft != true" : lane === "critical" ? "needs.classify.outputs.runs_critical == 'true'" : undefined;
      if (step.if !== expected || step.shell || step["working-directory"] || step["continue-on-error"]) throw new Error(`Unsupported CI step: ${step.name}`);
      if (Object.entries(step.env || {}).some(([key, value]) => !(key === "GITHUB_TOKEN" || key === "NEXT_WEBPACK_FS_CACHE" && value === "1" || key === "PR_BASE_SHA" || key === "PR_HEAD_SHA"))) throw new Error(`Unsupported CI environment: ${step.name}`);
      if (lane === "build" && tier === "fast" || lane === "critical" && tier !== "critical") continue;
      for (const line of source.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith("#"))) {
        if (!/^(?:npm (?:test|run (?:ci:fast|lint(?::changed)?|typecheck|test:(?:node|jest)|build:(?:cf|worker)|smoke:core|verify:[\w-]+)(?: -- [\w -]+)?)|node scripts\/(?:verify-[\w-]+|i18n-check|apply-staging-noindex)\.mjs(?: [\w -]+)?)$/.test(line)
          || /--(?:live|production|repair|apply|update|ci|yes)\b/.test(line)
          || /apply-staging-noindex/.test(line) && !line.includes("--self-test")
          || /verify:deployed-sha/.test(line) && !line.includes("--self-test")) throw new Error(`Unsupported CI command: ${line}`);
        if (!commands.includes(line)) commands.push(line);
      }
    }
  }
  return commands;
}

export function validatedPrArguments(args, branch) {
  if (args.some(arg => /^(?:--(?:head|base|repo)(?:=|$)|-[HBR])/.test(arg))) throw new Error("PR source, target and repository must match preflight; do not override --head/--base/--repo.");
  return ["pr", "create", "--base", "main", "--head", branch, ...args];
}
