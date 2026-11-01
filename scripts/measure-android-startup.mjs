// Repeatable native launch measurements. Only a separate, mock-only benchmark
// package may be launched; never stop or overwrite the user's installed app.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseMeminfo, resolveAdb } from './measure-app-memory.mjs';

export function launchTime(output) {
  if (!/^Status:\s*ok\s*$/m.test(output)) throw new Error('Android launch failed');
  const match = /^TotalTime:\s*(\d+)\s*$/m.exec(output);
  if (!match || Number(match[1]) <= 0) throw new Error('Android launch timing is missing');
  return Number(match[1]);
}

export function warmLaunchTime(output) {
  if (/^Status:\s*ok\s*$/m.test(output) && !/^TotalTime:\s*[1-9]\d*\s*$/m.test(output)) return null;
  return launchTime(output);
}

export function summarize(values) {
  if (!values.length || values.some(value => !Number.isFinite(value))) throw new Error('Missing measurement samples');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return { samples: values, median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2, min: sorted[0], max: sorted.at(-1) };
}

async function main() {
  const args = process.argv.slice(2);
  const option = (name, fallback = '') => {
    const index = args.indexOf(name);
    return index < 0 ? fallback : args[index + 1];
  };
  const packageName = option('--package');
  if (!/^com\.codedestiny\.app\.benchmark$/.test(packageName || '')) throw new Error('Use the isolated com.codedestiny.app.benchmark package with mocked APIs');
  const serial = option('--serial');
  if (!serial) throw new Error('--serial is required');
  const runs = Number(option('--runs', '5'));
  if (!Number.isInteger(runs) || runs < 5 || runs > 20) throw new Error('--runs must be 5–20');
  const adbPath = resolveAdb();
  const adb = (...command) => execFileSync(adbPath, ['-s', serial, ...command], { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  const info = adb('shell', 'dumpsys', 'package', packageName);
  if (!info.includes(`Package [${packageName}]`)) throw new Error('Benchmark app is not installed');
  const component = `${packageName}/com.codedestiny.app.MainActivity`;
  const cold = [], warm = [];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  try {
    for (let run = 0; run < runs; run += 1) {
      adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
      adb('shell', 'am', 'force-stop', packageName);
      cold.push(launchTime(adb('shell', 'am', 'start', '-W', '-n', component)));
      await delay(3000);
      adb('shell', 'input', 'keyevent', 'KEYCODE_HOME');
      await delay(500);
      const resumed = adb('shell', 'am', 'start', '-W', '-n', component);
      // Some Android versions report 0 when an existing singleTask is brought
      // forward. That is an unavailable draw timing, never a zero-ms launch.
      const warmMs = warmLaunchTime(resumed);
      if (warmMs !== null) warm.push(warmMs);
      await delay(1000);
    }
    const foreground = parseMeminfo(adb('shell', 'dumpsys', 'meminfo', packageName));
    if (foreground.totalPssKb == null) throw new Error('Foreground memory sample is missing');
    adb('shell', 'input', 'keyevent', 'KEYCODE_HOME');
    await delay(5000);
    const background = parseMeminfo(adb('shell', 'dumpsys', 'meminfo', packageName));
    const report = {
      measuredAt: new Date().toISOString(), package: packageName,
      build: option('--build', 'unspecified'), label: option('--label', 'measurement'),
      model: adb('shell', 'getprop', 'ro.product.model').trim(),
      android: adb('shell', 'getprop', 'ro.build.version.release').trim(),
      versionCode: /versionCode=(\d+)/.exec(info)?.[1],
      // am start -W measures activity launch, not web content readiness/TTFD.
      activityLaunchMs: { cold: summarize(cold), warm: warm.length ? summarize(warm) : null },
      warmTimingUnavailable: runs - warm.length,
      memory: { foreground, background },
    };
    const output = option('--out');
    if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    adb('shell', 'am', 'force-stop', packageName);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`[measure-android-startup] ${error.message}`); process.exitCode = 1; });
}
