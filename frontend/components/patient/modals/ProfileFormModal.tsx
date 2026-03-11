"use client";

import Modal from "@/components/ui/Modal";
import { Loader2, Sparkles, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileFormState, ProfileTab } from "@/hooks/use-profile-form";

interface ProfileFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  form: ProfileFormState;
  onPatch: (patch: Partial<ProfileFormState>) => void;
  submitting: boolean;
  generatingTags: boolean;
  onGenerateTags: () => void;
  onRemoveTag: (tag: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "medical", label: "Medical" },
  { id: "insurance", label: "Insurance" },
  { id: "contact", label: "Contact" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function FieldLabel({
  children,
  note,
}: {
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <label className="mb-1 block text-xs font-medium text-foreground">
      {children}
      {note && (
        <span className="ml-1 font-normal text-muted-foreground">{note}</span>
      )}
    </label>
  );
}

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none transition-colors",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none transition-colors",
        className,
      )}
      {...props}
    />
  );
}

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none transition-colors",
        className,
      )}
      {...props}
    />
  );
}

// ── Inline BMI calculator shown in the Medical tab ──────────────────────────

function BmiPreview({
  heightCm,
  weightKg,
  dob,
}: {
  heightCm: string;
  weightKg: string;
  dob: string;
}) {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  const hasValues = h > 0 && w > 0;
  const bmi = hasValues
    ? parseFloat((w / ((h / 100) * (h / 100))).toFixed(1))
    : null;

  let age: number | null = null;
  if (dob) {
    const d = new Date(dob);
    const today = new Date();
    age =
      today.getFullYear() -
      d.getFullYear() -
      (today.getMonth() < d.getMonth() ||
      (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())
        ? 1
        : 0);
  }

  type Cat = {
    label: string;
    color: string;
    bg: string;
    border: string;
    bar: string;
  };
  const getCategory = (v: number): Cat => {
    if (v < 18.5)
      return {
        label: "Underweight",
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-500/10",
        border: "border-blue-200 dark:border-blue-500/30",
        bar: "bg-blue-500",
      };
    if (v < 25)
      return {
        label: "Normal weight",
        color: "text-secondary",
        bg: "bg-secondary/5",
        border: "border-secondary/20",
        bar: "bg-secondary",
      };
    if (v < 30)
      return {
        label: "Overweight",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-500/10",
        border: "border-amber-200 dark:border-amber-500/30",
        bar: "bg-amber-500",
      };
    return {
      label: "Obese",
      color: "text-destructive",
      bg: "bg-destructive/5",
      border: "border-destructive/20",
      bar: "bg-destructive",
    };
  };

  const cat = bmi ? getCategory(bmi) : null;
  const barPercent = bmi
    ? Math.min(100, Math.max(0, ((bmi - 10) / 30) * 100))
    : 0;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-colors",
        cat ? `${cat.bg} ${cat.border}` : "border-border bg-muted/30",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">
          BMI Calculator
        </span>
        {bmi && cat ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              cat.color,
              cat.bg,
            )}
          >
            {cat.label}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">
            Enter height &amp; weight
          </span>
        )}
      </div>

      {bmi && cat ? (
        <>
          <div className="flex items-end gap-3">
            <span
              className={cn(
                "text-3xl font-bold tabular-nums leading-none",
                cat.color,
              )}
            >
              {bmi}
            </span>
            <span className="mb-1 text-xs text-muted-foreground">kg/m²</span>
            {age !== null && (
              <span className="mb-1 ml-auto text-[10px] text-muted-foreground">
                Age {age}
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  cat.bar,
                )}
                style={{ width: `${barPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground select-none">
              <span>10</span>
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
              <span>40+</span>
            </div>
          </div>
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          BMI will appear here once you enter height and weight above.
        </p>
      )}
    </div>
  );
}

// ── Tab content panels ───────────────────────────────────────────────────────

function PersonalTab({
  form,
  onPatch,
}: {
  form: ProfileFormState;
  onPatch: (patch: Partial<ProfileFormState>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>First Name</FieldLabel>
          <Input
            required
            value={form.first_name}
            onChange={(e) => onPatch({ first_name: e.target.value })}
            placeholder="Jane"
          />
        </div>
        <div>
          <FieldLabel>Last Name</FieldLabel>
          <Input
            required
            value={form.last_name}
            onChange={(e) => onPatch({ last_name: e.target.value })}
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <FieldLabel>Date of Birth</FieldLabel>
        <Input
          type="date"
          required
          value={form.date_of_birth}
          onChange={(e) => onPatch({ date_of_birth: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Gender</FieldLabel>
          <Select
            value={form.gender}
            onChange={(e) => onPatch({ gender: e.target.value })}
          >
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </Select>
        </div>
        <div>
          <FieldLabel>Blood Group</FieldLabel>
          <Select
            value={form.blood_group}
            onChange={(e) => onPatch({ blood_group: e.target.value })}
          >
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Phone</FieldLabel>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => onPatch({ phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div>
          <FieldLabel>Language</FieldLabel>
          <Input
            value={form.preferred_language}
            onChange={(e) => onPatch({ preferred_language: e.target.value })}
            placeholder="English"
          />
        </div>
      </div>

      <div>
        <FieldLabel>Emergency Contact</FieldLabel>
        <Input
          required
          value={form.emergency_contact}
          onChange={(e) => onPatch({ emergency_contact: e.target.value })}
          placeholder="Name & phone number"
        />
      </div>
    </div>
  );
}

function MedicalTab({
  form,
  onPatch,
  generatingTags,
  onGenerateTags,
  onRemoveTag,
}: {
  form: ProfileFormState;
  onPatch: (patch: Partial<ProfileFormState>) => void;
  generatingTags: boolean;
  onGenerateTags: () => void;
  onRemoveTag: (tag: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel note="(comma-separated)">Allergies</FieldLabel>
        <Input
          value={form.allergies}
          onChange={(e) => onPatch({ allergies: e.target.value })}
          placeholder="e.g. Penicillin, Peanuts, Latex"
        />
      </div>

      <div>
        <FieldLabel note="(comma-separated)">Chronic Conditions</FieldLabel>
        <Input
          value={form.chronic_conditions}
          onChange={(e) => onPatch({ chronic_conditions: e.target.value })}
          placeholder="e.g. Diabetes Type 2, Hypertension"
        />
      </div>

      <div>
        <FieldLabel>Past Surgeries</FieldLabel>
        <Textarea
          value={form.past_surgeries}
          onChange={(e) => onPatch({ past_surgeries: e.target.value })}
          placeholder="Describe any past surgeries"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <FieldLabel>Height (cm)</FieldLabel>
          <Input
            type="number"
            value={form.height_cm}
            onChange={(e) => onPatch({ height_cm: e.target.value })}
            placeholder="170"
          />
        </div>
        <div>
          <FieldLabel>Weight (kg)</FieldLabel>
          <Input
            type="number"
            value={form.weight_kg}
            onChange={(e) => onPatch({ weight_kg: e.target.value })}
            placeholder="70"
          />
        </div>
        <div>
          <FieldLabel>Blood Pressure</FieldLabel>
          <Input
            value={form.blood_pressure}
            onChange={(e) => onPatch({ blood_pressure: e.target.value })}
            placeholder="120/80"
          />
        </div>
      </div>

      {/* Live BMI preview */}
      <BmiPreview
        heightCm={form.height_cm}
        weightKg={form.weight_kg}
        dob={form.date_of_birth}
      />

      {/* AI Condition Tags */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">
            AI-Powered Condition Tags
          </span>
        </div>

        <div>
          <FieldLabel>Describe your current condition or symptoms</FieldLabel>
          <Textarea
            value={form.condition_description}
            onChange={(e) => onPatch({ condition_description: e.target.value })}
            placeholder="e.g. I've been experiencing frequent migraines and occasional blurred vision for the past two weeks."
            rows={3}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Your words are converted into searchable medical tags by AI, helping
            doctors find you by condition.
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerateTags}
          disabled={generatingTags || !form.condition_description.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generatingTags ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {generatingTags ? "Generating…" : "Generate Medical Tags"}
        </button>

        {form.condition_tags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Generated tags
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.condition_tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                    title={`Remove "${tag}"`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InsuranceTab({
  form,
  onPatch,
}: {
  form: ProfileFormState;
  onPatch: (patch: Partial<ProfileFormState>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Insurance Provider</FieldLabel>
        <Input
          value={form.insurance_provider}
          onChange={(e) => onPatch({ insurance_provider: e.target.value })}
          placeholder="e.g. Blue Cross Blue Shield"
        />
      </div>
      <div>
        <FieldLabel>Policy Number</FieldLabel>
        <Input
          value={form.insurance_policy_number}
          onChange={(e) => onPatch({ insurance_policy_number: e.target.value })}
          placeholder="Policy number"
        />
      </div>
      <div>
        <FieldLabel>Group Number</FieldLabel>
        <Input
          value={form.insurance_group_number}
          onChange={(e) => onPatch({ insurance_group_number: e.target.value })}
          placeholder="Group number"
        />
      </div>
    </div>
  );
}

function ContactTab({
  form,
  onPatch,
}: {
  form: ProfileFormState;
  onPatch: (patch: Partial<ProfileFormState>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Street Address</FieldLabel>
        <Input
          value={form.address_street}
          onChange={(e) => onPatch({ address_street: e.target.value })}
          placeholder="123 Main Street, Apt 4B"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>City</FieldLabel>
          <Input
            value={form.address_city}
            onChange={(e) => onPatch({ address_city: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>State</FieldLabel>
          <Input
            value={form.address_state}
            onChange={(e) => onPatch({ address_state: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>ZIP Code</FieldLabel>
          <Input
            value={form.address_zip}
            onChange={(e) => onPatch({ address_zip: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>Country</FieldLabel>
          <Input
            value={form.address_country}
            onChange={(e) => onPatch({ address_country: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function ProfileFormModal({
  isOpen,
  onClose,
  isEditing,
  activeTab,
  onTabChange,
  form,
  onPatch,
  submitting,
  generatingTags,
  onGenerateTags,
  onRemoveTag,
  onSubmit,
}: ProfileFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Profile" : "Complete Your Profile"}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Tab bar */}
        <div className="flex border-b border-border -mx-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 px-2 py-2.5 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "border-b-2 border-primary text-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="min-h-80">
          {activeTab === "personal" && (
            <PersonalTab form={form} onPatch={onPatch} />
          )}
          {activeTab === "medical" && (
            <MedicalTab
              form={form}
              onPatch={onPatch}
              generatingTags={generatingTags}
              onGenerateTags={onGenerateTags}
              onRemoveTag={onRemoveTag}
            />
          )}
          {activeTab === "insurance" && (
            <InsuranceTab form={form} onPatch={onPatch} />
          )}
          {activeTab === "contact" && (
            <ContactTab form={form} onPatch={onPatch} />
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting
              ? "Saving…"
              : isEditing
                ? "Update Profile"
                : "Save Profile"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
