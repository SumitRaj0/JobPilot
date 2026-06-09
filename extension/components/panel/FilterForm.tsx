import type { JobFilters, Platform } from "@aiapply/shared";
import type { ReactNode } from "react";

import { ResetIcon } from "~components/panel/icons";
import type { FilterFieldKey } from "~lib/validation/jobFilters";

interface FilterFormProps {
  platform: Platform;
  filters: JobFilters;
  disabled: boolean;
  errors?: Partial<Record<FilterFieldKey, string>>;
  onChange: (patch: Partial<JobFilters>) => void;
  onClearError?: (field: FilterFieldKey) => void;
  onReset?: () => void;
}

const DATE_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "1", label: "Past 24 hours" },
  { value: "3", label: "Past 3 days" },
  { value: "7", label: "Past week" },
  { value: "30", label: "Past month" },
];

const MODE_OPTIONS: Array<{ value: JobFilters["mode"]; label: string }> = [
  { value: "search", label: "Search Jobs" },
  { value: "recommended", label: "Recommended Jobs" },
];

export function FilterForm({
  platform,
  filters,
  disabled,
  errors = {},
  onChange,
  onClearError,
  onReset,
}: FilterFormProps) {
  const supportsMode = platform === "naukri";
  const isRecommended = supportsMode && filters.mode === "recommended";
  const patch = (field: FilterFieldKey, value: Partial<JobFilters>) => {
    onChange(value);
    onClearError?.(field);
  };

  return (
    <div>
      <div className="aiapply-section-header">
        <p className="aiapply-section-title aiapply-section-title--inline">
          Job preferences
        </p>
        {onReset ? (
          <button
            type="button"
            className="aiapply-icon-btn aiapply-icon-btn--reset"
            aria-label="Reset job preferences form"
            title="Reset form to defaults"
            disabled={disabled}
            onClick={onReset}
          >
            <ResetIcon />
          </button>
        ) : null}
      </div>
      <div className="aiapply-space-y-3">
        {supportsMode && (
          <div className="aiapply-mode-segment" role="tablist" aria-label="Job source mode">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={filters.mode === opt.value}
                className={`aiapply-mode-segment-btn ${filters.mode === opt.value ? "aiapply-mode-segment-btn--active" : ""}`}
                disabled={disabled}
                onClick={() => onChange({ mode: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {!isRecommended && (
          <Field label="Role / job title" required error={errors.role}>
            <input
              type="text"
              className={`aiapply-input ${errors.role ? "aiapply-input--error" : ""}`}
              placeholder="e.g. Full Stack Developer"
              value={filters.role}
              disabled={disabled}
              aria-invalid={Boolean(errors.role)}
              aria-describedby={errors.role ? "aiapply-err-role" : undefined}
              onChange={(e) => patch("role", { role: e.target.value })}
            />
          </Field>
        )}

        {isRecommended && (
          <p className="aiapply-mode-note" role="status">
            Recommended mode uses Naukri suggestions and keeps your current role profile context.
          </p>
        )}

        <Field label="Experience" error={errors.experience}>
          <input
            type="text"
            className={`aiapply-input ${errors.experience ? "aiapply-input--error" : ""}`}
            placeholder="e.g. 2 or 2-5 years (no negatives)"
            value={filters.experience}
            disabled={disabled}
            aria-invalid={Boolean(errors.experience)}
            onChange={(e) => patch("experience", { experience: e.target.value })}
          />
        </Field>

        <Field label="Location" error={errors.location}>
          <input
            type="text"
            className={`aiapply-input ${errors.location ? "aiapply-input--error" : ""}`}
            placeholder="e.g. Bangalore, Pune, Remote"
            value={filters.location ?? ""}
            disabled={disabled}
            aria-invalid={Boolean(errors.location)}
            onChange={(e) => patch("location", { location: e.target.value })}
          />
        </Field>

        <Field label="Exclude keywords" error={errors.excludeKeywords}>
          <input
            type="text"
            className={`aiapply-input ${errors.excludeKeywords ? "aiapply-input--error" : ""}`}
            placeholder="e.g. sales, support, intern"
            value={filters.excludeKeywords ?? ""}
            disabled={disabled}
            aria-invalid={Boolean(errors.excludeKeywords)}
            onChange={(e) =>
              patch("excludeKeywords", { excludeKeywords: e.target.value })
            }
          />
        </Field>

        <div className="aiapply-grid aiapply-grid-cols-2 aiapply-gap-2">
          <Field label="Expected salary" error={errors.salary}>
            <input
              type="text"
              className={`aiapply-input ${errors.salary ? "aiapply-input--error" : ""}`}
              placeholder="e.g. 8 LPA+ (no negatives)"
              value={filters.salary ?? ""}
              disabled={disabled}
              aria-invalid={Boolean(errors.salary)}
              onChange={(e) => patch("salary", { salary: e.target.value })}
            />
          </Field>
          <Field label="Date posted" error={errors.datePosted}>
            <select
              className={`aiapply-input ${errors.datePosted ? "aiapply-input--error" : ""}`}
              value={filters.datePosted ?? ""}
              disabled={disabled}
              aria-invalid={Boolean(errors.datePosted)}
              onChange={(e) => patch("datePosted", { datePosted: e.target.value })}
            >
              {DATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={`Min match score (${filters.minPolicyScore ?? 0})`} error={errors.minPolicyScore}>
          <input
            type="range"
            className="aiapply-range"
            min={0}
            max={100}
            step={5}
            value={filters.minPolicyScore ?? 0}
            disabled={disabled}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={filters.minPolicyScore ?? 0}
            onChange={(e) =>
              patch("minPolicyScore", {
                minPolicyScore: Number.parseInt(e.target.value, 10),
              })
            }
          />
        </Field>

        <div className="aiapply-glass-card aiapply-px-3 aiapply-py-1">
          <Toggle
            label="Remote only"
            checked={filters.remote}
            disabled={disabled}
            onChange={(remote) => onChange({ remote })}
          />
          <Toggle
            label="Easy Apply only"
            checked={filters.easyApplyOnly}
            disabled={disabled}
            onChange={(easyApplyOnly) => onChange({ easyApplyOnly })}
          />
          <Toggle
            label="Full Auto"
            checked={filters.fullAuto}
            disabled={disabled}
            onChange={(fullAuto) => onChange({ fullAuto })}
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="aiapply-block">
      <span className="aiapply-field-label">
        {label}
        {required ? (
          <span className="aiapply-text-red-400" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="aiapply-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="aiapply-toggle-row">
      <span className="aiapply-toggle-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`aiapply-toggle ${checked ? "aiapply-toggle--on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="aiapply-toggle-knob" />
      </button>
    </div>
  );
}
