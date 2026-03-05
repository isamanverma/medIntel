"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/SessionProvider";
import {
  Activity,
  LogOut,
  Stethoscope,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function DoctorDashboard() {
  const { session, status, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?role=doctor");
    }
    if (status === "authenticated" && session?.user?.role !== "DOCTOR") {
      const role = session?.user?.role;
      if (role === "PATIENT") router.push("/patient/dashboard");
      else if (role === "ADMIN") router.push("/admin/dashboard");
      else router.push("/");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-8 w-8 animate-spin text-secondary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "DOCTOR") {
    return null;
  }

  const stats = [
    {
      label: "Total Patients",
      value: "248",
      change: "+12 this month",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Appointments Today",
      value: "8",
      change: "3 remaining",
      icon: Calendar,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Reports Pending",
      value: "5",
      change: "2 urgent",
      icon: FileText,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Patient Recovery",
      value: "94%",
      change: "+2.3% vs last month",
      icon: TrendingUp,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
  ];

  const recentPatients = [
    {
      name: "Sarah Johnson",
      condition: "Post-Op Follow-up",
      time: "9:00 AM",
      status: "Completed",
    },
    {
      name: "Michael Chen",
      condition: "Diabetes Review",
      time: "10:30 AM",
      status: "Completed",
    },
    {
      name: "Emily Rodriguez",
      condition: "Cardiac Assessment",
      time: "1:00 PM",
      status: "Upcoming",
    },
    {
      name: "David Kim",
      condition: "Annual Physical",
      time: "2:30 PM",
      status: "Upcoming",
    },
    {
      name: "Lisa Thompson",
      condition: "Lab Results Review",
      time: "4:00 PM",
      status: "Upcoming",
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-white">
                <Stethoscope className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Med<span className="text-secondary">Intel</span>
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary">
              Doctor Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground">
                {session.user.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {session.user.email}
              </p>
            </div>
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-9 w-9 rounded-full border-2 border-secondary/20"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary font-semibold text-sm">
                {session.user.name?.charAt(0)?.toUpperCase() || "D"}
              </div>
            )}
            <button
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 18
                ? "afternoon"
                : "evening"}
            , Dr. {session.user.name?.split(" ").pop() || "Doctor"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s an overview of your practice today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
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
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.change}
                </p>
              </div>
            );
          })}
        </div>

        {/* Today's Schedule */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-secondary" />
                <h2 className="text-lg font-semibold text-card-foreground">
                  Today&apos;s Schedule
                </h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {recentPatients.map((patient, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary font-semibold text-sm">
                    {patient.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">
                      {patient.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {patient.condition}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {patient.time}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      patient.status === "Completed"
                        ? "bg-secondary/10 text-secondary"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {patient.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder info */}
        <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-3 text-lg font-semibold text-foreground">
            Doctor Dashboard
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            This is a placeholder dashboard. Clinical features like patient
            management, AI diagnostics, and report generation will be built in
            upcoming stages.
          </p>
        </div>
      </main>
    </div>
  );
}
