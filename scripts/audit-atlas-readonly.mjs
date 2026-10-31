// Atlas Admin API 읽기 전용 스냅샷 감사. GET만 보내며 키는 셸 환경변수에서만 읽는다.
// 실행: npm run audit:atlas-readonly  (ATLAS_PUBLIC_KEY, ATLAS_PRIVATE_KEY, ATLAS_ORG_ID, ATLAS_GROUP_ID)
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createAtlasReadonlyClient, redactAtlasSnapshot } from "./lib/atlas-readonly-client.mjs";

export const SNAPSHOT_ROOT = "D:\\Development\\code-destiny-backups\\atlas-snapshots";
export const REQUIRED_ENV = ["ATLAS_PUBLIC_KEY", "ATLAS_PRIVATE_KEY", "ATLAS_ORG_ID", "ATLAS_GROUP_ID"];
export const OPCOUNTERS = ["OPCOUNTER_QUERY", "OPCOUNTER_INSERT", "OPCOUNTER_UPDATE", "OPCOUNTER_DELETE", "OPCOUNTER_GETMORE", "OPCOUNTER_CMD"];
export const METRICS = [
  "CONNECTIONS", ...OPCOUNTERS,
  "NETWORK_BYTES_IN", "NETWORK_BYTES_OUT", "NETWORK_NUM_REQUESTS",
  "SYSTEM_NORMALIZED_CPU_USER", "PROCESS_CPU_USER",
  "QUERY_TARGETING_SCANNED_OBJECTS_PER_RETURNED",
  "DISK_PARTITION_SPACE_USED_DATA", "LOGICAL_SIZE",
];
const MEASUREMENT_QUERY = "granularity=PT1H&period=P30D";
const GB = 1e9;

// ---- 순수 계산 -------------------------------------------------------------

export function percentile(sortedValues, p) {
  if (!sortedValues.length) return null;
  const rank = Math.max(1, Math.ceil((p / 100) * sortedValues.length));
  return sortedValues[rank - 1];
}

