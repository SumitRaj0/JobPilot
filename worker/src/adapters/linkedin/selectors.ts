export const LinkedInSelectors = {
  login: {
    signInLink: 'a[href*="/login"], button:has-text("Sign in")',
    profileHint: 'img[alt*="profile" i], .global-nav__me',
  },
  search: {
    jobCard:
      'li.jobs-search-results__list-item, li.scaffold-layout__list-item, div.job-card-container',
    title: '.job-card-list__title, a.job-card-container__link, h3 a',
    company: '.job-card-container__company-name, .artdeco-entity-lockup__subtitle',
    easyApplyBtn:
      '.jobs-unified-top-card button.jobs-apply-button--top-card, .jobs-unified-top-card button:has-text("Easy Apply"), button.jobs-apply-button:has-text("Easy Apply"), button[aria-label*="Easy Apply" i]',
    appliedBadge: ':text("Applied"), :text("Application submitted")',
  },
  pagination: {
    next: 'button[aria-label="View next page"], button:has-text("Next")',
  },
} as const;
