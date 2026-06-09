import type { NaukriScrapedJob } from "./types.js";

type JsonRecord = Record<string, unknown>;

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pickString(obj: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function stableIdFromRecord(obj: JsonRecord, url?: string): string | null {
  const direct = pickString(obj, [
    "jobId",
    "jobid",
    "id",
    "jdId",
    "jdID",
    "job_id",
  ]);
  if (direct && /^\d{6,}$/.test(direct)) return direct;

  const href = pickString(obj, ["jobUrl", "jobURL", "url", "jdURL", "jdUrl"]) ?? url;
  if (href) {
    const m = href.match(/job-listings-(\d+)|jobid[=/-](\d+)|(\d{8,})/i);
    if (m) return m[1] ?? m[2] ?? m[3] ?? null;
  }
  return null;
}

function mapRecordToJob(
  obj: JsonRecord,
  source: "search" | "recommended",
  index: number
): NaukriScrapedJob | null {
  const title = pickString(obj, ["title", "jobTitle", "designation", "name"]);
  if (!title || title.length < 3) return null;

  const url =
    pickString(obj, ["jobUrl", "jobURL", "url", "jdURL", "jdUrl"]) ?? "";
  const href = url.startsWith("http")
    ? url
    : url
      ? `https://www.naukri.com${url.startsWith("/") ? url : `/${url}`}`
      : "";

  const jobId = stableIdFromRecord(obj, href);
  if (!jobId) return null;

  const company =
    pickString(obj, ["companyName", "company", "compName", "employer"]) ??
    "Unknown";
  const location = pickString(obj, ["location", "locations", "city", "place"]);
  const salary = pickString(obj, ["salary", "salaryDetail", "ctc", "package"]);
  const postedAt = pickString(obj, ["postedDate", "postedAt", "createdDate", "date"]);

  const flags = `${title} ${company} ${JSON.stringify(obj)}`.toLowerCase();
  const easyApply =
    /easy\s*apply|apply\s*on\s*naukri/i.test(flags) &&
    !/company\s*site|external/i.test(flags);
  const externalApply = /company\s*site|external\s*apply/i.test(flags);

  return {
    platform: "naukri",
    source,
    jobId,
    title,
    company,
    location,
    salary,
    postedAt,
    easyApply,
    externalApply,
    alreadyApplied: /already\s+applied/i.test(flags),
    url: href || "https://www.naukri.com",
    tupleIndex: index,
  };
}

function collectJobObjects(node: unknown, out: JsonRecord[], depth = 0): void {
  if (depth > 8 || node == null) return;

  if (Array.isArray(node)) {
    for (const item of node) collectJobObjects(item, out, depth + 1);
    return;
  }

  if (typeof node !== "object") return;
  const obj = node as JsonRecord;

  const title = pickString(obj, ["title", "jobTitle", "designation"]);
  const id = stableIdFromRecord(obj);
  if (title && id) out.push(obj);

  for (const value of Object.values(obj)) {
    collectJobObjects(value, out, depth + 1);
  }
}

/** Best-effort parse of Naukri XHR JSON payloads. */
export function parseNaukriNetworkPayload(
  body: unknown,
  source: "search" | "recommended"
): NaukriScrapedJob[] {
  const records: JsonRecord[] = [];
  collectJobObjects(body, records);

  const knownLists = [
    asArray((body as JsonRecord)?.jobDetails),
    asArray((body as JsonRecord)?.jobs),
    asArray((body as JsonRecord)?.data),
    asArray((body as JsonRecord)?.jobList),
    asArray((body as JsonRecord)?.recommendedJobs),
    asArray((body as JsonRecord)?.searchResult),
  ];
  for (const list of knownLists) {
    for (const item of list) {
      if (item && typeof item === "object") records.push(item as JsonRecord);
    }
  }

  const seen = new Set<string>();
  const jobs: NaukriScrapedJob[] = [];
  let index = 0;
  for (const rec of records) {
    const job = mapRecordToJob(rec, source, index++);
    if (!job || seen.has(job.jobId)) continue;
    seen.add(job.jobId);
    jobs.push(job);
  }
  return jobs;
}
