"use client";

import { useState, useCallback, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import {
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
  X,
  Tag,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateConditionTags } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import type { BookingFormState } from "@/hooks/use-booking-form";
import type { MappingDoctor } from "@/lib/types";

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: MappingDoctor[];
  form: BookingFormState;
  onPatch: (patch: Partial<BookingFormState>) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatSlot(slot: string) {
  const [h, m] = slot.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 8; h <= 18; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 18) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
})();

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-medium text-foreground"
    >
      {children}
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BookingFormModal({
  isOpen,
  onClose,
  doctors,
  form,
  onPatch,
  submitting,
  onSubmit,
}: BookingFormModalProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  // Internal date + time state — we derive form.scheduled_time from these
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("09:00");

  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Sync date + time → form.scheduled_time whenever either changes
  const handleDateSelect = useCallback(
    (d: Date | undefined) => {
      // Toggle off if clicking the same day
      if (d && selectedDate && isSameDay(d, selectedDate)) {
        setSelectedDate(undefined);
        onPatch({ scheduled_time: "" });
        return;
      }
      setSelectedDate(d);
      if (d) {
        const [h, m] = selectedTime.split(":").map(Number);
        const dt = new Date(d);
        dt.setHours(h, m, 0, 0);
        onPatch({ scheduled_time: dt.toISOString() });
      } else {
        onPatch({ scheduled_time: "" });
      }
    },
    [selectedDate, selectedTime, onPatch],
  );

  const handleTimeSelect = useCallback(
    (slot: string) => {
      setSelectedTime(slot);
      if (selectedDate) {
        const [h, m] = slot.split(":").map(Number);
        const dt = new Date(selectedDate);
        dt.setHours(h, m, 0, 0);
        onPatch({ scheduled_time: dt.toISOString() });
      }
    },
    [selectedDate, onPatch],
  );

  const selectedDateTime = useMemo(() => {
    if (!form.scheduled_time) return null;
    return new Date(form.scheduled_time);
  }, [form.scheduled_time]);

  const isPast = selectedDateTime ? selectedDateTime <= new Date() : false;

  // Reset internal pickers when modal closes
  const handleClose = useCallback(() => {
    setSelectedDate(undefined);
    setSelectedTime("09:00");
    onClose();
  }, [onClose]);

  // AI tag generation
  const handleGenerateTags = useCallback(async () => {
    if (!form.meeting_notes.trim()) {
      toast(
        "Please describe your symptoms or reason for visit first.",
        "error",
      );
      return;
    }
    setGenerating(true);
    try {
      const result = await generateConditionTags(form.meeting_notes.trim());
      onPatch({ meeting_tags: result.tags });
      toast(
        `Generated ${result.tags.length} symptom tag${result.tags.length !== 1 ? "s" : ""}!`,
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
      if (status === 429) {
        toast(
          "AI quota limit reached. Please wait a moment and try again.",
          "error",
        );
      } else if (status === 503) {
        toast("AI service is not configured. Please contact support.", "error");
      } else {
        toast(
          err instanceof Error ? err.message : "Failed to generate tags.",
          "error",
        );
      }
    } finally {
      setGenerating(false);
    }
  }, [form.meeting_notes, onPatch, toast]);

  const removeTag = useCallback(
    (tag: string) => {
      onPatch({ meeting_tags: form.meeting_tags.filter((t) => t !== tag) });
    },
    [form.meeting_tags, onPatch],
  );

  const hasTags = form.meeting_tags.length > 0;
  const canGenerate =
    form.meeting_notes.trim().length > 0 && !generating && !submitting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Book Appointment"
      maxWidth="max-w-2xl"
    >
      {doctors.length === 0 ? (
        /* ── No doctors linked ── */
        <div className="flex flex-col items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-5 py-8 text-center">
          <AlertCircle className="h-8 w-8 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              No linked doctors yet
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/70 max-w-xs">
              Ask your doctor to add you as a patient from their portal before
              you can book an appointment.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="mt-1 rounded-md border border-amber-500/30 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          {/* ── Doctor select ── */}
          <div>
            <FieldLabel htmlFor="booking-doctor">Select Doctor</FieldLabel>
            <div className="relative">
              <Stethoscope className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                id="booking-doctor"
                required
                value={form.doctor_id}
                onChange={(e) => onPatch({ doctor_id: e.target.value })}
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none transition-colors appearance-none"
              >
                <option value="">Choose a doctor…</option>
                {doctors.map((d) => (
                  <option key={d.profile_id} value={d.profile_id}>
                    Dr. {d.first_name} {d.last_name}
                    {d.specialization ? ` — ${d.specialization}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Date + Time picker ── */}
          <div>
            <FieldLabel>Date &amp; Time</FieldLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Calendar */}
              <div className="rounded-lg border border-border bg-muted/20 p-1">
                <CalendarWidget
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(d) => d < minDate}
                  className="w-full"
                />
              </div>

              {/* Time slots */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] font-medium text-muted-foreground px-0.5">
                  {selectedDate
                    ? selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : "Pick a date first"}
                </p>
                <ScrollArea className="h-[252px] rounded-lg border border-border bg-muted/20 p-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {TIME_SLOTS.map((slot) => {
                      const active = slot === selectedTime && !!selectedDate;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={!selectedDate}
                          onClick={() => handleTimeSelect(slot)}
                          className={cn(
                            "rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {formatSlot(slot)}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Appointment preview chip */}
            {selectedDate && (
              <div
                className={cn(
                  "mt-3 flex items-center gap-2 rounded-md border px-3 py-2.5 text-xs",
                  isPast
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "border-primary/20 bg-primary/5 text-primary",
                )}
              >
                {isPast ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="font-medium">
                  {isPast
                    ? "Selected time is in the past — please choose a future slot."
                    : selectedDateTime?.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                </span>
              </div>
            )}
          </div>

          {/* ── Reason / AI tags section ── */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center gap-2.5 border-b border-primary/15 px-4 py-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  Reason for Visit
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Describe your symptoms — AI can extract structured tags for
                  your doctor
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Notes textarea */}
              <div>
                <textarea
                  id="booking-notes"
                  value={form.meeting_notes}
                  onChange={(e) => onPatch({ meeting_notes: e.target.value })}
                  rows={3}
                  placeholder="e.g. Persistent headache for 3 days, mild fever and fatigue. Worse in the mornings…"
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors leading-relaxed"
                />
              </div>

              {/* Generate button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateTags}
                  disabled={!canGenerate}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    canGenerate
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-primary/30 text-primary-foreground/60 cursor-not-allowed",
                  )}
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
                </button>
                {!form.meeting_notes.trim() && (
                  <p className="text-[10px] text-muted-foreground/60">
                    Type your symptoms above to enable
                  </p>
                )}
              </div>

              {/* Tags area */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="h-3 w-3 text-primary/70" />
                  <span className="text-xs font-semibold text-foreground">
                    Symptom Tags
                  </span>
                  {hasTags && (
                    <span className="ml-1 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                      {form.meeting_tags.length}
                    </span>
                  )}
                </div>

                {hasTags ? (
                  <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-background/60 p-2.5 min-h-10">
                    {form.meeting_tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="rounded-full p-0.5 hover:bg-primary/25 transition-colors"
                          title={`Remove "${tag}"`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background/40 px-3 py-4 text-center">
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary/50" />
                        <p className="text-xs text-muted-foreground/60">
                          Analyzing your description…
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground/50">
                        Tags will appear here after clicking{" "}
                        <strong className="text-muted-foreground/70">
                          Generate Tags
                        </strong>
                      </p>
                    )}
                  </div>
                )}

                {hasTags && (
                  <p className="mt-1.5 text-[10px] text-muted-foreground/50">
                    These tags will be included with your appointment notes.
                    Click × to remove any.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                !form.doctor_id ||
                !selectedDate ||
                !form.scheduled_time ||
                isPast
              }
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Booking…
                </>
              ) : (
                <>
                  <Calendar className="h-3.5 w-3.5" />
                  Book Appointment
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
