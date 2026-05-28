export const IndeedSelectors = {
  login: {
    signIn: 'a:has-text("Sign in"), button:has-text("Sign in")',
    account: '#account_menu, [data-gnav-element-name="Account"]',
  },
  search: {
    jobCard: ".job_seen_beacon, div.jobsearch-ResultsList > div, div.cardOutline",
    title: "h2.jobTitle a, a.jcs-JobTitle, h2 a",
    company: '[data-testid="company-name"], .companyName, span.company',
    applyBtn:
      'button:has-text("Apply now"), #indeedApplyButton, button.indeed-apply-button, button[aria-label*="Apply" i]',
    /** Listing-only — do not use for submit confirmation (false positives in apply flow). */
    appliedBadge: '[data-testid="applied-badge"], :text("You applied")',
  },
} as const;