export function stats(values) {
  const v = values.filter((x) => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  return { p50: percentile(v, 50), p95: percentile(v, 95), max: v[v.length - 1], count: v.length };
}

const pointsOf = (measurement) => (measurement?.dataPoints || []).filter((d) => typeof d.value === "number");

// 같은 timestamp의 지표 여러 개를 합한다(ops/s 합계).
export function sumSeries(seriesList) {
  const byTime = new Map();
  for (const points of seriesList) for (const d of points) byTime.set(d.timestamp, (byTime.get(d.timestamp) || 0) + d.value);
  return [...byTime.values()];
}

// 시간당 샘플의 초당 속도를 UTC 일 단위 GB로 바꾼다. 24개 미만인 부분 일자는 제외한다.
export function dailyGb(points, units) {
  const perSecond = /PER_SECOND/i.test(units || "BYTES_PER_SECOND");
  const days = new Map();
  for (const d of points) {
    const day = String(d.timestamp).slice(0, 10);
    const entry = days.get(day) || { bytes: 0, n: 0 };
    entry.bytes += perSecond ? d.value * 3600 : d.value;
    entry.n += 1;
    days.set(day, entry);
  }
  return [...days.values()].filter((e) => e.n >= 24).map((e) => e.bytes / GB);
}

const round = (n, d = 2) => (n === null || n === undefined ? null : Number(n.toFixed(d)));
const roundStats = (s, scale = 1, d = 2) => (s ? { p50: round(s.p50 / scale, d), p95: round(s.p95 / scale, d), max: round(s.max / scale, d), count: s.count } : null);

export function summarizeNode(processInfo, measurementsByName) {
  const m = measurementsByName;
  if (!m || m.unavailable) return { process: processInfo, unavailable: m?.unavailable || "측정 없음" };
  const metric = (name) => (m[name] && !m[name].unavailable ? m[name] : null);
  const valuesOf = (name) => pointsOf(metric(name)).map((d) => d.value);
  const ops = OPCOUNTERS.map(metric).filter(Boolean).map(pointsOf);
  const out = metric("NETWORK_BYTES_OUT");
  return {
    process: processInfo,
    connections: roundStats(stats(valuesOf("CONNECTIONS")), 1, 0),
    opsPerSecTotal: ops.length ? roundStats(stats(sumSeries(ops))) : null,
    netOutGbPerDay: out ? roundStats(stats(dailyGb(pointsOf(out), out.units))) : null,
    cpuPercentSystemNormalizedUser: roundStats(stats(valuesOf("SYSTEM_NORMALIZED_CPU_USER"))),
    cpuPercentProcessUser: roundStats(stats(valuesOf("PROCESS_CPU_USER"))),
    scannedObjectsPerReturned: roundStats(stats(valuesOf("QUERY_TARGETING_SCANNED_OBJECTS_PER_RETURNED"))),
    diskUsedDataGb: roundStats(stats(valuesOf("DISK_PARTITION_SPACE_USED_DATA")), GB),
    logicalSizeGb: roundStats(stats(valuesOf("LOGICAL_SIZE")), GB),
  };
}

export function classifySku(sku) {
  const s = String(sku || "").toUpperCase();
  if (/DATA_TRANSFER/.test(s)) return "dataTransfer";
  if (/BACKUP|SNAPSHOT|PIT_RESTORE|PITR/.test(s)) return "backup";
  if (/INSTANCE|CLUSTER|STORAGE|IOPS|CPU|RAM|SERVERLESS/.test(s)) return "cluster";
  return "other";
}

export function summarizeInvoice(invoice) {
  const buckets = { cluster: 0, backup: 0, dataTransfer: 0, other: 0 };
  const bySku = {};
  for (const item of invoice.lineItems || []) {
    const dollars = (item.totalPriceCents || 0) / 100;
    const sku = item.sku || "unknown";
    buckets[classifySku(item.sku)] += dollars;
    bySku[sku] = round((bySku[sku] || 0) + dollars);
  }
  return {
    id: invoice.id,
    period: [invoice.startDate, invoice.endDate],
    status: invoice.statusName,
    amountBilledUsd: round((invoice.amountBilledCents || 0) / 100),
    byCategoryUsd: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, round(v)])),
    bySkuUsd: bySku,
  };
}

const compute = (rc) => rc?.autoScaling?.compute;
export function summarizeCluster(cluster, schedule, snapshots) {
  const regionConfigs = (cluster.replicationSpecs || []).flatMap((s) => s.regionConfigs || []);
  const first = regionConfigs[0];
  const scheduleOk = schedule && !schedule.unavailable;
  const items = scheduleOk ? (schedule.policies || []).flatMap((p) => p.policyItems || []) : null;
  const snaps = snapshots && !snapshots.unavailable ? snapshots.results || [] : null;
  return {
    name: cluster.name,
    instanceSize: first?.electableSpecs?.instanceSize ?? null,
    diskSizeGB: first?.electableSpecs?.diskSizeGB ?? null,
    mongoDBVersion: cluster.mongoDBVersion ?? null,
    autoScaling: {
      computeEnabled: compute(first)?.enabled ?? null,
      scaleDownEnabled: compute(first)?.scaleDownEnabled ?? null,
      minInstanceSize: compute(first)?.minInstanceSize ?? null,
      maxInstanceSize: compute(first)?.maxInstanceSize ?? null,
      diskGBEnabled: first?.autoScaling?.diskGB?.enabled ?? null,
    },
    backupEnabled: cluster.backupEnabled ?? null,
    pitEnabled: cluster.pitEnabled ?? null,
    restoreWindowDays: scheduleOk ? schedule.restoreWindowDays ?? null : null,
    snapshotPolicy: items
      ? items.map((i) => ({ frequencyType: i.frequencyType, frequencyInterval: i.frequencyInterval, retention: `${i.retentionValue} ${i.retentionUnit}` }))
      : schedule?.unavailable || null,
    snapshotCount: snaps ? snaps.length : snapshots?.unavailable || null,
  };
}

