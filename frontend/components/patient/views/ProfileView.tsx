"use client";

import { useState, useCallback, useEffect } from "react";
import {
  HeartPulse,
  Copy,
  Edit2,
  Plus,
  TrendingUp,
  User,
  Phone,
  MapPin,
  Shield,
  Activity,
  Tag,
  AlertTriangle,
  Syringe,
  Stethoscope,
  Sparkles,
  Loader2,
  X,
  Save,
  RefreshCw,
  Check,
  Ban,
} from "lucide-react";
import type {
  PatientMetricEntry,
  PatientMetricType,
  PatientProfile,
  UserPublic,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  createPatientMetricEntry,
  generateConditionTags,
  listPatientMetricEntries,
  updatePatientProfile,
  createPatientProfile,
} from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileViewProps {
  user: UserPublic;
  profile: PatientProfile | null;
  onCreateProfile: () => void;
  onProfileUpdated?: (p: PatientProfile) => void;
}

interface FormState {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  phone: string;
  preferred_language: string;
  emergency_contact: string;
  allergies: string;
  chronic_conditions: string;
  past_surgeries: string;
  height_cm: string;
  weight_kg: string;
  blood_pressure: string;
  insurance_provider: string;
  insurance_policy_number: string;
  insurance_group_number: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const METRIC_OPTIONS: Array<{
  type: PatientMetricType;
  label: string;
  unit: string;
  placeholder: string;
}> = [
  {
    type: "blood_pressure",
    label: "Blood Pressure",
    unit: "mmHg",
    placeholder: "120/80",
  },
  {
    type: "blood_sugar",
    label: "Blood Sugar",
    unit: "mg/dL",
    placeholder: "110",
  },
  {
    type: "weight",
    label: "Weight",
    unit: "kg",
    placeholder: "72.5",
  },
  {
    type: "heart_rate",
    label: "Heart Rate",
    unit: "bpm",
    placeholder: "72",
  },
  {
    type: "temperature",
    label: "Temperature",
    unit: "C",
    placeholder: "36.8",
  },
  {
    type: "oxygen_saturation",
    label: "SpO2",
    unit: "%",
    placeholder: "98",
  },
];

function metricLabel(metricType: PatientMetricType): string {
  return METRIC_OPTIONS.find((opt) => opt.type === metricType)?.label ?? metricType;
}

function profileToForm(p: PatientProfile): FormState {
  return {
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    date_of_birth: p.date_of_birth?.slice(0, 10) ?? "",
    gender: p.gender ?? "",
    blood_group: p.blood_group ?? "O+",
    phone: p.phone ?? "",
    preferred_language: p.preferred_language ?? "",
    emergency_contact: p.emergency_contact ?? "",
    allergies: p.allergies?.join(", ") ?? "",
    chronic_conditions: p.chronic_conditions?.join(", ") ?? "",
    past_surgeries: p.past_surgeries ?? "",
    height_cm: p.height_cm ? String(p.height_cm) : "",
    weight_kg: p.weight_kg ? String(p.weight_kg) : "",
    blood_pressure: p.blood_pressure ?? "",
    insurance_provider: p.insurance_provider ?? "",
    insurance_policy_number: p.insurance_policy_number ?? "",
    insurance_group_number: p.insurance_group_number ?? "",
    address_street: p.address_street ?? "",
    address_city: p.address_city ?? "",
    address_state: p.address_state ?? "",
    address_zip: p.address_zip ?? "",
    address_country: p.address_country ?? "",
  };
}

// ─── Shared field primitives ──────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-muted-foreground">
      {children}
    </label>
  );
}

function InlineInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors",
        className,
      )}
      {...props}
    />
  );
}

function InlineTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

function InlineSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors",
        className,
      )}
      {...props}
    />
  );
}

// ─── Read-only helpers ────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-2.5 mb-4">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
    </div>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm border-b border-border/60 last:border-b-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-card-foreground">
        {value}
      </span>
    </div>
  );
}

function TagList({
  tags,
  colorClass,
}: {
  tags: string[];
  colorClass?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
            colorClass ?? "border-border bg-muted text-muted-foreground",
          )}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function CopyableId({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        <code className="flex-1 truncate rounded-md bg-muted/60 border border-border px-2.5 py-1.5 text-[11px] font-mono text-foreground">
          {value}
        </code>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast("Copied to clipboard!", "success");
          }}
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          title="Copy"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── BMI widget (read-only) ───────────────────────────────────────────────────

