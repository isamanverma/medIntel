"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/SessionProvider";
import {
  Activity,
  HeartPulse,
  FileText,
  Calendar,
  TrendingUp,
  LogOut,
  Loader2,
  Users,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import {
  getUpcomingAppointments,
  getAppointmentHistory,
  getMyDoctors,
  getMyPatientProfile,
} from "@/lib/api-client";
import type { Appointment, MappingDoctor, PatientProfile } from "@/lib/types";

export default function PatientDashboard() {
  const { session, status, logout } = useAuth();
  const router = useRouter();

  // Live data state
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<MappingDoctor[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [upcomingRes, historyRes, doctorsRes] = await Promise.allSettled([
        getUpcomingAppointments(),
        getAppointmentHistory(),
        getMyDoctors(),
      ]);
      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
      if (historyRes.status === "fulfilled") setHistory(historyRes.value);
      if (doctorsRes.status === "fulfilled") setDoctors(doctorsRes.value);

      // Profile may not exist yet
      try {
        const p = await getMyPatientProfile();
        setProfile(p);
      } catch {
        // Profile not created yet — that's fine
      }
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "PATIENT") {
      fetchData();
    }
  }, [status, session, fetchData]);

  if (status === "loading" || loading) {
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
      value: String(upcoming.length),
      icon: Calendar,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "My Doctors",
      value: String(doctors.length),
      icon: Users,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Past Visits",
      value: String(history.length),
      icon: FileText,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Adherence",
      value: profile ? "Active" : "Set Up Profile",
      icon: TrendingUp,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
  ];

  const recentAppointments = [...upcoming, ...history]
    .sort(
      (a, b) =>
        new Date(b.scheduled_time).getTime() -
        new Date(a.scheduled_time).getTime()
    )
    .slice(0, 5);

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
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {session.user.name?.charAt(0)?.toUpperCase() || "P"}
              </div>
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
            Welcome back, {session.user.name?.split(" ")[0] || "Patient"}
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
          {/* Recent appointments */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              Recent Appointments
            </h2>
            {recentAppointments.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  No appointments yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Your upcoming and past appointments will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">
                          Appointment
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(appt.scheduled_time).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${appt.status === "COMPLETED"
                          ? "bg-secondary/10 text-secondary"
                          : appt.status === "CANCELLED"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}
                    >
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile overview card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              My Profile
            </h2>
            {profile ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <HeartPulse className="h-8 w-8 text-primary" />
                  </div>
                  <p className="mt-3 text-lg font-semibold text-card-foreground">
                    {profile.first_name} {profile.last_name}
                  </p>
                </div>
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Blood Group</span>
                    <span className="font-medium text-card-foreground">
                      {profile.blood_group || "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Date of Birth</span>
                    <span className="font-medium text-card-foreground">
                      {new Date(profile.date_of_birth).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Emergency Contact</span>
                    <span className="font-medium text-card-foreground">
                      {profile.emergency_contact || "Not set"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <HeartPulse className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  Profile not set up
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Complete your profile to get personalized health insights.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
