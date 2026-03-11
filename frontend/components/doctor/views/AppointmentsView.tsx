"use client";

import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Inbox,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Appointment, MappingPatient } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

interface AppointmentsViewProps {
  upcoming: Appointment[];
  patients: MappingPatient[];
  onStatusUpdate: (id: string, status: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    badge:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
    stat: "text-amber-600 dark:text-amber-400",
  },
  CONFIRMED: {
    label: "Confirmed",
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    stat: "text-emerald-600 dark:text-emerald-400",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
    stat: "text-sky-600 dark:text-sky-400",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
    stat: "text-destructive",
  },
} as const;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getRelativeLabel(iso: string): string | null {
  if (isToday(iso)) return "Today";
  if (isTomorrow(iso)) return "Tomorrow";
  return null;
}

// ─── Appointment row ──────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  patientName,
  onStatusUpdate,
}: {
  appt: Appointment;
  patientName: string;
  onStatusUpdate: (id: string, status: string) => Promise<void>;
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
          <p className="text-sm font-semibold text-foreground">{patientName}</p>
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
            <span className="text-foreground/40"> &middot; {appt.notes}</span>
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

        {appt.status === "PENDING" && (
          <div className="flex gap-1">
            <button
              onClick={() => onStatusUpdate(appt.id, "CONFIRMED")}
              title="Confirm appointment"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors dark:text-emerald-400"
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onStatusUpdate(appt.id, "CANCELLED")}
              title="Cancel appointment"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {appt.status === "CONFIRMED" && (
          <button
            onClick={() => onStatusUpdate(appt.id, "COMPLETED")}
            title="Mark as completed"
            className="flex h-7 items-center gap-1.5 rounded-md bg-sky-500/10 px-2.5 text-xs font-medium text-sky-600 hover:bg-sky-500/20 transition-colors dark:text-sky-400"
          >
            <TrendingUp className="h-3 w-3" />
            Done
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppointmentsView({
  upcoming,
  patients,
  onStatusUpdate,
  onRefresh,
}: AppointmentsViewProps) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  // Build a fast profile_id → display name lookup
  const patientNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of patients) {
      map.set(p.profile_id, `${p.first_name} ${p.last_name}`);
    }
    return map;
  }, [patients]);

  const counts: Record<StatusFilter, number> = {
    ALL: upcoming.length,
    PENDING: upcoming.filter((a) => a.status === "PENDING").length,
    CONFIRMED: upcoming.filter((a) => a.status === "CONFIRMED").length,
    COMPLETED: upcoming.filter((a) => a.status === "COMPLETED").length,
    CANCELLED: upcoming.filter((a) => a.status === "CANCELLED").length,
  };

  const todayCount = upcoming.filter((a) => isToday(a.scheduled_time)).length;

  const filtered =
    filter === "ALL" ? upcoming : upcoming.filter((a) => a.status === filter);

  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(a.scheduled_time).getTime() -
      new Date(b.scheduled_time).getTime(),
  );

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
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage and track your patient appointments.
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
        </div>
      </div>

      {/* ── Filter pills ─────────────────────────────────────────────────── */}
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
      </div>

      {/* ── Appointments list ────────────────────────────────────────────── */}
      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-secondary" />
            <CardTitle className="text-base font-semibold">
              {filter === "ALL"
                ? "All Appointments"
                : `${filter.charAt(0) + filter.slice(1).toLowerCase()} Appointments`}
            </CardTitle>
          </div>
          <Badge variant="outline" className="h-6 px-2.5 text-xs font-medium">
            {sorted.length} total
          </Badge>
        </CardHeader>

        {sorted.length === 0 ? (
          <CardContent className="flex flex-col items-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="mt-5 text-base font-medium text-muted-foreground">
              {filter === "ALL"
                ? "No appointments yet"
                : `No ${filter.toLowerCase()} appointments`}
            </p>
            {filter !== "ALL" && (
              <button
                onClick={() => setFilter("ALL")}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear filter
              </button>
            )}
          </CardContent>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((appt) => (
              <AppointmentRow
                key={appt.id}
                appt={appt}
                patientName={
                  patientNameMap.get(appt.patient_id) ?? "Unknown Patient"
                }
                onStatusUpdate={onStatusUpdate}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
