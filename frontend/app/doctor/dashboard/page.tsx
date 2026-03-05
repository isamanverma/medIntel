"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/SessionProvider";
import {
  Activity,
  LogOut,
  Stethoscope,
  Users,
  FileText,
  Calendar,
  Clock,
  Loader2,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import {
  getUpcomingAppointments,
  getMyPatients,
} from "@/lib/api-client";
import type { Appointment, MappingPatient } from "@/lib/types";

export default function DoctorDashboard() {
  const { session, status, logout } = useAuth();
  const router = useRouter();

  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<MappingPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [upcomingRes, patientsRes] = await Promise.allSettled([
        getUpcomingAppointments(),
        getMyPatients(),
      ]);
      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
      if (patientsRes.status === "fulfilled") setPatients(patientsRes.value);
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "DOCTOR") {
      fetchData();
    }
  }, [status, session, fetchData]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
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
      label: "My Patients",
      value: String(patients.length),
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Upcoming Appointments",
      value: String(upcoming.length),
      icon: Calendar,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Today's Appointments",
      value: String(
        upcoming.filter((a) => {
          const d = new Date(a.scheduled_time);
          const now = new Date();
          return (
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        }).length
      ),
      icon: Clock,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Confirmed",
      value: String(
        upcoming.filter((a) => a.status === "CONFIRMED").length
      ),
      icon: FileText,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
  ];

  // Sort upcoming by time
  const sortedUpcoming = [...upcoming].sort(
    (a, b) =>
      new Date(a.scheduled_time).getTime() -
      new Date(b.scheduled_time).getTime()
  );

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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary font-semibold text-sm">
              {session.user.name?.charAt(0)?.toUpperCase() || "D"}
            </div>
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
              </div>
            );
          })}
        </div>

        {/* Schedule */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-secondary" />
                <h2 className="text-lg font-semibold text-card-foreground">
                  Upcoming Schedule
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

          {sortedUpcoming.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                No upcoming appointments
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Your scheduled appointments will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedUpcoming.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary font-semibold text-sm">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        Patient Appointment
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {appt.notes || "General consultation"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {new Date(appt.scheduled_time).toLocaleTimeString(
                        "en-US",
                        { hour: "numeric", minute: "2-digit" }
                      )}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${appt.status === "COMPLETED"
                          ? "bg-secondary/10 text-secondary"
                          : appt.status === "CONFIRMED"
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                    >
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