function BmiWidget({
  heightCm,
  weightKg,
  dob,
}: {
  heightCm: number | null;
  weightKg: number | null;
  dob: string | null;
}) {
  if (!heightCm || !weightKg) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center">
        <p className="text-xs text-muted-foreground">
          Add height &amp; weight to see your BMI
        </p>
      </div>
    );
  }

  const bmi = parseFloat((weightKg / (heightCm / 100) ** 2).toFixed(1));

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
        color: "text-sky-500 dark:text-sky-400",
        bg: "bg-sky-500/10",
        border: "border-sky-500/30",
        bar: "bg-sky-500",
      };
    if (v < 25)
      return {
        label: "Normal",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        bar: "bg-emerald-500",
      };
    if (v < 30)
      return {
        label: "Overweight",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
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

  const cat = getCategory(bmi);
  const barPercent = Math.min(100, Math.max(0, ((bmi - 10) / 30) * 100));

  return (
    <Card className={cn("gap-0 py-4", cat.bg, cat.border)}>
      <CardContent className="space-y-3 px-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            BMI Score
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              cat.color,
              cat.border,
            )}
          >
            {cat.label}
          </span>
        </div>
        <div className="flex items-end gap-3">
          <span
            className={cn(
              "text-4xl font-bold tabular-nums leading-none",
              cat.color,
            )}
          >
            {bmi}
          </span>
          <span className="mb-0.5 text-xs text-muted-foreground">kg/m²</span>
          {age !== null && (
            <span className="mb-0.5 ml-auto text-[10px] text-muted-foreground">
              Age {age}
            </span>
          )}
        </div>
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
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
      </CardContent>
    </Card>
  );
}