const rows = (section) => (section && !section.unavailable ? section.results || [] : null);
const unavailable = (section) => section?.unavailable ? section : { unavailable: "수집 안 됨" };

export function summarizeSnapshot(raw) {
  const clusters = rows(raw.clusters);
  const processes = rows(raw.processes);
  const accessList = rows(raw.accessList);
  const users = rows(raw.databaseUsers);
  const alerts = rows(raw.alertConfigs);
  const audit = raw.auditLog && !raw.auditLog.unavailable ? raw.auditLog : null;
  return {
    capturedAt: raw.capturedAt,
    clusters: clusters ? clusters.map((c) => summarizeCluster(c, raw.backupSchedules?.[c.name], raw.backupSnapshots?.[c.name])) : unavailable(raw.clusters),
    nodes: processes ? processes.map((p) => summarizeNode({ id: p.id, typeName: p.typeName }, raw.measurements?.[p.id])) : unavailable(raw.processes),
    invoices: raw.invoices && !raw.invoices.unavailable ? (raw.invoices.details || []).map(summarizeInvoice) : unavailable(raw.invoices),
    accessList: accessList || unavailable(raw.accessList),
    dbUsers: users ? users.map((u) => ({ username: u.username, authDatabase: u.databaseName, roles: u.roles })) : unavailable(raw.databaseUsers),
    alertConfigCount: alerts ? alerts.length : unavailable(raw.alertConfigs),
    auditLog: audit ? { enabled: audit.enabled ?? null, auditAuthorizationSuccess: audit.auditAuthorizationSuccess ?? null } : unavailable(raw.auditLog),
  };
}

// ---- 수집 ------------------------------------------------------------------

async function guarded(fn) {
  try {
    return await fn();
  } catch (err) {
    const status = err?.status;
    if (status === 401 || status === 403) return { unavailable: `권한 없음 (HTTP ${status})` };
    return { unavailable: status ? `조회 실패 (HTTP ${status})` : `조회 실패 (${err?.code || err?.name || "error"})` };
  }
}

export async function collectSnapshot(client, { orgId, groupId, now = new Date() }) {
  const g = encodeURIComponent(groupId);
  const o = encodeURIComponent(orgId);
  const raw = { capturedAt: now.toISOString(), orgId, groupId };

  raw.clusters = await guarded(() => client.get(`/groups/${g}/clusters`));
  raw.processes = await guarded(() => client.get(`/groups/${g}/processes`));
  raw.accessList = await guarded(() => client.get(`/groups/${g}/accessList`));
  raw.databaseUsers = await guarded(() => client.get(`/groups/${g}/databaseUsers`));
  raw.alertConfigs = await guarded(() => client.get(`/groups/${g}/alertConfigs`));
  raw.auditLog = await guarded(() => client.get(`/groups/${g}/auditLog`));

  raw.backupSchedules = {};
  raw.backupSnapshots = {};
  for (const c of rows(raw.clusters) || []) {
    const name = encodeURIComponent(c.name);
    raw.backupSchedules[c.name] = await guarded(() => client.get(`/groups/${g}/clusters/${name}/backup/schedule`));
    raw.backupSnapshots[c.name] = await guarded(() => client.get(`/groups/${g}/clusters/${name}/backup/snapshots?itemsPerPage=100`));
  }

  // 지표 하나가 이 프로세스에서 지원되지 않아도 나머지가 살도록 지표별로 요청한다.
  raw.measurements = {};
  for (const p of rows(raw.processes) || []) {
    const perMetric = {};
    for (const metric of METRICS) {
      const res = await guarded(() => client.get(`/groups/${g}/processes/${encodeURIComponent(p.id)}/measurements?${MEASUREMENT_QUERY}&m=${metric}`));
      perMetric[metric] = res.unavailable ? res : (res.measurements || []).find((x) => x.name === metric) || { unavailable: "응답에 지표 없음" };
    }
    raw.measurements[p.id] = perMetric;
  }

  const list = await guarded(() => client.get(`/orgs/${o}/invoices?itemsPerPage=100`));
  if (list.unavailable) {
    raw.invoices = list;
  } else {
    const recent = [...(list.results || [])].sort((a, b) => String(b.startDate).localeCompare(String(a.startDate))).slice(0, 3);
    const details = [];
    for (const inv of recent) {
      const detail = await guarded(() => client.get(`/orgs/${o}/invoices/${encodeURIComponent(inv.id)}`));
      if (!detail.unavailable) details.push(detail);
    }
    raw.invoices = { list: recent, details };
  }
  return raw;
}

