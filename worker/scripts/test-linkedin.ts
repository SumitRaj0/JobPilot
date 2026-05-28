/**
 * LinkedIn automation smoke test (no extension).
 * Stop `pnpm dev:worker` first, or only one process should own the browser session.
 *
 * Usage:
 *   pnpm --filter @aiapply/worker test:linkedin
 *   TEST_ROLE="Software Engineer" TEST_FULL_AUTO=false pnpm --filter @aiapply/worker test:linkedin
 */
import { runAutomation } from "../src/automation/runAutomation.js";
import { browserManager } from "../src/browser/BrowserManager.js";

const jobId = `linkedin-test-${Date.now()}`;

const filters = {
  role: process.env.TEST_ROLE ?? "React Developer",
  experience: process.env.TEST_EXPERIENCE ?? "2",
  remote: process.env.TEST_REMOTE === "true",
  salary: process.env.TEST_SALARY ?? "",
  datePosted: process.env.TEST_DATE_POSTED ?? "7",
  easyApplyOnly: process.env.TEST_EASY_APPLY !== "false",
  fullAuto: process.env.TEST_FULL_AUTO !== "false",
};

console.info("\n=== LinkedIn test ===");
console.info("Job ID:", jobId);
console.info("Filters:", filters);
console.info("PLAYWRIGHT_HEADLESS should be false for first-time login.\n");

try {
  const result = await runAutomation(jobId, {
    userId: "dev-user",
    platform: "linkedin",
    filters,
    enqueuedAt: new Date().toISOString(),
  });

  console.info("\n=== RESULT ===");
  console.info(JSON.stringify(result, null, 2));

  const scraped = result.messages.some((m) => /Found \d+ LinkedIn/i.test(m));
  const ok = scraped && (filters.fullAuto ? result.applied > 0 : true);

  if (ok) {
    console.info(
      "\n✓ LinkedIn check PASSED (scrape" + (filters.fullAuto ? " + apply" : "") + ")"
    );
    process.exit(0);
  }

  console.error("\n✗ LinkedIn check FAILED — see worker logs and messages above");
  process.exit(1);
} catch (err) {
  console.error("\n✗ LinkedIn test crashed:", err);
  process.exit(1);
} finally {
  await browserManager.close();
}
