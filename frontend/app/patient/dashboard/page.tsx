"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/SessionProvider";
import {
  Activity,
  HeartPulse,
  FileText,
  Calendar,
  Bell,
  TrendingUp,
  LogOut,
  Loader2,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

export default function PatientDashboard() {
  const { session, status, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?role=patient");
    }
    if (
      status === "authenticated" &&
      session?.user &&
      session.user.role !== "PATIENT"
    ) {
      const role = session.user.role.toLowerCase();
      router.push(`/${role}/dashboard`);
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "PATIENT") {
    return null;
  }

  const quickStats = [
    {
      label: "Upcoming Appointments",
      value: "2",
      icon: Calendar,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Health Score",
      value: "87/100",
      icon: TrendingUp,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Reports Ready",
      value: "3",
      icon: FileText,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Notifications",
      value: "5",
      icon: Bell,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  const recentActivity = [
    {
      title: "Lab Results Available",
      description: "Complete Blood Count results are ready for review.",
      time: "2 hours ago",
      icon: ClipboardList,
    },
    {
      title: "Appointment Confirmed",
      description: "Dr. Sarah Chen — General Checkup on Dec 15, 2024.",
      time: "Yesterday",
      icon: Calendar,
    },
    {
      title: "AI Health Insight",
      description:
        "Based on your recent data, your vitamin D levels may need attention.",
      time: "2 days ago",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top nav bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition-transform group-hover:scale-105">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Med<span className="text-primary">Intel</span>
            </span>
            <span className="ml-2 hidden rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary sm:inline-block">
              Patient Portal
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {session.user.name?.charAt(0)?.toUpperCase() || "P"}
                </div>
              )}
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {session.user.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Welcome back, {session.user.name?.split(" ")[0] || "Patient"} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s an overview of your health and upcoming activities.
          </p>
        </div>

        {/* Quick stats grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-card-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent activity */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {recentActivity.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex gap-3 rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {item.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Health overview card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              Health Overview
            </h2>
            <div className="flex flex-col items-center py-4">
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-secondary/30">
                <div className="absolute inset-1 rounded-full border-4 border-secondary border-t-transparent animate-pulse" />
                <div className="text-center">
                  <HeartPulse className="mx-auto h-6 w-6 text-secondary" />
                  <p className="mt-1 text-2xl font-bold text-card-foreground">
                    87
                  </p>
                  <p className="text-xs text-muted-foreground">Health Score</p>
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Your health score is{" "}
                <span className="font-medium text-secondary">Good</span>. Keep
                up your regular checkups!
              </p>
            </div>

            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Blood Pressure</span>
                <span className="font-medium text-card-foreground">120/80</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Heart Rate</span>
                <span className="font-medium text-card-foreground">72 bpm</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">BMI</span>
                <span className="font-medium text-card-foreground">23.4</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
