"use client";

import type { Appointment, MappingDoctor } from "@/lib/types";
import {
  CalendarDays,
  Clock,
  Inbox,
  Info,
  Plus,
  RefreshCw,
  TrendingUp,
  UserRound,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";

import { AppointmentCallGate } from "@/components/chat/AppointmentCallGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | Appointment["status"];

interface AppointmentsViewProps {
  upcoming: Appointment[];
  history: Appointment[];
  doctors: MappingDoctor[];
  onBookAppointment: () => void;
  onCancelAppointment: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  sessionReady?: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    badge:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
  },
} as const;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isTomorrow(iso: string) {
  const d = new Date(iso);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function getRelativeLabel(iso: string): string | null {
  if (isToday(iso)) return "Today";
  if (isTomorrow(iso)) return "Tomorrow";
  return null;
}

// ─── Appointment Row ──────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  doctorName,
  onCancelAppointment,
  sessionReady = false,
}: {
  appt: Appointment;
  doctorName: string;
  onCancelAppointment: (id: string) => Promise<void>;
  sessionReady?: boolean;
}) {
  const cfg =
    STATUS_CONFIG[appt.status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.PENDING;
  const rel = getRelativeLabel(appt.scheduled_time);

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors group">
      {/* Date blob */}
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/15 text-primary">
        <span className="text-[10px] font-semibold uppercase leading-none tracking-wide">
          {new Date(appt.scheduled_time).toLocaleDateString("en-US", {
            month: "short",
          })}
        </span>
        <span className="text-lg font-bold leading-tight">
          {new Date(appt.scheduled_time).getDate()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">{doctorName}</p>
          </div>
          {rel && (
            <Badge
              variant="outline"
              className={cn(
                "h-5 px-1.5 text-[10px] font-semibold",
                rel === "Today"
                  ? "border-amber-500/30 text-amber-600 bg-amber-500/5 dark:text-amber-400"
                  : "border-sky-500/30 text-sky-600 bg-sky-500/5 dark:text-sky-400",
              )}
            >
              {rel}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-foreground/60">
          {formatDate(appt.scheduled_time)} &middot;{" "}
          {formatTime(appt.scheduled_time)}
          {appt.notes && (
            <span className="text-foreground/40">
              {" "}
              &middot;{" "}
              {appt.notes.length > 60
                ? appt.notes.slice(0, 60) + "..."
                : appt.notes}
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="outline"
          className={cn("text-xs font-medium", cfg.badge)}
        >
          <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", cfg.dot)} />
          {cfg.label}
        </Badge>

        {(appt.status === "PENDING" || appt.status === "CONFIRMED") && (
          <button
            onClick={() => onCancelAppointment(appt.id)}
            title="Cancel appointment"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        )}

        {appt.status !== "COMPLETED" && appt.status !== "CANCELLED" && (
          <AppointmentCallGate
            appointmentId={appt.id}
            fallbackName={doctorName}
            sessionReady={sessionReady}
          />
        )}
      </div>
    </div>
  );
}

// ─── Appointment Calendar ─────────────────────────────────────────────────────

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
        if (!d) { onSelect(undefined); return; }
        if (selected && isSameDay(selected, d)) { onSelect(undefined); return; }
        onSelect(d);
      }}
      components={{
        DayButton: ({ day, modifiers, ...buttonProps }) => {
          const date = day.date;
          const todayDay = isTodayDay(date);
          const apptDay = isApptDay(date);
          const selDay = isSelectedDay(date);

          return (
            <button
              {...buttonProps}
              disabled={modifiers.disabled}
              className={cn(
                "relative mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-30",
                todayDay && !selDay &&
                  "bg-amber-400/25 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-bold ring-1 ring-amber-400/50",
                apptDay && !todayDay && !selDay &&
                  "bg-primary/15 text-primary font-semibold ring-1 ring-primary/30",
                apptDay && todayDay && !selDay &&
                  "bg-amber-400/30 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300 font-bold ring-2 ring-primary/40",
                selDay &&
                  "bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary/50",
                !todayDay && !apptDay && !selDay &&
                  "hover:bg-muted hover:text-foreground",
              )}
            >
              {date.getDate()}
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
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
      <CardContent className="flex flex-col items-center py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Inbox className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="mt-5 text-base font-medium text-muted-foreground">
          No results
        </p>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground/60">
          No appointments match that filter.
        </p>
        <button
          onClick={onClear}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear filter
        </button>
      </CardContent>
    );
  }

  return (
    <CardContent className="flex flex-col items-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="mt-5 text-base font-medium text-muted-foreground">
        No appointments yet
      </p>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground/60">
        Book a visit with one of your linked doctors.
      </p>
      <Button onClick={onBook} size="sm" className="mt-6 gap-2">
        <Plus className="h-4 w-4" />
        Book Appointment
      </Button>
    </CardContent>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppointmentsView({
  upcoming,
  history,
  doctors,
  onBookAppointment,
  onCancelAppointment,
  onRefresh,
  sessionReady = false,
}: AppointmentsViewProps) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const allAppointments = useMemo(
    () => [...upcoming, ...history],
    [upcoming, history],
  );

  const doctorNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of doctors) {
      map.set(d.profile_id, `Dr. ${d.first_name} ${d.last_name}`);
    }
    return map;
  }, [doctors]);

  const appointmentDates = useMemo(
    () => allAppointments.map((a) => new Date(a.scheduled_time)),
    [allAppointments],
  );

  const counts: Record<StatusFilter, number> = useMemo(
    () => ({
      ALL: allAppointments.length,
      PENDING: allAppointments.filter((a) => a.status === "PENDING").length,
      CONFIRMED: allAppointments.filter((a) => a.status === "CONFIRMED").length,
      COMPLETED: allAppointments.filter((a) => a.status === "COMPLETED").length,
      CANCELLED: allAppointments.filter((a) => a.status === "CANCELLED").length,
    }),
    [allAppointments],
  );

  const todayCount = useMemo(
    () => allAppointments.filter((a) => isToday(a.scheduled_time)).length,
    [allAppointments],
  );

  const sorted = useMemo(() => {
    const now = new Date();
    const active = allAppointments.filter(
      (a) =>
        new Date(a.scheduled_time) >= now ||
        a.status === "PENDING" ||
        a.status === "CONFIRMED",
    );
    const past = allAppointments.filter(
      (a) =>
        new Date(a.scheduled_time) < now &&
        a.status !== "PENDING" &&
        a.status !== "CONFIRMED",
    );
    active.sort(
      (a, b) =>
        new Date(a.scheduled_time).getTime() -
        new Date(b.scheduled_time).getTime(),
    );
    past.sort(
      (a, b) =>
        new Date(b.scheduled_time).getTime() -
        new Date(a.scheduled_time).getTime(),
    );
    return [...active, ...past];
  }, [allAppointments]);

  const filtered = useMemo(() => {
    let result = sorted;
    if (filter !== "ALL") result = result.filter((a) => a.status === filter);
    if (calendarDate)
      result = result.filter((a) =>
        isSameDay(new Date(a.scheduled_time), calendarDate),
      );
    return result;
  }, [sorted, filter, calendarDate]);

  const hasFilter = filter !== "ALL" || calendarDate !== undefined;

  const pagination = usePagination(filtered, { pageSize: 10 });

  useEffect(() => {
    pagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, calendarDate]);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage your visits, track history, and book new consultations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          {todayCount > 0 && (
            <Badge
              variant="outline"
              className="h-8 gap-2 px-3 text-xs font-semibold border-amber-500/30 text-amber-600 bg-amber-500/5 dark:text-amber-400"
            >
              <Clock className="h-3.5 w-3.5" />
              {todayCount} today
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            onClick={onBookAppointment}
            size="sm"
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[296px_1fr]">
        {/* Left: Calendar sidebar */}
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
                  <span className="text-[11px] text-muted-foreground">Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-primary/15 ring-1 ring-primary/30" />
                  <span className="text-[11px] text-muted-foreground">Has appointment</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-primary" />
                  <span className="text-[11px] text-muted-foreground">Selected</span>
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
                    {filtered.length} appointment
                    {filtered.length !== 1 ? "s" : ""} on this day
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

        {/* Right: Filter pills + list */}
        <div className="space-y-4 min-w-0">
          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_OPTIONS.map(({ value, label }) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                    active
                      ? "border-primary/50 bg-primary/15 text-primary shadow-sm"
                      : "border-border bg-card text-foreground/70 hover:border-foreground/30 hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "tabular-nums text-[10px]",
                      active ? "text-primary/80" : "text-foreground/50",
                    )}
                  >
                    {counts[value]}
                  </span>
                </button>
              );
            })}
            {hasFilter && (
              <button
                onClick={() => {
                  setFilter("ALL");
                  setCalendarDate(undefined);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Appointments card */}
          <Card className="gap-0 py-0">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-secondary" />
                <CardTitle className="text-base font-semibold">
                  {filter === "ALL"
                    ? "All Appointments"
                    : `${filter.charAt(0) + filter.slice(1).toLowerCase()} Appointments`}
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className="h-6 px-2.5 text-xs font-medium"
              >
                {filtered.length} total
              </Badge>
            </CardHeader>

            {filtered.length === 0 ? (
              <EmptyState
                hasFilter={hasFilter}
                onClear={() => {
                  setFilter("ALL");
                  setCalendarDate(undefined);
                }}
                onBook={onBookAppointment}
              />
            ) : (
              <>
                <div className="divide-y divide-border">
                  {pagination.pageItems.map((appt) => (
                    <AppointmentRow
                      key={appt.id}
                      appt={appt}
                      doctorName={
                        doctorNameMap.get(appt.doctor_id) ?? "Unknown Doctor"
                      }
                      onCancelAppointment={onCancelAppointment}
                      sessionReady={sessionReady}
                    />
                  ))}
                </div>
                <div className="px-6">
                  <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    pageSize={pagination.pageSize}
                    hasNext={pagination.hasNext}
                    hasPrev={pagination.hasPrev}
                    onNext={pagination.next}
                    onPrev={pagination.prev}
                    onGoTo={pagination.goTo}
                  />
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
