"use client";

import {
  Users,
  MessageSquare,
  UserPlus,
  Search,
  Phone,
  Activity,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { MappingPatient } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientsViewProps {
  patients: MappingPatient[];
  onAddPatient: () => void;
  onChatWithPatient: (userId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400",
] as const;

function patientPalette(p: MappingPatient): string {
  const idx =
    ((p.first_name?.charCodeAt(0) ?? 0) + (p.last_name?.charCodeAt(0) ?? 0)) %
    AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

// ─── Patient Card ─────────────────────────────────────────────────────────────

function PatientCard({
  patient,
  onChat,
}: {
  patient: MappingPatient;
  onChat: () => void;
}) {
  const palette = patientPalette(patient);
  const initials = getInitials(patient.first_name, patient.last_name);

  return (
    <Card className="gap-0 py-0 transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20">
      {/* ── Header ── */}
      <CardHeader className="px-6 pb-0 pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-13 w-13 shrink-0 ring-2 ring-border">
            <AvatarFallback
              className={cn("text-base font-bold select-none", palette)}
            >
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-card-foreground leading-tight">
              {patient.first_name} {patient.last_name}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground font-mono">
              ID: {patient.profile_id.slice(0, 12)}&hellip;
            </p>
          </div>

          {/* Active indicator */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
        </div>
      </CardHeader>

      {/* ── Meta ── */}
      <CardContent className="space-y-4 px-6 py-5">
        <Separator />

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>Contact via secure message</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-3.5 w-3.5 shrink-0" />
            <span>Under your care</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className="h-6 px-2.5 text-xs font-medium text-muted-foreground"
          >
            Patient
          </Badge>
          <Badge
            variant="outline"
            className="h-6 px-2.5 text-xs font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
          >
            Active
          </Badge>
        </div>
      </CardContent>

      {/* ── Actions ── */}
      <CardFooter className="border-t border-border px-6 py-4">
        <Button onClick={onChat} className="w-full gap-2 text-sm">
          <MessageSquare className="h-4 w-4" />
          Message Patient
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PatientsView({
  patients,
  onAddPatient,
  onChatWithPatient,
}: PatientsViewProps) {
  const [search, setSearch] = useState("");

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return `${p.first_name ?? ""} ${p.last_name ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Patients
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All patients currently under your care.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          {/* Count pill */}
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground tabular-nums">
              {patients.length}
            </span>
            <Separator orientation="vertical" className="h-3.5" />
            <span className="text-sm text-muted-foreground">
              {patients.length === 1 ? "patient" : "patients"}
            </span>
          </div>

          <Button size="sm" onClick={onAddPatient} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* ── Search ── */}
      {patients.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 text-sm bg-muted/30"
          />
        </div>
      )}

      {/* ── Grid or empty state ── */}
      {patients.length === 0 ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center py-24 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="mt-5 text-base font-semibold text-muted-foreground">
              No patients yet
            </p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground/60">
              Add patients to start managing their care and communicate securely.
            </p>
            <Button onClick={onAddPatient} className="mt-6 gap-2">
              <UserPlus className="h-4 w-4" />
              Add your first patient
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center py-20 text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Search className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="mt-5 text-base font-semibold text-muted-foreground">
              No results for &ldquo;{search}&rdquo;
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground/60">
              Try a different name.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((patient) => (
            <PatientCard
              key={patient.profile_id}
              patient={patient}
              onChat={() => onChatWithPatient(patient.user_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
