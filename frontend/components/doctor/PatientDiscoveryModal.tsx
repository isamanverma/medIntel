"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  X,
  UserPlus,
  Check,
  Loader2,
  Users,
  Filter,
  ChevronDown,
  AlertCircle,
  Droplets,
  UserRound,
  Calendar,
  Tag,
  Sparkles,
} from "lucide-react";
import { discoverPatients, createMapping } from "@/lib/api-client";
import type { PatientDiscoveryResult } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

// ── Constants ─────────────────────────────────────────────────────

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];
const DEBOUNCE_MS = 320;

// Common medical condition tags for quick-select suggestions
const SUGGESTED_TAGS = [
  "migraine",
  "headache",
  "diabetes",
  "hypertension",
  "asthma",
  "epilepsy",
  "seizure",
  "arthritis",
  "depression",
  "anxiety",
  "chronic pain",
  "heart disease",
  "back pain",
  "blurred vision",
  "fatigue",
];

// ── Types ─────────────────────────────────────────────────────────

interface PatientDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a patient is successfully linked so parent can refresh */
  onPatientLinked: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function AvatarCircle({ first, last }: { first: string; last: string }) {
  // deterministic pastel color from name
  const hue =
    ((first.charCodeAt(0) ?? 0) * 37 + (last.charCodeAt(0) ?? 0) * 17) % 360;
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: `hsl(${hue} 55% 52%)` }}
    >
      {getInitials(first, last)}
    </div>
  );
}

// ── Filter Pill ───────────────────────────────────────────────────

interface FilterDropdownProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  icon: React.ReactNode;
}

function FilterDropdown({
  label,
  value,
  options,
  onSelect,
  icon,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = !!value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
          active
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
        }`}
      >
        {icon}
        {active ? value : label}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-32 rounded-xl border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Clear option */}
          {active && (
            <button
              type="button"
              onClick={() => {
                onSelect("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors rounded-t-xl"
            >
              <X className="h-3 w-3" /> Clear filter
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onSelect(opt);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors last:rounded-b-xl first:rounded-t-xl hover:bg-muted ${
                value === opt ? "font-semibold text-primary" : "text-foreground"
              }`}
            >
              {value === opt && <Check className="h-3 w-3 text-primary" />}
              {value !== opt && <span className="h-3 w-3" />}
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Patient Card ──────────────────────────────────────────────────

interface PatientCardProps {
  patient: PatientDiscoveryResult;
  onAdd: (profileId: string) => void;
  isAdding: boolean;
  /** Currently active tag filter — highlight matching tags on the card */
  activeTag?: string;
  onTagClick: (tag: string) => void;
}