// ---- 출력 ------------------------------------------------------------------

const fmt = (s) => (s ? `${s.p50} / ${s.p95} / ${s.max}` : "-");
export function printSummary(summary, log = console.log, table = console.table) {
  const section = (title, value, toRows) => {
    log(`\n[${title}]`);
    if (Array.isArray(value)) table(toRows(value));
    else log(value?.unavailable ?? "-");
  };
  log(`\nAtlas 읽기 전용 스냅샷 (${summary.capturedAt})`);
  section("클러스터", summary.clusters, (list) => list.map((c) => ({ name: c.name, size: c.instanceSize, diskGB: c.diskSizeGB, autoScale: c.autoScaling.computeEnabled, scaleDown: c.autoScaling.scaleDownEnabled, max: c.autoScaling.maxInstanceSize, backup: c.backupEnabled, pitr: c.pitEnabled, snapshots: c.snapshotCount })));
  section("노드 30일 p50 / p95 / max", summary.nodes, (list) => list.map((n) => ({ node: n.process.id, role: n.process.typeName, connections: n.unavailable || fmt(n.connections), "ops/s": fmt(n.opsPerSecTotal), "netOut GB/day": fmt(n.netOutGbPerDay), "cpu% (sys norm user)": fmt(n.cpuPercentSystemNormalizedUser) })));
  section("청구서 USD", summary.invoices, (list) => list.map((i) => ({ period: `${String(i.period[0]).slice(0, 10)}~${String(i.period[1]).slice(0, 10)}`, billed: i.amountBilledUsd, ...i.byCategoryUsd })));
  section("접근 목록", summary.accessList, (list) => list.map((r) => ({ cidr: r.cidrBlock || r.ipAddress || r.awsSecurityGroup, comment: r.comment })));
  section("DB 사용자 역할", summary.dbUsers, (list) => list.map((u) => ({ username: u.username, roles: (u.roles || []).map((r) => `${r.roleName}@${r.databaseName}`).join(", ") })));
}

function stamp(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export async function main(env = process.env, { fetchImpl, outRoot = SNAPSHOT_ROOT, now = new Date() } = {}) {
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length) {
    console.error(`필수 환경변수가 없습니다: ${missing.join(", ")}`);
    return 1;
  }
  const client = createAtlasReadonlyClient({ publicKey: env.ATLAS_PUBLIC_KEY, privateKey: env.ATLAS_PRIVATE_KEY, fetchImpl });
  const raw = await collectSnapshot(client, { orgId: env.ATLAS_ORG_ID, groupId: env.ATLAS_GROUP_ID, now });
  const summary = redactAtlasSnapshot(summarizeSnapshot(raw));

  const dir = path.join(outRoot, stamp(now));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "raw.json"), `${JSON.stringify(raw, null, 2)}\n`);
  await writeFile(path.join(dir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  printSummary(summary);
  console.log(`\n저장: ${dir} (raw.json은 원본이므로 커밋하지 않는다)`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => { process.exitCode = code; }).catch((err) => {
    console.error(`audit-atlas-readonly 실패: ${err?.message || err}`);
    process.exitCode = 1;
  });
}