function MetricTrendChart({
  entries,
  unit,
}: {
  entries: PatientMetricEntry[];
  unit: string;
}) {
  const numericEntries = entries
    .filter((entry) => entry.numeric_value !== null)
    .slice(0, 12)
    .reverse();

  if (numericEntries.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center">
        <p className="text-xs text-muted-foreground">
          Add at least 2 values to see a trend chart.
        </p>
      </div>
    );
  }

  const values = numericEntries.map((entry) => entry.numeric_value as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  const points = numericEntries
    .map((entry, idx) => {
      const x = (idx / (numericEntries.length - 1)) * 100;
      const y = 100 - (((entry.numeric_value as number) - min) / span) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-2">
      <div className="relative h-32 rounded-lg border border-border bg-muted/20 p-2">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-label="Metric trend chart"
        >
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-primary"
          />
        </svg>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Min: {min.toFixed(1)} {unit}
        </span>
        <span>
          Max: {max.toFixed(1)} {unit}
        </span>
      </div>
    </div>
  );
}

// ─── AI Condition Tags card (always inline, unchanged) ────────────────────────

function AiConditionTagsCard({
  profile,
  onProfileUpdated,
}: {
  profile: PatientProfile;
  onProfileUpdated?: (p: PatientProfile) => void;
}) {
  const { toast } = useToast();
  const [description, setDescription] = useState(
    profile.condition_description ?? "",
  );
  const [tags, setTags] = useState<string[]>(profile.condition_tags ?? []);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Keep in sync if profile is updated externally
  useEffect(() => {
    setDescription(profile.condition_description ?? "");
    setTags(profile.condition_tags ?? []);
    setDirty(false);
  }, [profile.condition_description, profile.condition_tags]);

  const handleDescriptionChange = (v: string) => {
    setDescription(v);
    setDirty(true);
  };
  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    setDirty(true);
  };

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) {
      toast("Please describe your condition first.", "error");
      return;
    }
    setGenerating(true);
    try {
      const result = await generateConditionTags(description.trim());
      setTags(result.tags);
      setDirty(true);
      toast(
        `Generated ${result.tags.length} medical tag${result.tags.length !== 1 ? "s" : ""}!`,
        "success",
      );
    } catch (err: unknown) {
      const status =
        err !== null &&
        typeof err === "object" &&
        "status" in err &&
        typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
      if (status === 429)
        toast(
          "AI quota limit reached. Please wait a moment and try again.",
          "error",
        );
      else if (status === 503)
        toast("AI service is not configured. Please contact support.", "error");
      else
        toast(
          err instanceof Error ? err.message : "Failed to generate tags.",
          "error",
        );
    } finally {
      setGenerating(false);
    }
  }, [description, toast]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updated = await updatePatientProfile({
        condition_description: description.trim() || undefined,
        condition_tags: tags.length > 0 ? tags : [],
      });
      onProfileUpdated?.(updated);
      setDirty(false);
      toast("Condition tags saved!", "success");
    } catch {
      toast("Failed to save tags. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }, [description, tags, onProfileUpdated, toast]);

  const hasTags = tags.length > 0;
  const canGenerate = description.trim().length > 0 && !generating;

  return (
    <Card className="py-0 border-primary/20">
      <div className="flex items-center justify-between border-b border-primary/15 bg-primary/5 px-5 py-3.5 rounded-t-lg">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">
              AI-Powered Condition Tags
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Helps doctors discover and filter patients by condition
            </p>
          </div>
        </div>
        {dirty && (
          <Badge
            variant="outline"
            className="h-5 px-2 text-[10px] font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5"
          >
            Unsaved changes
          </Badge>
        )}
      </div>
      <CardContent className="px-5 py-5">
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Describe your condition or symptoms
            </label>
            <textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={5}
              placeholder="e.g. I've been experiencing frequent migraines and occasional blurred vision for the past two weeks. Also have mild lower back pain that worsens after prolonged sitting."
              className="w-full resize-none rounded-lg border border-input bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              Write naturally — the AI will extract the relevant medical terms
              and convert them into structured, searchable tags.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {hasTags ? "Regenerate Tags" : "Generate Tags"}
                </>
              )}
            </Button>
            {dirty && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  variant="secondary"
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDescription(profile.condition_description ?? "");
                    setTags(profile.condition_tags ?? []);
                    setDirty(false);
                  }}
                  disabled={saving}
                  className="gap-2 text-muted-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Discard
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-primary/70" />
            <span className="text-xs font-semibold text-foreground">
              Medical Tags
            </span>
            {hasTags && (
              <Badge
                variant="outline"
                className="ml-1 h-4 px-1.5 text-[9px] font-bold border-primary/30 text-primary bg-primary/5"
              >
                {tags.length}
              </Badge>
            )}
          </div>
          {hasTags ? (
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted/20 p-3 min-h-16">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="rounded-full p-0.5 hover:bg-primary/25 transition-colors"
                    title={`Remove "${tag}"`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/10 px-4 py-6 text-center min-h-16">
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
                  <p className="text-xs text-muted-foreground/60">
                    Analyzing your description…
                  </p>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-muted-foreground/25" />
                  <p className="text-xs text-muted-foreground/50 leading-relaxed">
                    Tags will appear here after you describe your condition and
                    click{" "}
                    <strong className="text-muted-foreground/70">
                      Generate Tags
                    </strong>
                    .
                  </p>
                </>
              )}
            </div>
          )}
          {hasTags && (
            <p className="text-[10px] text-muted-foreground/50">
              Click × on any tag to remove it, then save.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileView({
  user,
  profile,
  onCreateProfile,
  onProfileUpdated,
}: ProfileViewProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    profile ? profileToForm(profile) : profileToForm({} as PatientProfile),
  );
  const [submitting, setSubmitting] = useState(false);
  const [metrics, setMetrics] = useState<PatientMetricEntry[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricSubmitting, setMetricSubmitting] = useState(false);
  const [metricType, setMetricType] = useState<PatientMetricType>("blood_pressure");
  const [metricValue, setMetricValue] = useState("");
  const [metricRecordedAt, setMetricRecordedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );

  // Keep form in sync when profile loads or changes externally
  useEffect(() => {
    if (profile && !editing) {
      setForm(profileToForm(profile));
    }
  }, [profile, editing]);

  const fetchMetrics = useCallback(async () => {
    if (!profile) {
      setMetrics([]);
      return;
    }
    setMetricsLoading(true);
    try {
      const entries = await listPatientMetricEntries({ limit: 120 });
      setMetrics(entries);
    } catch {
      // Profile can render without metrics history if the request fails.
    } finally {
      setMetricsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const patch = useCallback(
    (p: Partial<FormState>) => setForm((prev) => ({ ...prev, ...p })),
    [],
  );

  const handleEdit = useCallback(() => {
    if (profile) setForm(profileToForm(profile));
    setEditing(true);
  }, [profile]);

  const handleCancel = useCallback(() => {
    if (profile) setForm(profileToForm(profile));
    setEditing(false);
  }, [profile]);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      try {
        const payload = {
          ...form,
          allergies: form.allergies
            ? form.allergies
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          chronic_conditions: form.chronic_conditions
            ? form.chronic_conditions
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          height_cm: form.height_cm ? Number(form.height_cm) : undefined,
          weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        };
        const saved = profile
          ? await updatePatientProfile(payload)
          : await createPatientProfile(payload);
        onProfileUpdated?.(saved);
        setEditing(false);
        toast("Profile updated!", "success");
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Failed to save profile.",
          "error",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form, profile, onProfileUpdated, toast],
  );

  const handleAddMetric = useCallback(async () => {
    const trimmed = metricValue.trim();
    if (!trimmed) {
      toast("Please enter a value before saving.", "error");
      return;
    }
    setMetricSubmitting(true);
    try {
      const created = await createPatientMetricEntry({
        metric_type: metricType,
        value: trimmed,
        recorded_at: new Date(metricRecordedAt).toISOString(),
      });
      setMetrics((prev) => [created, ...prev]);
      setMetricValue("");
      setMetricRecordedAt(new Date().toISOString().slice(0, 16));

      if (profile && (metricType === "blood_pressure" || metricType === "weight")) {
        const updated = await updatePatientProfile(
          metricType === "blood_pressure"
            ? { blood_pressure: created.value }
            : { weight_kg: created.numeric_value ?? undefined },
        );
        onProfileUpdated?.(updated);
      }

      toast(`${metricLabel(metricType)} saved to your history.`, "success");
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to save health metric.",
        "error",
      );
    } finally {
      setMetricSubmitting(false);
    }
  }, [metricRecordedAt, metricType, metricValue, onProfileUpdated, profile, toast]);

  const selectedMetricEntries = metrics.filter(
    (entry) => entry.metric_type === metricType,
  );
  const selectedMetricMeta = METRIC_OPTIONS.find((opt) => opt.type === metricType);

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!profile && !editing) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your personal health record.
          </p>
        </div>
        <Card className="py-0">
          <CardContent className="flex flex-col items-center py-20 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <HeartPulse className="h-7 w-7 text-primary/60" />
            </div>
            <p className="mt-4 text-sm font-semibold text-muted-foreground">
              Profile not set up yet
            </p>
            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground/60">
              Complete your profile to enable appointment booking and
              personalized health insights.
            </p>
            <Button onClick={onCreateProfile} className="mt-6 gap-2">
              <Edit2 className="h-4 w-4" />
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : `${form.first_name} ${form.last_name}`.trim();
  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()
    : `${form.first_name?.[0] ?? ""}${form.last_name?.[0] ?? ""}`.toUpperCase();

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your personal health record.
          </p>
        </div>

        {editing ? (
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={submitting}
              className="gap-2"
            >
              <Ban className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleEdit}
            className="w-fit gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* ── Identity card ── */}
      <Card className="py-0">
        <CardContent className="flex items-center gap-4 px-5 py-5">
          <Avatar className="h-14 w-14 shrink-0 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold select-none">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>First Name</FieldLabel>
                  <InlineInput
                    required
                    value={form.first_name}
                    onChange={(e) => patch({ first_name: e.target.value })}
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <FieldLabel>Last Name</FieldLabel>
                  <InlineInput
                    required
                    value={form.last_name}
                    onChange={(e) => patch({ last_name: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-base font-bold text-card-foreground leading-tight">
                  {fullName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user.email}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── 2-column layout ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal Information */}
          <Card className="py-0">
            <CardContent className="px-5 py-4">
              <SectionHeader icon={User} title="Personal Information" />
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Gender</FieldLabel>
                      <InlineSelect
                        value={form.gender}
                        onChange={(e) => patch({ gender: e.target.value })}
                      >
                        <option value="">Select…</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Prefer not to say">
                          Prefer not to say
                        </option>
                      </InlineSelect>
                    </div>
                    <div>
                      <FieldLabel>Blood Group</FieldLabel>
                      <InlineSelect
                        value={form.blood_group}
                        onChange={(e) => patch({ blood_group: e.target.value })}
                      >
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </InlineSelect>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Date of Birth</FieldLabel>
                    <InlineInput
                      type="date"
                      value={form.date_of_birth}
                      onChange={(e) => patch({ date_of_birth: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Phone</FieldLabel>
                      <InlineInput
                        type="tel"
                        value={form.phone}
                        onChange={(e) => patch({ phone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div>
                      <FieldLabel>Preferred Language</FieldLabel>
                      <InlineInput
                        value={form.preferred_language}
                        onChange={(e) =>
                          patch({ preferred_language: e.target.value })
                        }
                        placeholder="English"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Emergency Contact</FieldLabel>
                    <InlineInput
                      value={form.emergency_contact}
                      onChange={(e) =>
                        patch({ emergency_contact: e.target.value })
                      }
                      placeholder="Name & phone number"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <FieldRow label="Gender" value={profile?.gender} />
                  <FieldRow label="Blood Group" value={profile?.blood_group} />
                  <FieldRow
                    label="Date of Birth"
                    value={
                      profile?.date_of_birth
                        ? new Date(profile.date_of_birth).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )
                        : undefined
                    }
                  />
                  <FieldRow label="Phone" value={profile?.phone} />
                  <FieldRow
                    label="Preferred Language"
                    value={profile?.preferred_language}
                  />
                  <FieldRow
                    label="Emergency Contact"
                    value={profile?.emergency_contact}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card className="py-0">
            <CardContent className="px-5 py-4">
              <SectionHeader icon={Stethoscope} title="Medical History" />
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <FieldLabel>
                      Allergies{" "}
                      <span className="font-normal text-muted-foreground/60">
                        (comma-separated)
                      </span>
                    </FieldLabel>
                    <InlineInput
                      value={form.allergies}
                      onChange={(e) => patch({ allergies: e.target.value })}
                      placeholder="e.g. Penicillin, Peanuts, Latex"
                    />
                  </div>
                  <div>
                    <FieldLabel>
                      Chronic Conditions{" "}
                      <span className="font-normal text-muted-foreground/60">
                        (comma-separated)
                      </span>
                    </FieldLabel>
                    <InlineInput
                      value={form.chronic_conditions}
                      onChange={(e) =>
                        patch({ chronic_conditions: e.target.value })
                      }
                      placeholder="e.g. Diabetes Type 2, Hypertension"
                    />
                  </div>
                  <div>
                    <FieldLabel>Past Surgeries</FieldLabel>
                    <InlineTextarea
                      value={form.past_surgeries}
                      onChange={(e) =>
                        patch({ past_surgeries: e.target.value })
                      }
                      placeholder="Describe any past surgeries…"
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {profile?.chronic_conditions &&
                    profile.chronic_conditions.length > 0 && (
                      <div className="py-2.5 border-b border-border/60">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Chronic Conditions
                        </p>
                        <TagList
                          tags={profile.chronic_conditions}
                          colorClass="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        />
                      </div>
                    )}
                  {profile?.allergies && profile.allergies.length > 0 && (
                    <div className="py-2.5 border-b border-border/60">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        <p className="text-xs font-medium text-muted-foreground">
                          Allergies
                        </p>
                      </div>
                      <TagList
                        tags={profile.allergies}
                        colorClass="border-destructive/30 bg-destructive/10 text-destructive"
                      />
                    </div>
                  )}
                  {profile?.past_surgeries && (
                    <div className="py-2.5 border-b border-border/60 last:border-b-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Syringe className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground">
                          Past Surgeries
                        </p>
                      </div>
                      <p className="text-sm font-medium text-card-foreground leading-relaxed">
                        {profile.past_surgeries}
                      </p>
                    </div>
                  )}
                  {!profile?.chronic_conditions?.length &&
                    !profile?.allergies?.length &&
                    !profile?.past_surgeries && (
                      <p className="py-2 text-sm text-muted-foreground/60">
                        No medical history recorded.
                      </p>
                    )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Insurance */}
          {(editing ||
            profile?.insurance_provider ||
            profile?.insurance_policy_number ||
            profile?.insurance_group_number) && (
            <Card className="py-0">
              <CardContent className="px-5 py-4">
                <SectionHeader icon={Shield} title="Insurance" />
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <FieldLabel>Insurance Provider</FieldLabel>
                      <InlineInput
                        value={form.insurance_provider}
                        onChange={(e) =>
                          patch({ insurance_provider: e.target.value })
                        }
                        placeholder="e.g. Blue Cross Blue Shield"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>Policy Number</FieldLabel>
                        <InlineInput
                          value={form.insurance_policy_number}
                          onChange={(e) =>
                            patch({ insurance_policy_number: e.target.value })
                          }
                          placeholder="Policy number"
                        />
                      </div>
                      <div>
                        <FieldLabel>Group Number</FieldLabel>
                        <InlineInput
                          value={form.insurance_group_number}
                          onChange={(e) =>
                            patch({ insurance_group_number: e.target.value })
                          }
                          placeholder="Group number"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <FieldRow
                      label="Provider"
                      value={profile?.insurance_provider}
                    />
                    <FieldRow
                      label="Policy Number"
                      value={profile?.insurance_policy_number}
                    />
                    <FieldRow
                      label="Group Number"
                      value={profile?.insurance_group_number}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Address */}
          {(editing || profile?.address_street || profile?.address_city) && (
            <Card className="py-0">
              <CardContent className="px-5 py-4">
                <SectionHeader icon={MapPin} title="Address" />
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <FieldLabel>Street Address</FieldLabel>
                      <InlineInput
                        value={form.address_street}
                        onChange={(e) =>
                          patch({ address_street: e.target.value })
                        }
                        placeholder="123 Main Street, Apt 4B"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>City</FieldLabel>
                        <InlineInput
                          value={form.address_city}
                          onChange={(e) =>
                            patch({ address_city: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>State</FieldLabel>
                        <InlineInput
                          value={form.address_state}
                          onChange={(e) =>
                            patch({ address_state: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>ZIP Code</FieldLabel>
                        <InlineInput
                          value={form.address_zip}
                          onChange={(e) =>
                            patch({ address_zip: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Country</FieldLabel>
                        <InlineInput
                          value={form.address_country}
                          onChange={(e) =>
                            patch({ address_country: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {profile?.address_street && (
                      <FieldRow label="Street" value={profile.address_street} />
                    )}
                    <FieldRow label="City" value={profile?.address_city} />
                    <FieldRow label="State" value={profile?.address_state} />
                    <FieldRow label="ZIP" value={profile?.address_zip} />
                    <FieldRow
                      label="Country"
                      value={profile?.address_country}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — vitals + AI tags + IDs */}
        <div className="space-y-4">
          {/* Vitals */}
          <Card className="py-0">
            <CardContent className="px-5 py-4">
              <SectionHeader icon={Activity} title="Vitals" />
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Height (cm)</FieldLabel>
                      <InlineInput
                        type="number"
                        value={form.height_cm}
                        onChange={(e) => patch({ height_cm: e.target.value })}
                        placeholder="170"
                        min={0}
                      />
                    </div>
                    <div>
                      <FieldLabel>Weight (kg)</FieldLabel>
                      <InlineInput
                        type="number"
                        value={form.weight_kg}
                        onChange={(e) => patch({ weight_kg: e.target.value })}
                        placeholder="70"
                        min={0}
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Blood Pressure</FieldLabel>
                    <InlineInput
                      value={form.blood_pressure}
                      onChange={(e) =>
                        patch({ blood_pressure: e.target.value })
                      }
                      placeholder="120/80"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile?.height_cm && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Height
                      </span>
                      <Badge
                        variant="secondary"
                        className="font-semibold tabular-nums text-xs"
                      >
                        {profile.height_cm} cm
                      </Badge>
                    </div>
                  )}
                  {profile?.weight_kg && (
                    <>
                      {profile.height_cm && <Separator />}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Weight
                        </span>
                        <Badge
                          variant="secondary"
                          className="font-semibold tabular-nums text-xs"
                        >
                          {profile.weight_kg} kg
                        </Badge>
                      </div>
                    </>
                  )}
                  {profile?.blood_pressure && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Blood Pressure
                        </span>
                        <Badge
                          variant="secondary"
                          className="font-semibold tabular-nums text-xs"
                        >
                          {profile.blood_pressure}
                        </Badge>
                      </div>
                    </>
                  )}
                  {!profile?.height_cm &&
                    !profile?.weight_kg &&
                    !profile?.blood_pressure && (
                      <p className="text-xs text-muted-foreground/60">
                        No vitals recorded.
                      </p>
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Metrics — selectable input + history + trend chart */}
          <Card className="py-0">
            <CardHeader className="px-5 pt-4 pb-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                Health Metrics
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-1">
                Add one metric at a time and review day-wise history.
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-3 space-y-4">
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Metric</FieldLabel>
                    <InlineSelect
                      value={metricType}
                      onChange={(e) =>
                        setMetricType(e.target.value as PatientMetricType)
                      }
                    >
                      {METRIC_OPTIONS.map((option) => (
                        <option key={option.type} value={option.type}>
                          {option.label}
                        </option>
                      ))}
                    </InlineSelect>
                  </div>
                  <div>
                    <FieldLabel>Recorded At</FieldLabel>
                    <InlineInput
                      type="datetime-local"
                      value={metricRecordedAt}
                      onChange={(e) => setMetricRecordedAt(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <div>
                    <FieldLabel>
                      Value ({selectedMetricMeta?.unit ?? ""})
                    </FieldLabel>
                    <InlineInput
                      value={metricValue}
                      onChange={(e) => setMetricValue(e.target.value)}
                      placeholder={selectedMetricMeta?.placeholder ?? "Enter value"}
                    />
                  </div>
                  <div className="sm:self-end">
                    <Button
                      type="button"
                      onClick={handleAddMetric}
                      disabled={metricSubmitting || !profile}
                      className="w-full gap-2 sm:w-auto"
                    >
                      {metricSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Add Input
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  {metricLabel(metricType)} Trend
                </p>
                <MetricTrendChart
                  entries={selectedMetricEntries}
                  unit={selectedMetricMeta?.unit ?? ""}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  Recent History
                </p>
                <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
                  {metricsLoading ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading metric history…
                    </div>
                  ) : selectedMetricEntries.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No {metricLabel(metricType).toLowerCase()} history yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/70">
                      {selectedMetricEntries.slice(0, 20).map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                        >
                          <span className="font-medium text-foreground tabular-nums">
                            {entry.value} {entry.unit}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(entry.recorded_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Condition Tags — only shown when not in editing mode (it has its own save) */}
          {!editing && profile && (
            <AiConditionTagsCard
              profile={profile}
              onProfileUpdated={onProfileUpdated}
            />
          )}

          {/* BMI widget — shows live preview in edit mode, stored values when viewing */}
          {editing ? (
            <BmiWidget
              heightCm={form.height_cm ? Number(form.height_cm) : null}
              weightKg={form.weight_kg ? Number(form.weight_kg) : null}
              dob={form.date_of_birth || null}
            />
          ) : (
            <BmiWidget
              heightCm={profile?.height_cm ?? null}
              weightKg={profile?.weight_kg ?? null}
              dob={profile?.date_of_birth ?? null}
            />
          )}

          {/* Your IDs */}
          {profile && (
            <Card className="py-0">
              <CardHeader className="px-5 pt-4 pb-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted">
                    <Copy className="h-3.5 w-3.5" />
                  </div>
                  Your IDs
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Share these with your care team.
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-4 pt-3 space-y-3">
                <Separator />
                <CopyableId label="User ID" value={user.id} />
                <CopyableId label="Patient Profile ID" value={profile.id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Sticky save bar (mobile-friendly, appears only when editing) ── */}
      {editing && (
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/95 px-5 py-4 shadow-lg backdrop-blur-md">
          <p className="text-sm text-muted-foreground">
            You have{" "}
            <span className="font-semibold text-foreground">
              unsaved changes
            </span>
            .
          </p>
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={submitting}
              className="gap-2"
            >
              <Ban className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
