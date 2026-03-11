"use client";

import {
  Stethoscope,
  MessageSquare,
  Calendar,
  Phone,
  Search,
} from "lucide-react";
import { useState } from "react";
import type { MappingDoctor } from "@/lib/types";
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

interface DoctorsViewProps {
  doctors: MappingDoctor[];
  onChatWithDoctor: (doctorUserId: string) => void;
  onBookWithDoctor: (doctorProfileId: string) => void;
}

const AVATAR_PALETTES = [
  "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400",
  "bg-violet-500/10 text-violet-500 dark:text-violet-400",
  "bg-sky-500/10 text-sky-500 dark:text-sky-400",
  "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "bg-rose-500/10 text-rose-500 dark:text-rose-400",
] as const;

function DoctorCard({
  doctor,
  onChat,
  onBook,
}: {
  doctor: MappingDoctor;
  onChat: () => void;
  onBook: () => void;
}) {
  const initials =
    `${doctor.first_name?.[0] ?? ""}${doctor.last_name?.[0] ?? ""}`.toUpperCase();

  const paletteIndex =
    ((doctor.first_name?.charCodeAt(0) ?? 0) +
      (doctor.last_name?.charCodeAt(0) ?? 0)) %
    AVATAR_PALETTES.length;
  const avatarClass = AVATAR_PALETTES[paletteIndex];

  return (
    <Card className="gap-0 py-0 transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20">
      {/* ── Header ── */}
      <CardHeader className="px-6 pb-0 pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-13 w-13 shrink-0 ring-2 ring-border">
            <AvatarFallback
              className={cn("text-base font-bold select-none", avatarClass)}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-card-foreground leading-tight">
              Dr. {doctor.first_name} {doctor.last_name}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="truncate text-sm text-muted-foreground">
                {doctor.specialization || "General Practice"}
              </p>
            </div>
          </div>
          {/* Online indicator */}
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
            <span>Available via secure message</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Accepting appointments</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className="h-6 px-2.5 text-xs font-medium text-muted-foreground"
          >
            {doctor.specialization || "General"}
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
      <CardFooter className="gap-2.5 border-t border-border px-6 py-4">
        <Button
          variant="outline"
          onClick={onChat}
          className="flex-1 gap-2 text-sm"
        >
          <MessageSquare className="h-4 w-4" />
          Message
        </Button>
        <Button onClick={onBook} className="flex-1 gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          Book
        </Button>
      </CardFooter>
    </Card>
  );
}

export function DoctorsView({
  doctors,
  onChatWithDoctor,
  onBookWithDoctor,
}: DoctorsViewProps) {
  const [search, setSearch] = useState("");

  const filtered = doctors.filter((d) => {
    const q = search.toLowerCase();
    return (
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
      (d.specialization ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Doctors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your care team — message or book a visit directly.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-fit rounded-lg border border-border bg-card px-4 py-2.5 self-start">
          <Stethoscope className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-bold text-foreground tabular-nums">
            {doctors.length}
          </span>
          <Separator orientation="vertical" className="h-3.5" />
          <span className="text-sm text-muted-foreground">
            {doctors.length === 1 ? "doctor" : "doctors"} linked
          </span>
        </div>
      </div>

      {/* ── Search ── */}
      {doctors.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or specialization…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 text-sm bg-muted/30"
          />
        </div>
      )}

      {/* ── Grid or empty state ── */}
      {doctors.length === 0 ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center py-24 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Stethoscope className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="mt-5 text-base font-semibold text-muted-foreground">
              No doctors linked yet
            </p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground/60">
              A doctor must add you as a patient from their portal before they
              appear here.
            </p>
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
              Try a different name or specialization.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doctor) => (
            <DoctorCard
              key={doctor.profile_id}
              doctor={doctor}
              onChat={() => onChatWithDoctor(doctor.user_id)}
              onBook={() => onBookWithDoctor(doctor.profile_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
