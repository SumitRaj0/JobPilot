/** Normalize role/ title for token matching (Node.js → nodejs). */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** URL slug: "Node.js Developer" → "nodejs-developer-jobs" path segment. */
export function roleToSlug(role: string): string {
  const slug = normalize(role).replace(/\s+/g, "-").replace(/-+/g, "-");
  return slug || "jobs";
}

/** Tokens used to keep only jobs related to the searched role. */
export function roleKeywords(role: string): string[] {
  const norm = normalize(role);
  return [...new Set(norm.split(" ").filter((t) => t.length > 1))];
}

function titleContainsKeyword(titleNorm: string, titleCompact: string, kw: string): boolean {
  if (kw.length <= 1) return false;
  if (titleNorm.includes(kw) || titleCompact.includes(kw)) return true;
  const re = new RegExp(`(^|\\s)${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
  return re.test(titleNorm);
}

export function jobTitleMatchesRole(title: string, role: string): boolean {
  const keywords = roleKeywords(role);
  if (keywords.length === 0) return true;

  const titleNorm = normalize(title);
  if (!titleNorm) return false;

  const titleCompact = titleNorm.replace(/\s/g, "");
  let hits = 0;
  for (const kw of keywords) {
    if (titleContainsKeyword(titleNorm, titleCompact, kw)) hits++;
  }

  const required = Math.max(1, Math.ceil(keywords.length * 0.4));
  return hits >= required;
}
