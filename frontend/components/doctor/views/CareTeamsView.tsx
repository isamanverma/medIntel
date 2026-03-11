"use client";

import {
  UsersRound,
  Plus,
  Users,
  Inbox,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CareTeam } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CareTeamsViewProps {
  careTeams: CareTeam[];
  onCreateTeam: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEAM_PALETTES = [
  {
    icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20",
    dot: "bg-violet-500",
  },
  {
    icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20",
    dot: "bg-sky-500",
  },
  {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
  },
  {
    icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20",
    dot: "bg-rose-500",
  },
  {
    icon: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20",
    dot: "bg-indigo-500",
  },
] as const;

function teamPalette(idx: number) {
  return TEAM_PALETTES[idx % TEAM_PALETTES.length];
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function CareTeamCard({
  team,
  index,
}: {
  team: CareTeam;
  index: number;
}) {
  const palette = teamPalette(index);
  const memberCount = team.members?.length ?? 0;

  return (
    <Card
      className={cn(
        "gap-0 py-0 transition-all hover:shadow-lg hover:ring-2 hover:ring-border",
      )}
    >
      <CardContent className="p-6 space-y-4">
        {/* ── Top row ── */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              palette.icon,
            )}
          >
            <UsersRound className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-card-foreground leading-tight truncate">
              {team.name}
            </p>
            {team.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {team.description}
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* ── Meta row ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hash className="h-3.5 w-3.5 shrink-0" />
            <span>Patient:</span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              {team.patient_id.slice(0, 10)}&hellip;
            </code>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "h-6 gap-1.5 px-2.5 text-xs font-medium",
              palette.border,
              palette.icon,
            )}
          >
            <Users className="h-3 w-3" />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CareTeamsView({ careTeams, onCreateTeam }: CareTeamsViewProps) {
  const totalMembers = careTeams.reduce(
    (sum, t) => sum + (t.members?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Care Teams
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Collaborate with other doctors through multi-provider care teams.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          {/* Summary pill */}
          {careTeams.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5">
              <UsersRound className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground tabular-nums">
                {careTeams.length}
              </span>
              <Separator orientation="vertical" className="h-3.5" />
              <span className="text-sm text-muted-foreground">
                {careTeams.length === 1 ? "team" : "teams"}
              </span>
            </div>
          )}

          <Button size="sm" onClick={onCreateTeam} className="gap-2">
            <Plus className="h-4 w-4" />
            New Team
          </Button>
        </div>
      </div>

      {/* ── Quick stats ─────────────────────────────────────────────────── */}
      {careTeams.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            {
              label: "Total Teams",
              value: careTeams.length,
              color: "text-violet-600 dark:text-violet-400",
              bg: "bg-violet-500/10",
            },
            {
              label: "Total Members",
              value: totalMembers,
              color: "text-sky-600 dark:text-sky-400",
              bg: "bg-sky-500/10",
            },
            {
              label: "Avg. Members",
              value:
                careTeams.length > 0
                  ? Math.round(totalMembers / careTeams.length)
                  : 0,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-500/10",
            },
          ].map(({ label, value, color, bg }) => (
            <Card key={label} className="gap-0 py-0">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                <p
                  className={cn(
                    "mt-2 text-2xl font-bold tabular-nums",
                    color,
                  )}
                >
                  {value}
                </p>
                <div
                  className={cn("mt-2 h-1 w-8 rounded-full opacity-60", bg)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Team grid or empty state ─────────────────────────────────────── */}
      {careTeams.length === 0 ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center py-24 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <UsersRound className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="mt-5 text-base font-semibold text-muted-foreground">
              No care teams yet
            </p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground/60">
              Create a care team to collaborate with other doctors on a
              patient&apos;s care plan.
            </p>
            <Button onClick={onCreateTeam} className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              Create your first team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {careTeams.map((team, i) => (
            <CareTeamCard key={team.id} team={team} index={i} />
          ))}
        </div>
      )}

      {/* ── Info banner ─────────────────────────────────────────────────── */}
      {careTeams.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
            <Inbox className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Collaborative care
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Care teams allow multiple doctors to coordinate on a
              patient&apos;s treatment. Members can be added from within each
              team.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
