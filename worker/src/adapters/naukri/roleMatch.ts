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
  const tokens = norm.split(" ").filter((t) => t.length > 1);
  const joined = norm.replace(/\s/g, "");
  if (joined.length > 2 && !tokens.includes(joined)) {
    tokens.unshift(joined);
  }
  return [...new Set(tokens)];
}

export function jobTitleMatchesRole(title: string, role: string): boolean {
  const keywords = roleKeywords(role);
  if (keywords.length === 0) return true;

  const titleNorm = normalize(title);
  if (!titleNorm) return false;

  let hits = 0;
  for (const kw of keywords) {
    if (titleNorm.includes(kw)) hits++;
  }

  const main = keywords[0];
  if (main && titleNorm.includes(main)) return true;

  const required = Math.max(1, Math.ceil(keywords.length * 0.4));
  return hits >= required;
}
