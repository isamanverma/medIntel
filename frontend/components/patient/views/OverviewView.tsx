"use client";

import {
  Calendar,
  Stethoscope,
  Inbox,
  MessageSquare,
  Plus,
  ArrowRight,
  HeartPulse,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
} from "lucide-react";
import type {
  Appointment,
  MappingDoctor,
  PatientProfile,
  UserPublic,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewViewProps {
  user: UserPublic;
  profile: PatientProfile | null;
  upcoming: Appointment[];
  history: Appointment[];
  doctors: MappingDoctor[];
  onBookAppointment: () => void;
  onEditProfile: () => void;
  onChatWithDoctor: (doctorUserId: string) => void;
  onNavigateToAppointments: () => void;
  onNavigateToDoctors: () => void;
  onNavigateToProfile: () => void;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Appointment["status"],
  { label: string; icon: React.ElementType; badge: string; dot: string }
> = {
  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle2,
    badge: "border-primary/30 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  PENDING: {
    label: "Pending",
    icon: Timer,
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return { date, time };
}

function getRelativeDay(iso: string): string | null {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return null;
}

// ─── Avatar palette ───────────────────────────────────────────────────────────

const PALETTES = [
  "bg-indigo-500/10 text-indigo-500",
  "bg-violet-500/10 text-violet-500",
  "bg-sky-500/10 text-sky-500",
  "bg-emerald-500/10 text-emerald-600",
  "bg-amber-500/10 text-amber-600",
  "bg-rose-500/10 text-rose-500",
] as const;

function doctorPalette(d: MappingDoctor) {
  return PALETTES[
    ((d.first_name?.charCodeAt(0) ?? 0) + (d.last_name?.charCodeAt(0) ?? 0)) %
      PALETTES.length
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OverviewView({
  user,
  profile,
  upcoming,
  history,
  doctors,
  onBookAppointment,
  onEditProfile,
  onChatWithDoctor,
  onNavigateToAppointments,
  onNavigateToDoctors,
  onNavigateToProfile,
}: OverviewViewProps) {
  const firstName = user.name?.split(" ")[0] ?? "Patient";
  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "P";

  // Next confirmed/pending appointment
  const nextAppointment =
    upcoming
      .filter((a) => a.status !== "CANCELLED")
      .sort(
        (a, b) =>
          new Date(a.scheduled_time).getTime() -
          new Date(b.scheduled_time).getTime(),
      )[0] ?? null;

  // Most recent 6 appointments across upcoming + history
  const recentAppointments = [...upcoming, ...history]
    .sort(
      (a, b) =>
        new Date(b.scheduled_time).getTime() -
        new Date(a.scheduled_time).getTime(),
    )
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        {/* Greeting */}
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 ring-2 ring-primary/30 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {firstName}
            </h1>
            {nextAppointment ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Next appointment:{" "}
                <span className="font-medium text-foreground">
                  {formatDateTime(nextAppointment.scheduled_time).date}
                </span>
                {" at "}
                <span className="font-medium text-foreground">
                  {formatDateTime(nextAppointment.scheduled_time).time}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                No upcoming appointments scheduled.
              </p>
            )}
          </div>
        </div>

        {/* Single primary CTA */}
        <Button
          onClick={onBookAppointment}
          className="gap-2 shrink-0 self-start sm:self-center"
        >
          <Plus className="h-4 w-4" />
          Book Appointment
        </Button>
      </div>

      {/* ── Profile incomplete banner ─────────────────────────────────────── */}
      {!profile && (
        <Card className="border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 py-4">
          <CardContent className="flex items-start gap-4 px-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Profile incomplete
              </p>
              <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300/80">
                Complete your profile to enable appointment booking and
                personalised health insights.
              </p>
            </div>
            <Button
              size="sm"
              onClick={onEditProfile}
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 px-4"
            >
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Main two-column layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* ── Recent Appointments ── */}
        <Card className="lg:col-span-3 gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border px-6 py-5">
            <div>
              <CardTitle className="text-base font-semibold">
                Recent Appointments
              </CardTitle>
              <CardDescription className="text-sm mt-0.5">
                {recentAppointments.length > 0
                  ? `${upcoming.length} upcoming · ${history.length} past`
                  : "No appointments yet"}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToAppointments}
              className="h-8 gap-1.5 px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {recentAppointments.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center px-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Inbox className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  No appointments yet
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground/60 max-w-xs">
                  Book your first appointment with one of your linked doctors.
                </p>
                <Button
                  size="sm"
                  onClick={onBookAppointment}
                  className="mt-5 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Book now
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentAppointments.map((appt) => {
                  const cfg = STATUS_CONFIG[appt.status];
                  const StatusIcon = cfg.icon;
                  const { date, time } = formatDateTime(appt.scheduled_time);
                  const rel = getRelativeDay(appt.scheduled_time);

                  return (
                    <div
                      key={appt.id}
                      className="flex items-center gap-4 px-6 py-4"
                    >
                      {/* Status icon */}
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          cfg.badge,
                        )}
                      >
                        <StatusIcon className="h-4 w-4" />
                      </div>

                      {/* Date + time */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-card-foreground truncate">
                            {date}
                          </p>
                          {rel && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                              {rel}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="h-3 w-3 text-muted-foreground/60" />
                          <p className="text-xs text-muted-foreground">
                            {time}
                          </p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                          cfg.badge,
                        )}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)}
                        />
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── My Doctors ── */}
        <Card className="lg:col-span-2 gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border px-6 py-5">
            <div>
              <CardTitle className="text-base font-semibold">
                My Doctors
              </CardTitle>
              <CardDescription className="text-sm mt-0.5">
                {doctors.length > 0
                  ? `${doctors.length} doctor${doctors.length !== 1 ? "s" : ""} on your care team`
                  : "No doctors linked yet"}
              </CardDescription>
            </div>
            {doctors.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateToDoctors}
                className="h-8 gap-1.5 px-3 text-sm text-muted-foreground hover:text-foreground"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {doctors.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center px-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Stethoscope className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  No doctors linked yet
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground/60 max-w-xs">
                  A doctor needs to add you as a patient from their portal
                  first.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {doctors.slice(0, 6).map((d) => {
                  const palette = doctorPalette(d);
                  return (
                    <div
                      key={d.profile_id}
                      className="flex items-center gap-3 px-6 py-4"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback
                          className={cn("text-xs font-bold", palette)}
                        >
                          {d.first_name?.[0]}
                          {d.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-card-foreground">
                          Dr. {d.first_name} {d.last_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">
                          {d.specialization || "General Practice"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground/50 hover:bg-primary/10 hover:text-primary"
                        onClick={() => onChatWithDoctor(d.user_id)}
                        title={`Message Dr. ${d.first_name}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Profile nudge (when profile exists) ──────────────────────────── */}
      {profile && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <HeartPulse className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Your profile is up to date
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Keep your health information current for the best care.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToProfile}
            className="shrink-0 gap-1.5"
          >
            View Profile <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
