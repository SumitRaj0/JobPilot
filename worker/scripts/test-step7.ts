/**
 * Step 7 verification — runs Naukri automation directly (no extension).
 * Stop `pnpm dev:worker` before running, or only one Chromium will fight the queue.
 *
 * Usage: pnpm --filter @aiapply/worker test:step7
 */
import { runAutomation } from "../src/automation/runAutomation.js";
import { browserManager } from "../src/browser/BrowserManager.js";

const jobId = `step7-test-${Date.now()}`;

const filters = {
  role: process.env.TEST_ROLE ?? "React Developer",
  experience: process.env.TEST_EXPERIENCE ?? "2",
  remote: process.env.TEST_REMOTE !== "false",
  salary: process.env.TEST_SALARY ?? "",
  datePosted: process.env.TEST_DATE_POSTED ?? "1",
  easyApplyOnly: process.env.TEST_EASY_APPLY !== "false",
  fullAuto: process.env.TEST_FULL_AUTO !== "false",
};

console.info("\n=== Step 7 Naukri test ===");
console.info("Job ID:", jobId);
console.info("Filters:", filters);
console.info("Watch the Chromium window. Do not close it early.\n");

try {
  const result = await runAutomation(jobId, {
    userId: "dev-user",
    platform: "naukri",
    filters,
    enqueuedAt: new Date().toISOString(),
  });

  console.info("\n=== RESULT ===");
  console.info(JSON.stringify(result, null, 2));

  const ok =
    result.messages.some((m) => m.includes("Found")) &&
    (filters.fullAuto ? result.applied > 0 : true);

  if (ok) {
    console.info("\n✓ Step 7 check PASSED (scrape" + (filters.fullAuto ? " + apply" : "") + ")");
    process.exit(0);
  }

  console.error("\n✗ Step 7 check FAILED — see messages above");
  process.exit(1);
} catch (err) {
  console.error("\n✗ Step 7 crashed:", err);
  process.exit(1);
} finally {
  await browserManager.close();
}
