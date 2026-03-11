"use client";

import {
  ArrowRightLeft,
  Send,
  Inbox,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Referral } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReferralsViewProps {
  sentReferrals: Referral[];
  receivedReferrals: Referral[];
  onCreateReferral: () => void;
  onReferralAction: (id: string, action: "ACCEPTED" | "DECLINED") => Promise<void>;
}

type ReferralTab = "received" | "sent";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    badge:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
  ACCEPTED: {
    label: "Accepted",
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  DECLINED: {
    label: "Declined",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Referral Card ────────────────────────────────────────────────────────────

function ReferralCard({
  referral,
  direction,
  onAccept,
  onDecline,
}: {
  referral: Referral;
  direction: "sent" | "received";
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  const cfg =
    STATUS_CONFIG[referral.status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.PENDING;

  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all">
      {/* Direction icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          direction === "sent"
            ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
            : "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        )}
      >
        {direction === "sent" ? (
          <ArrowUpRight className="h-5 w-5" />
        ) : (
          <ArrowDownLeft className="h-5 w-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug">
              {referral.reason}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Patient ID:{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                {referral.patient_id.slice(0, 12)}&hellip;
              </code>
            </p>
            {direction === "sent" && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Referred to:{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                  {referral.referred_doctor_id.slice(0, 12)}&hellip;
                </code>
              </p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground/60">
              {formatDate(referral.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn("text-xs font-medium", cfg.badge)}
            >
              <span
                className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", cfg.dot)}
              />
              {cfg.label}
            </Badge>

            {direction === "received" && referral.status === "PENDING" && (
              <div className="flex gap-1">
                <button
                  onClick={onAccept}
                  title="Accept referral"
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors dark:text-emerald-400"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={onDecline}
                  title="Decline referral"
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReferralsView({
  sentReferrals,
  receivedReferrals,
  onCreateReferral,
  onReferralAction,
}: ReferralsViewProps) {
  const [tab, setTab] = useState<ReferralTab>("received");

  const pendingReceived = receivedReferrals.filter(
    (r) => r.status === "PENDING",
  ).length;

  const active = tab === "received" ? receivedReferrals : sentReferrals;

  const stats = [
    {
      label: "Received",
      value: receivedReferrals.length,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      label: "Pending review",
      value: pendingReceived,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Sent",
      value: sentReferrals.length,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      label: "Accepted",
      value: [...sentReferrals, ...receivedReferrals].filter(
        (r) => r.status === "ACCEPTED",
      ).length,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Referrals
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage patient referrals you&apos;ve sent and received.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          {pendingReceived > 0 && (
            <Badge
              variant="outline"
              className="h-8 gap-2 px-3 text-xs font-semibold border-amber-500/30 text-amber-600 bg-amber-500/5 dark:text-amber-400"
            >
              <Clock className="h-3.5 w-3.5" />
              {pendingReceived} pending
            </Badge>
          )}
          <Button size="sm" onClick={onCreateReferral} className="gap-2">
            <Send className="h-4 w-4" />
            Refer Patient
          </Button>
        </div>
      </div>

      {/* ── Stat chips ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, color, bg }) => (
          <Card key={label} className="gap-0 py-0">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <p className={cn("mt-2 text-2xl font-bold tabular-nums", color)}>
                {value}
              </p>
              <div className={cn("mt-2 h-1 w-8 rounded-full opacity-60", bg)} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs + list ─────────────────────────────────────────────────── */}
      <Card className="gap-0 py-0">
        {/* Tab bar */}
        <CardHeader className="p-0 border-b border-border">
          <div className="flex">
            <button
              onClick={() => setTab("received")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2",
                tab === "received"
                  ? "border-secondary text-secondary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Received
              <Badge
                variant={tab === "received" ? "default" : "outline"}
                className={cn(
                  "h-5 min-w-5 px-1.5 text-[10px] font-bold",
                  tab === "received"
                    ? "bg-secondary text-secondary-foreground"
                    : "",
                )}
              >
                {receivedReferrals.length}
              </Badge>
              {pendingReceived > 0 && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </button>

            <Separator orientation="vertical" className="h-auto" />

            <button
              onClick={() => setTab("sent")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2",
                tab === "sent"
                  ? "border-secondary text-secondary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowUpRight className="h-4 w-4" />
              Sent
              <Badge
                variant={tab === "sent" ? "default" : "outline"}
                className={cn(
                  "h-5 min-w-5 px-1.5 text-[10px] font-bold",
                  tab === "sent"
                    ? "bg-secondary text-secondary-foreground"
                    : "",
                )}
              >
                {sentReferrals.length}
              </Badge>
            </button>
          </div>
        </CardHeader>

        {/* List */}
        <CardContent className="p-5">
          {active.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                {tab === "received" ? (
                  <Inbox className="h-6 w-6 text-muted-foreground/40" />
                ) : (
                  <ArrowRightLeft className="h-6 w-6 text-muted-foreground/40" />
                )}
              </div>
              <p className="mt-4 text-base font-medium text-muted-foreground">
                No {tab} referrals yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                {tab === "sent"
                  ? "Refer a patient to another specialist."
                  : "Referrals from other doctors will appear here."}
              </p>
              {tab === "sent" && (
                <Button
                  size="sm"
                  onClick={onCreateReferral}
                  className="mt-5 gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send a referral
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((ref) => (
                <ReferralCard
                  key={ref.id}
                  referral={ref}
                  direction={tab}
                  onAccept={
                    tab === "received"
                      ? () => onReferralAction(ref.id, "ACCEPTED")
                      : undefined
                  }
                  onDecline={
                    tab === "received"
                      ? () => onReferralAction(ref.id, "DECLINED")
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
