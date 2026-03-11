"use client";

import {
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Inbox,
  UserPlus,
  MessageSquare,
  Stethoscope,
  ArrowRightLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type {
  Appointment,
  MappingPatient,
  DoctorProfile,
  Referral,
  UserPublic,
} from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewViewProps {
  user: UserPublic;
  profile: DoctorProfile | null;
  upcoming: Appointment[];
  patients: MappingPatient[];
  receivedReferrals: Referral[];
  onAddPatient: () => void;
  onCompleteProfile: () => void;
  onChatWithPatient: (userId: string) => void;
  onNavigateToAppointments: () => void;
  onNavigateToPatients: () => void;
  onNavigateToReferrals: () => void;
  onStatusUpdate: (id: string, status: string) => Promise<void>;
}

// ─── Config & helpers ─────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  CONFIRMED: {
    label: "Confirmed",
    strip: "bg-emerald-500",
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  PENDING: {
    label: "Pending",
    strip: "bg-amber-400",
    badge:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  COMPLETED: {
    label: "Completed",
    strip: "bg-sky-400",
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-400",
  },
  CANCELLED: {
    label: "Cancelled",
    strip: "bg-muted-foreground/30",
    badge: "bg-muted/60 text-muted-foreground border-border",
    dot: "bg-muted-foreground/40",
  },
} as const;

const AVATAR_PALETTES = [
  "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400",
] as const;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function patientPalette(p: MappingPatient) {
  const idx =
    ((p.first_name?.charCodeAt(0) ?? 0) + (p.last_name?.charCodeAt(0) ?? 0)) %
    AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}

// ─── AppointmentRow ───────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  onStatusUpdate,
}: {
  appt: Appointment;
  onStatusUpdate: (id: string, status: string) => Promise<void>;
}) {
  const cfg =
    STATUS_CONFIG[appt.status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.PENDING;
  const todayFlag = isToday(appt.scheduled_time);

  return (
    <div className="group relative flex items-center gap-0 hover:bg-muted/30 transition-colors duration-150">
      {/* Status strip */}
      <div
        className={cn("w-0.5 self-stretch shrink-0 rounded-r-full", cfg.strip)}
      />

      <div className="flex flex-1 items-center gap-4 px-5 py-3.5 min-w-0">
        {/* Time column */}
        <div className="w-16 shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-foreground leading-tight">
            {formatTime(appt.scheduled_time)}
          </p>
          {!todayFlag && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
              {formatDateShort(appt.scheduled_time)}
            </p>
          )}
        </div>

        {/* Connector dot */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className={cn(
              "h-2 w-2 rounded-full ring-2 ring-background",
              cfg.dot,
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              Patient Appointment
            </p>
            {todayFlag && (
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary bg-primary/8 px-1.5 py-0.5 rounded">
                Today
              </span>
            )}
          </div>
          {appt.notes ? (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {appt.notes}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground/50">No notes</p>
          )}
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          <Badge
            variant="outline"
            className={cn("h-5 text-[11px] font-medium px-1.5", cfg.badge)}
          >
            {cfg.label}
          </Badge>

          {appt.status === "PENDING" && (
            <div className="flex gap-1 ml-1">
              <button
                onClick={() => onStatusUpdate(appt.id, "CONFIRMED")}
                title="Confirm"
                className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/25 transition-colors dark:text-emerald-400"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onStatusUpdate(appt.id, "CANCELLED")}
                title="Decline"
                className="flex h-6 w-6 items-center justify-center rounded bg-destructive/10 text-destructive hover:bg-destructive/25 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {appt.status === "CONFIRMED" && (
            <button
              onClick={() => onStatusUpdate(appt.id, "COMPLETED")}
              className="ml-1 flex h-6 items-center gap-1 rounded bg-sky-500/10 px-2 text-[11px] font-medium text-sky-600 hover:bg-sky-500/20 transition-colors dark:text-sky-400"
            >
              Mark done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OverviewView({
  user,
  profile,
  upcoming,
  patients,
  receivedReferrals,
  onAddPatient,
  onCompleteProfile,
  onChatWithPatient,
  onNavigateToAppointments,
  onNavigateToPatients,
  onNavigateToReferrals,
  onStatusUpdate,
}: OverviewViewProps) {
  const lastName = user.name?.split(" ").pop() ?? "Doctor";

  const pendingReferrals = receivedReferrals.filter(
    (r) => r.status === "PENDING",
  );

  const sortedUpcoming = [...upcoming]
    .sort(
      (a, b) =>
        new Date(a.scheduled_time).getTime() -
        new Date(b.scheduled_time).getTime(),
    )
    .slice(0, 6);

  const recentPatients = patients.slice(0, 6);

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">
            {todayStr}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {getGreeting()}, Dr.&nbsp;{lastName}
          </h1>
          {profile && (
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.specialization}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 sm:mt-1">
          {!profile && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCompleteProfile}
              className="gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-400"
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Complete Profile
            </Button>
          )}
          <Button size="sm" onClick={onAddPatient} className="gap-2">
            <UserPlus className="h-3.5 w-3.5" />
            Add Patient
          </Button>
        </div>
      </motion.div>

      {/* ── Profile incomplete banner ─────────────────────────────────────── */}
      {!profile && (
        <motion.div
          custom={0.07}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-50/60 px-4 py-3 dark:bg-amber-500/8"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/15">
            <Stethoscope className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Profile incomplete
            </p>
            <p className="text-xs text-amber-700/70 dark:text-amber-300/60">
              Complete your profile to manage patients and appear in discovery.
            </p>
          </div>
          <Button
            size="sm"
            onClick={onCompleteProfile}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
          >
            Set up now
          </Button>
        </motion.div>
      )}

      {/* ── Pending referrals callout (only when actionable) ─────────────── */}
      {pendingReferrals.length > 0 && (
        <motion.button
          custom={!profile ? 0.14 : 0.07}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          onClick={onNavigateToReferrals}
          className="group w-full flex items-center gap-3 rounded-lg border border-violet-500/25 bg-violet-50/50 px-4 py-3 text-left hover:bg-violet-50 dark:bg-violet-500/8 dark:hover:bg-violet-500/12 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-500/15">
            <ArrowRightLeft className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
              {pendingReferrals.length} pending referral
              {pendingReferrals.length > 1 ? "s" : ""} awaiting your response
            </p>
            <p className="text-xs text-violet-700/60 dark:text-violet-300/50">
              Click to review and accept or decline
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-violet-500/50 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </motion.button>
      )}

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Schedule column (2/3) ──────────────────────────────────── */}
        <motion.div
          custom={0.18}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2"
        >
          <Card className="gap-0 py-0 overflow-hidden">
            {/* Card header */}
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Upcoming Schedule
                </span>
                {upcoming.length > 0 && (
                  <span className="text-[11px] font-mono text-muted-foreground/70 ml-1">
                    {upcoming.length} total
                  </span>
                )}
              </div>
              {upcoming.length > 6 && (
                <button
                  onClick={onNavigateToAppointments}
                  className="flex items-center gap-1 text-xs text-primary hover:underline underline-offset-2"
                >
                  View all
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </CardHeader>

            {sortedUpcoming.length === 0 ? (
              <CardContent className="flex flex-col items-center py-16 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Inbox className="h-4.5 w-4.5 text-muted-foreground/40" />
                </div>
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  No upcoming appointments
                </p>
                <p className="mt-1 text-xs text-muted-foreground/50">
                  Your schedule is clear.
                </p>
              </CardContent>
            ) : (
              <div className="divide-y divide-border/60">
                {sortedUpcoming.map((appt) => (
                  <AppointmentRow
                    key={appt.id}
                    appt={appt}
                    onStatusUpdate={onStatusUpdate}
                  />
                ))}
              </div>
            )}

            {/* Footer — summary counts */}
            {upcoming.length > 0 && (
              <div className="flex items-center gap-6 border-t border-border/60 px-5 py-3 bg-muted/20">
                {[
                  {
                    label: "Today",
                    value: upcoming.filter((a) => isToday(a.scheduled_time))
                      .length,
                    dot: "bg-primary",
                  },
                  {
                    label: "Confirmed",
                    value: upcoming.filter((a) => a.status === "CONFIRMED")
                      .length,
                    dot: "bg-emerald-500",
                  },
                  {
                    label: "Pending",
                    value: upcoming.filter((a) => a.status === "PENDING")
                      .length,
                    dot: "bg-amber-400",
                  },
                ].map(({ label, value, dot }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
                    <span className="text-xs text-muted-foreground">
                      <span className="font-semibold tabular-nums text-foreground">
                        {value}
                      </span>{" "}
                      {label}
                    </span>
                  </div>
                ))}
                <button
                  onClick={onNavigateToAppointments}
                  className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline underline-offset-2"
                >
                  <Clock className="h-3 w-3" />
                  Manage
                </button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* ── Patients column (1/3) ──────────────────────────────────── */}
        <motion.div
          custom={0.25}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <Card className="gap-0 py-0 overflow-hidden h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-3.5 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  My Patients
                </span>
                {patients.length > 0 && (
                  <span className="text-[11px] font-mono text-muted-foreground/70 ml-1">
                    {patients.length}
                  </span>
                )}
              </div>
              <button
                onClick={onAddPatient}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Add patient"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>
            </CardHeader>

            {recentPatients.length === 0 ? (
              <CardContent className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                  <Users className="h-4.5 w-4.5 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  No patients yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground/50 max-w-40">
                  Add patients to start managing their care.
                </p>
                <Button
                  size="sm"
                  onClick={onAddPatient}
                  className="mt-4 gap-1.5 h-8 text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add first patient
                </Button>
              </CardContent>
            ) : (
              <>
                <div className="flex-1 divide-y divide-border/60">
                  {recentPatients.map((p) => {
                    const palette = patientPalette(p);
                    const initials = getInitials(p.first_name, p.last_name);
                    return (
                      <div
                        key={p.profile_id}
                        className="group flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback
                            className={cn("text-xs font-bold", palette)}
                          >
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground/60 font-mono truncate">
                            {p.profile_id.slice(0, 8)}…
                          </p>
                        </div>

                        <button
                          onClick={() => onChatWithPatient(p.user_id)}
                          title={`Message ${p.first_name}`}
                          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {patients.length > 6 && (
                  <div className="border-t border-border/60 px-5 py-3 bg-muted/20 shrink-0">
                    <button
                      onClick={onNavigateToPatients}
                      className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View all {patients.length} patients
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
