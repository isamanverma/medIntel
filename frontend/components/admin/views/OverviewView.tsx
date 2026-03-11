"use client";

import {
  Shield,
  Users,
  Stethoscope,
  Calendar,
  FileText,
  BarChart3,
  Copy,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/badge";
import type { AdminStats } from "@/lib/types";
import type { UserPublic } from "@/lib/types";

interface OverviewViewProps {
  stats: AdminStats | null;
  user: UserPublic;
}

function StatRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Icon className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

export function OverviewView({ stats, user }: OverviewViewProps) {
  const { toast } = useToast();

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast("Copied to clipboard", "success");
  };

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Platform Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live system statistics and admin account details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Stats panel ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Users */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Users
              </span>
              {stats && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {stats.total_users.toLocaleString()} total
                </Badge>
              )}
            </div>
            <div className="px-5 divide-y divide-border">
              <StatRow
                label="Patients"
                value={stats?.total_patients ?? 0}
                icon={Users}
              />
              <StatRow
                label="Doctors"
                value={stats?.total_doctors ?? 0}
                icon={Stethoscope}
              />
              <StatRow
                label="Administrators"
                value={stats?.total_admins ?? 0}
                icon={Shield}
              />
            </div>
          </div>

          {/* Activity */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Activity
              </span>
            </div>
            <div className="px-5 divide-y divide-border">
              <StatRow
                label="Appointments"
                value={stats?.total_appointments ?? 0}
                icon={Calendar}
              />
              <StatRow
                label="Medical Reports"
                value={stats?.total_reports ?? 0}
                icon={FileText}
              />
              <StatRow
                label="Treatment Plans"
                value={stats?.total_treatment_plans ?? 0}
                icon={BarChart3}
              />
            </div>
          </div>
        </div>

        {/* ── Admin profile ────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-card h-fit">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Shield className="size-4 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Admin Account
            </span>
          </div>

          <div className="px-5 py-5 flex flex-col items-center text-center gap-3 border-b border-border">
            <div className="flex size-14 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-xl select-none">
              {user.name?.charAt(0).toUpperCase() ?? "A"}
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user.email}
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold tracking-widest uppercase border-accent/30 text-accent bg-accent/5 gap-1"
            >
              <Shield className="size-2.5" />
              Administrator
            </Badge>
          </div>

          <div className="px-5 py-4 space-y-3">
            {[
              { label: "User ID", value: user.id },
              { label: "Member Since", value: memberSince },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-1">
                  {label}
                </p>
                <div className="flex items-center gap-1.5">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-[11px] text-foreground font-mono">
                    {value}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(value)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Copy"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
