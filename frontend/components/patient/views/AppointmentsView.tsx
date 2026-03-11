"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarDays,
  FileText,
  ChevronRight,
  TrendingUp,
  Info,
  UserRound,
  Clock,
} from "lucide-react";
import type { Appointment, MappingDoctor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | Appointment["status"];

interface AppointmentsViewProps {
  upcoming: Appointment[];
  history: Appointment[];
  doctors: MappingDoctor[];
  onBookAppointment: () => void;
  onRefresh: () => Promise<void>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    icon: AlertCircle,
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    accent: "border-l-amber-500",
    stat: "text-amber-600 dark:text-amber-400",
    statBg: "bg-amber-500/10",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle2,
    badge: "border-primary/30 bg-primary/10 text-primary",
    dot: "bg-primary",
    accent: "border-l-primary",
    stat: "text-primary",
    statBg: "bg-primary/10",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    accent: "border-l-emerald-500",
    stat: "text-emerald-600 dark:text-emerald-400",
    statBg: "bg-emerald-500/10",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    accent: "border-l-destructive",
    stat: "text-destructive",
    statBg: "bg-destructive/10",
  },
} as const satisfies Record<
  Appointment["status"],
  {
    label: string;
    icon: React.ElementType;
    badge: string;
    dot: string;
    accent: string;
    stat: string;
    statBg: string;
  }
>;

const FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: "All",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isTomorrow(iso: string) {
  const d = new Date(iso);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear()
  );
}

function getRelativeLabel(iso: string): string | null {
  if (isToday(iso)) return "Today";
  if (isTomorrow(iso)) return "Tomorrow";
  return null;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AppointmentTimelineCard({
  appt,
  isLast,
  doctorName,
}: {
  appt: Appointment;
  isLast: boolean;
  doctorName: string;
}) {
  const d = new Date(appt.scheduled_time);
  const config = STATUS_CONFIG[appt.status];
  const StatusIcon = config.icon;
  const rel = getRelativeLabel(appt.scheduled_time);

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background shadow-sm",
            config.statBg,
          )}
        >
          <StatusIcon className={cn("h-3.5 w-3.5", config.stat)} />
        </div>
        {!isLast && (
          <div
            className="mt-1 w-px flex-1 bg-border"
            style={{ minHeight: "1.5rem" }}
          />
        )}
      </div>

      {/* Card */}
      <div
        className={cn(
          "mb-4 flex-1 rounded-xl border border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md",
          config.accent,
        )}
      >
        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              {rel && (
                <span
                  className={cn(
                    "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                    appt.status === "CONFIRMED"
                      ? "bg-primary/10 text-primary"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {rel}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 text-muted-foreground/60" />
                <p className="text-sm font-semibold text-card-foreground">
                  {doctorName}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(appt.scheduled_time)}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTime(appt.scheduled_time)}
              </div>
            </div>

            {/* Status badge */}
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                config.badge,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
              {config.label}
            </span>
          </div>

          {/* Notes */}
          {appt.notes && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <FileText className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" />
              <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                {appt.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <p className="font-mono text-[10px] text-muted-foreground/40 select-all">
              #{appt.id.slice(0, 8).toUpperCase()}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
              <CalendarDays className="h-3 w-3" />
              {d.toLocaleDateString("en-US", { weekday: "long" })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentListRow({
  appt,
  doctorName,
}: {
  appt: Appointment;
  doctorName: string;
}) {
  const config = STATUS_CONFIG[appt.status];
  const StatusIcon = config.icon;

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Date block */}
      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-border bg-muted/40 py-2.5 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {new Date(appt.scheduled_time).toLocaleDateString("en-US", {
            month: "short",
          })}
        </span>
        <span className="text-2xl font-bold leading-tight text-foreground tabular-nums">
          {new Date(appt.scheduled_time).getDate()}
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          {new Date(appt.scheduled_time).getFullYear()}
        </span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <p className="text-sm font-semibold text-card-foreground truncate">
            {doctorName}
          </p>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTime(appt.scheduled_time)}</span>
          <span className="text-muted-foreground/30">·</span>
          <span>
            {new Date(appt.scheduled_time).toLocaleDateString("en-US", {
              weekday: "long",
            })}
          </span>
        </div>
        {appt.notes && (
          <p className="mt-1 text-xs text-muted-foreground/70 line-clamp-1">
            {appt.notes}
          </p>
        )}
      </div>

      {/* Status */}
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
          config.badge,
        )}
      >
        <StatusIcon className="h-3.5 w-3.5" />
        {config.label}
      </span>

      <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5" />
    </div>
  );
}

