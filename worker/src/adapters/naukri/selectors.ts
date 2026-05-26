/** Naukri DOM selectors — central config for easy updates when UI changes */
export const NaukriSelectors = {
  login: {
    loginLink: 'a[title="Jobseeker Login"], a#login_Layer, a:has-text("Login")',
    profileHint:
      'a[href*="mnjuser"], .nI-gNb-Drawers, [class*="MyNaukri"], img[alt*="profile" i]',
  },
  search: {
    jobTuple:
      '.srp-jobtuple-wrapper, article.jobTuple, .cust-job-tuple, div[data-job-id]',
    title:
      'a.title, a.jtitle, a.jobsTuple__title, h2 a, a[href*="job-listings"], a[href*="job-details"], .jdNav-link',
    company: '.comp-dtls-wrap a, .comp-name, .companyInfo a, .company',
    location: '.loc-wrap .loc, .locWdth, .location',
    salary: '.sal-wrap span, .salary, .sal',
    posted: '.job-post-day, .type, span.fleft.grey-text',
    easyApplyBadge:
      ':text("Easy Apply"), .ico.easy-apply, span:has-text("Easy Apply")',
    applyBtn: 'button:has-text("Apply"), a:has-text("Apply")',
    externalApply: ':text("Apply on company"), :text("Apply on company site")',
  },
  filters: {
    panel: '.styles_filters-container__, #filtersContainer, .filter-section',
    experienceChip: '.styles_filter-chips__ span, .exp-filter .chips',
    remoteCheckbox:
      'label:has-text("Remote"), label:has-text("Work from home"), input[name*="remote" i]',
    salaryDropdown: 'span:has-text("Salary"), div:has-text("Salary")',
    datePosted: 'span:has-text("Posted"), div:has-text("Posted")',
    easyApplyFilter: 'label:has-text("Easy Apply"), span:has-text("Easy Apply")',
  },
  applyModal: {
    container: '.apply-modal, #applyModal, [class*="ApplyModal"], div[role="dialog"]',
    fileInput: 'input[type="file"]',
    submitBtn:
      'button:has-text("Submit"), button:has-text("Apply"), button:has-text("Save")',
    closeBtn: 'button:has-text("Close"), .crossIcon, [aria-label="Close"]',
  },
} as const;
