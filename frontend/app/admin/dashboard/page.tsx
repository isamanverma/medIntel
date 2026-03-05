"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/SessionProvider";
import {
  Activity,
  LogOut,
  Shield,
  Users,
  Calendar,
  FileText,
  Settings,
  BarChart3,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { getAdminStats } from "@/lib/api-client";
import type { AdminStats } from "@/lib/types";

export default function AdminDashboard() {
  const { session, status, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch {
      // Admin stats fetch failed — will show zeroes
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?role=admin");
    }
    if (
      status === "authenticated" &&
      session?.user &&
      session.user.role !== "ADMIN"
    ) {
      const role = session.user.role.toLowerCase();
      router.push(`/${role}/dashboard`);
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchData();
    }
  }, [status, session, fetchData]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }

  const user = session.user;

  const statCards = [
    {
      label: "Total Users",
      value: stats ? stats.total_users.toLocaleString() : "0",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Patients",
      value: stats ? stats.total_patients.toLocaleString() : "0",
      icon: Users,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Doctors",
      value: stats ? stats.total_doctors.toLocaleString() : "0",
      icon: Users,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Appointments",
      value: stats ? stats.total_appointments.toLocaleString() : "0",
      icon: Calendar,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  const secondaryStats = [
    {
      label: "Medical Reports",
      value: stats ? stats.total_reports.toLocaleString() : "0",
      icon: FileText,
    },
    {
      label: "Treatment Plans",
      value: stats ? stats.total_treatment_plans.toLocaleString() : "0",
      icon: BarChart3,
    },
    {
      label: "Admin Users",
      value: stats ? stats.total_admins.toLocaleString() : "0",
      icon: Shield,
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Med<span className="text-primary">Intel</span>
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              <Shield className="mr-1 h-3 w-3" />
              Admin
            </span>
          </div>
          <button
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-accent/5 via-card to-card p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-accent/10">
              <Shield className="h-7 w-7 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-card-foreground sm:text-3xl">
                Welcome back, {user.name || "Admin"}
              </h1>
              <p className="mt-1 text-muted-foreground">
                System administration dashboard &mdash; live platform
                statistics.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  {user.email}
                </span>
                <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent capitalize">
                  {user.role.toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-card-foreground">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Secondary Stats + Quick Actions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Additional Stats */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              Platform Overview
            </h2>
            <div className="space-y-4">
              {secondaryStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-card-foreground">
                        {stat.label}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-card-foreground">
                      {stat.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  label: "Manage Users",
                  desc: "View, edit, or remove user accounts",
                  icon: Users,
                },
                {
                  label: "System Settings",
                  desc: "Configure platform settings",
                  icon: Settings,
                },
                {
                  label: "View Analytics",
                  desc: "Platform usage and performance reports",
                  icon: BarChart3,
                },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    className="flex items-start gap-3 rounded-lg border border-border p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">
                        {action.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {action.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