function EmptySlate({
  hasFilter,
  onClear,
  onBook,
}: {
  hasFilter: boolean;
  onClear: () => void;
  onBook: () => void;
}) {
  if (hasFilter) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <CalendarDays className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="mt-5 text-sm font-semibold text-muted-foreground">
          No results
        </p>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground/60">
          No appointments match that filter.
        </p>
        <button
          onClick={onClear}
          className="mt-5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear filter
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <CalendarDays className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <p className="mt-5 text-base font-semibold text-muted-foreground">
        No appointments yet
      </p>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground/60">
        You're all clear — or book a new appointment with one of your linked
        doctors.
      </p>
      <Button onClick={onBook} className="mt-6 gap-2">
        <Plus className="h-4 w-4" />
        Book Appointment
      </Button>
    </div>
  );
}

// ─── Enhanced Calendar ────────────────────────────────────────────────────────
// Renders a calendar where:
//   • Today is highlighted with a distinct amber/yellow background
//   • Days with appointments get a vivid teal/primary background tile

function AppointmentCalendar({
  appointmentDates,
  selected,
  onSelect,
}: {
  appointmentDates: Date[];
  selected: Date | undefined;
  onSelect: (d: Date | undefined) => void;
}) {
  const today = new Date();

  // Build a set of "YYYY-MM-DD" strings for fast lookup
  const apptDateSet = useMemo(() => {
    const s = new Set<string>();
    for (const d of appointmentDates) {
      s.add(
        `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      );
    }
    return s;
  }, [appointmentDates]);

  function dateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const isApptDay = (d: Date) => apptDateSet.has(dateKey(d));
  const isTodayDay = (d: Date) => isSameDay(d, today);
  const isSelectedDay = (d: Date) => !!selected && isSameDay(d, selected);

  return (
    <CalendarWidget
      mode="single"
      selected={selected}
      onSelect={(d) => {
        if (!d) {
          onSelect(undefined);
          return;
        }
        if (selected && isSameDay(selected, d)) {
          onSelect(undefined);
          return;
        }
        onSelect(d);
      }}
      components={{
        DayButton: ({ day, modifiers, className, ...buttonProps }) => {
          const date = day.date;
          const todayDay = isTodayDay(date);
          const apptDay = isApptDay(date);
          const selDay = isSelectedDay(date);

          // DayButton renders inside the <td> react-day-picker already provides,
          // so there is no button-inside-tr nesting issue.
          return (
            <button
              {...buttonProps}
              disabled={modifiers.disabled}
              className={cn(
                // base — fill the cell
                "relative mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                // disabled
                "disabled:pointer-events-none disabled:opacity-30",
                // today — warm amber tile
                todayDay &&
                  !selDay &&
                  "bg-amber-400/25 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-bold ring-1 ring-amber-400/50",
                // appointment day — primary tile
                apptDay &&
                  !todayDay &&
                  !selDay &&
                  "bg-primary/15 text-primary font-semibold ring-1 ring-primary/30",
                // appointment day that is also today
                apptDay &&
                  todayDay &&
                  !selDay &&
                  "bg-amber-400/30 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300 font-bold ring-2 ring-primary/40",
                // selected — solid primary
                selDay &&
                  "bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary/50",
                // plain day hover
                !todayDay &&
                  !apptDay &&
                  !selDay &&
                  "hover:bg-muted hover:text-foreground",
              )}
            >
              {date.getDate()}
              {/* Accent pip for appointment days that aren't selected */}
              {apptDay && !selDay && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary opacity-70" />
              )}
            </button>
          );
        },
      }}
      className="w-full"
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AppointmentsView({
  upcoming,
  history,
  doctors,
  onBookAppointment,
  onRefresh,
}: AppointmentsViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);

  // All appointments merged, upcoming first then history (newest last)
  // Build doctor_id → display name lookup from already-loaded doctors list
  const doctorNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of doctors) {
      map.set(d.profile_id, `Dr. ${d.first_name} ${d.last_name}`);
    }
    return map;
  }, [doctors]);

  const allAppointments = useMemo(
    () => [...upcoming, ...history],
    [upcoming, history],
  );

  const appointmentDates = useMemo(
    () => allAppointments.map((a) => new Date(a.scheduled_time)),
    [allAppointments],
  );

  // Flat sorted list: future/active first (asc), past last (desc within past)
  const sortedAll = useMemo(() => {
    const now = new Date();
    const future = [...upcoming].sort(
      (a, b) =>
        new Date(a.scheduled_time).getTime() -
        new Date(b.scheduled_time).getTime(),
    );
    const past = [...history].sort(
      (a, b) =>
        new Date(b.scheduled_time).getTime() -
        new Date(a.scheduled_time).getTime(),
    );
    // Partition upcoming into truly future vs already-past (edge case)
    const futureSafe = future.filter(
      (a) =>
        new Date(a.scheduled_time) >= now ||
        a.status === "PENDING" ||
        a.status === "CONFIRMED",
    );
    return [...futureSafe, ...past];
  }, [upcoming, history]);

  // Filter helpers
  const filteredAll = useMemo(() => {
    let result = sortedAll;
    if (statusFilter !== "ALL") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (calendarDate) {
      result = result.filter((a) =>
        isSameDay(new Date(a.scheduled_time), calendarDate),
      );
    }
    return result;
  }, [sortedAll, statusFilter, calendarDate]);

  const hasFilter = statusFilter !== "ALL" || calendarDate !== undefined;

  function clearFilter() {
    setStatusFilter("ALL");
    setCalendarDate(undefined);
  }

  // Adherence rate
  const completedCount = useMemo(
    () => history.filter((a) => a.status === "COMPLETED").length,
    [history],
  );
  const cancelledCount = useMemo(
    () => history.filter((a) => a.status === "CANCELLED").length,
    [history],
  );
  const adherenceRate = useMemo(() => {
    const total = completedCount + cancelledCount;
    if (total === 0) return null;
    return Math.round((completedCount / total) * 100);
  }, [completedCount, cancelledCount]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your visits, track history, and book new consultations.
          </p>
        </div>
        <Button onClick={onBookAppointment} className="w-fit gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Book Appointment
        </Button>
      </div>

      {/* ── Main layout: Calendar + List ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[296px_1fr]">
        {/* ── Left: Calendar sidebar ── */}
        <div className="space-y-5">
          <Card className="overflow-hidden py-0 shadow-sm">
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" />
                Schedule Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <AppointmentCalendar
                appointmentDates={appointmentDates}
                selected={calendarDate}
                onSelect={setCalendarDate}
              />

              {/* Calendar legend */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-amber-400/30 ring-1 ring-amber-400/50" />
                  <span className="text-[11px] text-muted-foreground">
                    Today
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-primary/15 ring-1 ring-primary/30" />
                  <span className="text-[11px] text-muted-foreground">
                    Has appointment
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-primary" />
                  <span className="text-[11px] text-muted-foreground">
                    Selected
                  </span>
                </div>
              </div>

              {/* Selected date summary */}
              {calendarDate && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-primary">
                      {calendarDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <button
                      onClick={() => setCalendarDate(undefined)}
                      className="text-xs text-primary/70 hover:text-primary transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {filteredAll.length} appointment
                    {filteredAll.length !== 1 ? "s" : ""} on this day
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Adherence insight */}
          {adherenceRate !== null && (
            <Card className="py-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm font-semibold text-card-foreground">
                    Visit Adherence
                  </p>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-bold text-card-foreground tabular-nums">
                      {adherenceRate}%
                    </span>
                    <span className="text-sm text-muted-foreground pb-1">
                      completion rate
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                      style={{ width: `${adherenceRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {completedCount} completed · {cancelledCount} cancelled
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tip */}
          <Card className="py-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Click a highlighted date to filter appointments for that day.
                  Click again to deselect.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Filter bar + Flat list ── */}
        <div className="min-w-0 space-y-4">
          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              ["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const
            ).map((s) => {
              const active = statusFilter === s;
              const count =
                s === "ALL"
                  ? allAppointments.length
                  : allAppointments.filter((a) => a.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                  )}
                >
                  {FILTER_LABELS[s]}
                  <span
                    className={cn(
                      "tabular-nums text-[10px]",
                      active ? "text-primary/70" : "text-muted-foreground/60",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {hasFilter && (
              <button
                onClick={clearFilter}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Flat chronological list */}
          {filteredAll.length === 0 ? (
            <EmptySlate
              hasFilter={hasFilter}
              onClear={clearFilter}
              onBook={onBookAppointment}
            />
          ) : (
            <div className="pt-1">
              {filteredAll.map((appt, i) => (
                <AppointmentTimelineCard
                  key={appt.id}
                  appt={appt}
                  isLast={i === filteredAll.length - 1}
                  doctorName={
                    doctorNameMap.get(appt.doctor_id) ?? "Unknown Doctor"
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