function PatientCard({
  patient,
  onAdd,
  isAdding,
  activeTag,
  onTagClick,
}: PatientCardProps) {
  const linked = patient.already_linked;
  const tags = patient.condition_tags ?? [];

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 transition-all duration-150 ${
        linked
          ? "border-secondary/30 bg-secondary/5 opacity-80"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      {/* Top row: avatar + info + action */}
      <div className="flex items-center gap-3">
        <AvatarCircle first={patient.first_name} last={patient.last_name} />

        {/* Info */}
        <div className="min-w-0 grow">
          <p className="truncate text-sm font-semibold text-card-foreground">
            {patient.first_name} {patient.last_name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            {patient.age !== null && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {patient.age} yrs
              </span>
            )}
            {patient.gender && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <UserRound className="h-3 w-3" />
                {patient.gender}
              </span>
            )}
            {patient.blood_group && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
                <Droplets className="h-3 w-3" />
                {patient.blood_group}
              </span>
            )}
          </div>
        </div>

        {/* Action */}
        {linked ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-[11px] font-semibold text-secondary">
            <Check className="h-3.5 w-3.5" />
            Linked
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onAdd(patient.profile_id)}
            disabled={isAdding}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            Add
          </button>
        )}
      </div>

      {/* Condition tags row */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-[52px]">
          {tags.map((tag) => {
            const isActive =
              activeTag?.trim().toLowerCase() === tag.trim().toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick(tag)}
                title={`Filter by "${tag}"`}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "border border-primary/25 bg-primary/8 text-primary hover:bg-primary/20"
                }`}
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────

export default function PatientDiscoveryModal({
  isOpen,
  onClose,
  onPatientLinked,
}: PatientDiscoveryModalProps) {
  const { toast } = useToast();

  // Search state
  const [query, setQuery] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [gender, setGender] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Results state
  const [results, setResults] = useState<PatientDiscoveryResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Per-card adding state: maps profile_id → loading bool
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  const searchInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Focus search input when modal opens ───────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 80);
    } else {
      // Reset state on close
      setQuery("");
      setBloodGroup("");
      setGender("");
      setTagFilter("");
      setTagInput("");
      setShowTagSuggestions(false);
      setResults([]);
      setHasSearched(false);
      setSearchError(null);
    }
  }, [isOpen]);

  // ── Escape key ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ── Body scroll lock ──────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ── Core search function ──────────────────────────────────────
  const runSearch = useCallback(
    async (q: string, bg: string, gen: string, tag: string) => {
      // Require at least a filter or 1+ chars before hitting the API
      const hasFilter = bg || gen || tag;
      if (!q.trim() && !hasFilter) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setSearching(true);
      setSearchError(null);

      try {
        const data = await discoverPatients({
          q: q.trim() || undefined,
          blood_group: bg || undefined,
          gender: gen || undefined,
          tag: tag.trim() || undefined,
          limit: 40,
        });
        setResults(data);
        setHasSearched(true);
      } catch (err: unknown) {
        setSearchError(
          err instanceof Error
            ? err.message
            : "Search failed. Please try again.",
        );
        setResults([]);
        setHasSearched(true);
      } finally {
        setSearching(false);
      }
    },
    [],
  );

  // ── Debounced search on query / filter change ─────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query, bloodGroup, gender, tagFilter);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, bloodGroup, gender, tagFilter, runSearch]);

  // ── Instant search on filter change (no debounce needed) ─────
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    // runSearch will be triggered by the useEffect above
  };

  // ── Tag filter helpers ────────────────────────────────────────
  const applyTagFilter = (tag: string) => {
    const normalised = tag.trim().toLowerCase();
    setTagFilter(normalised);
    setTagInput(normalised);
    setShowTagSuggestions(false);
  };

  const clearTagFilter = () => {
    setTagFilter("");
    setTagInput("");
    setShowTagSuggestions(false);
  };

  const filteredSuggestions = SUGGESTED_TAGS.filter(
    (t) =>
      tagInput.trim() &&
      t.includes(tagInput.trim().toLowerCase()) &&
      t !== tagInput.trim().toLowerCase(),
  ).slice(0, 6);

  // ── Add patient handler ───────────────────────────────────────
  const handleAdd = async (profileId: string) => {
    setAddingIds((prev) => new Set(prev).add(profileId));
    try {
      await createMapping({ patient_id: profileId });
      toast("Patient linked successfully!", "success");
      // Optimistically flip the already_linked flag in results
      setResults((prev) =>
        prev.map((p) =>
          p.profile_id === profileId ? { ...p, already_linked: true } : p,
        ),
      );
      onPatientLinked();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to link patient",
        "error",
      );
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    }
  };

  // ── Derived counts ────────────────────────────────────────────
  const linkedCount = results.filter((r) => r.already_linked).length;
  const availableCount = results.length - linkedCount;
  const activeFilters = [bloodGroup, gender, tagFilter].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="relative flex w-full max-w-xl flex-col rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ maxHeight: "min(82vh, 680px)" }}
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground leading-tight">
                Add Patient
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Search and link patients to your practice
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Search bar ───────────────────────────────────────── */}
        <div className="border-b border-border px-5 py-3 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by first or last name…"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter
              className={`h-3.5 w-3.5 shrink-0 ${activeFilters > 0 ? "text-primary" : "text-muted-foreground"}`}
            />
            <FilterDropdown
              label="Blood Group"
              value={bloodGroup}
              options={BLOOD_GROUPS}
              onSelect={(v) => handleFilterChange(setBloodGroup, v)}
              icon={<Droplets className="h-3 w-3" />}
            />
            <FilterDropdown
              label="Gender"
              value={gender}
              options={GENDERS}
              onSelect={(v) => handleFilterChange(setGender, v)}
              icon={<UserRound className="h-3 w-3" />}
            />
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBloodGroup("");
                  setGender("");
                  clearTagFilter();
                }}
                className="ml-auto text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Tag search row */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Sparkles className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/60 pointer-events-none" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setTagFilter(e.target.value.trim().toLowerCase());
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowTagSuggestions(false), 150)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyTagFilter(tagInput);
                    }
                    if (e.key === "Escape") clearTagFilter();
                  }}
                  placeholder="Search by condition tag (e.g. migraine, epilepsy…)"
                  className={`w-full rounded-lg border py-1.5 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 outline-none transition-colors ${
                    tagFilter
                      ? "border-primary bg-primary/5 focus:border-primary focus:ring-primary"
                      : "border-border bg-background focus:border-primary focus:ring-primary"
                  }`}
                />
                {tagInput && (
                  <button
                    type="button"
                    onClick={clearTagFilter}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Active tag badge */}
            {tagFilter && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">
                  Filtering by tag:
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                  <Tag className="h-2.5 w-2.5" />
                  {tagFilter}
                  <button
                    type="button"
                    onClick={clearTagFilter}
                    className="ml-0.5 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              </div>
            )}

            {/* Autocomplete suggestions dropdown */}
            {showTagSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggestions
                </p>
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={() => applyTagFilter(suggestion)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors last:rounded-b-xl"
                  >
                    <Tag className="h-3 w-3 text-primary/60" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick-select common tag chips */}
          {!tagFilter && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-muted-foreground self-center">
                Quick:
              </span>
              {SUGGESTED_TAGS.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => applyTagFilter(tag)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Results body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          {/* Loading */}
          {searching && (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Searching patients…
              </p>
            </div>
          )}

          {/* Error */}
          {!searching && searchError && (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm font-medium text-destructive">
                Search error
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {searchError}
              </p>
              <button
                type="button"
                onClick={() => runSearch(query, bloodGroup, gender, tagFilter)}
                className="mt-1 rounded-lg bg-destructive/10 px-4 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Prompt — nothing typed yet */}
          {!searching && !searchError && !hasSearched && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Search className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-card-foreground">
                Find your patients
              </p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Search by name, or filter by blood group, gender, or{" "}
                <span className="font-medium text-primary">condition tag</span>{" "}
                to find patients whose conditions match your expertise.
              </p>
            </div>
          )}

          {/* Empty results */}
          {!searching &&
            !searchError &&
            hasSearched &&
            results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Users className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-card-foreground">
                  No patients found
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Try a different name or adjust the filters.
                </p>
              </div>
            )}

          {/* Results list */}
          {!searching && !searchError && results.length > 0 && (
            <>
              {/* Summary bar */}
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {results.length}
                  </span>{" "}
                  {results.length === 1 ? "result" : "results"}
                  {availableCount > 0 && (
                    <span>
                      {" "}
                      ·{" "}
                      <span className="text-primary font-medium">
                        {availableCount} available
                      </span>
                    </span>
                  )}
                  {linkedCount > 0 && (
                    <span>
                      {" "}
                      ·{" "}
                      <span className="text-secondary font-medium">
                        {linkedCount} already linked
                      </span>
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                {results.map((patient) => (
                  <PatientCard
                    key={patient.profile_id}
                    patient={patient}
                    onAdd={handleAdd}
                    isAdding={addingIds.has(patient.profile_id)}
                    activeTag={tagFilter}
                    onTagClick={(tag) => applyTagFilter(tag)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="border-t border-border px-5 py-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Showing up to 40 results
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
