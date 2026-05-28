export interface CandidateProfile {
  total_experience_years?: string;
  current_ctc_lpa?: string;
  expected_ctc_lpa?: string;
  notice_period_days?: string;
  current_location?: string;
  willing_to_relocate?: string;
  skills?: string[];
  [key: string]: unknown;
}

export interface IntentMapping {
  intent: string;
  keywords: string[];
  value: string;
  expected_ui_options: string[];
}

export interface ProfileDataFile {
  profile: CandidateProfile;
  intent_mappings: IntentMapping[];
}

export interface GeminiAnswerResult {
  answer: string | null;
  confidence: number;
}
