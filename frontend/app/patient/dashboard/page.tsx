"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
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
  Plus,
} from "lucide-react";
import Link from "next/link";
import {
  getUpcomingAppointments,
  getAppointmentHistory,
  getMyDoctors,
  getMyPatientProfile,
  createPatientProfile,
  createAppointment,
} from "@/lib/api-client";
import type { Appointment, MappingDoctor, PatientProfile } from "@/lib/types";

export default function PatientDashboard() {
  const { session, status, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<MappingDoctor[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    blood_group: "O+",
    emergency_contact: "",
  });

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    doctor_id: "",
    scheduled_time: "",
    meeting_notes: "",
  });

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

      try {
        const p = await getMyPatientProfile();
        setProfile(p);
      } catch {
        // Profile not created yet
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?role=patient");
    if (status === "authenticated" && session?.user?.role !== "PATIENT") {
      router.push(`/${session?.user?.role.toLowerCase()}/dashboard`);
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "PATIENT") fetchData();
  }, [status, session, fetchData]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const p = await createPatientProfile(profileForm);
      setProfile(p);
      setShowProfileForm(false);
      toast("Profile created successfully!", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create profile";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast("Please complete your profile first", "error");
      return;
    }
    setSubmitting(true);
    try {
      await createAppointment({
        patient_id: profile.id,
        doctor_id: bookingForm.doctor_id,
        scheduled_time: new Date(bookingForm.scheduled_time).toISOString(),
        meeting_notes: bookingForm.meeting_notes || undefined,
      });
      setShowBookingForm(false);
      setBookingForm({ doctor_id: "", scheduled_time: "", meeting_notes: "" });
      toast("Appointment booked successfully!", "success");
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to book appointment";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "PATIENT") return null;

  const quickStats = [
    { label: "Upcoming", value: String(upcoming.length), icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
    { label: "My Doctors", value: String(doctors.length), icon: Users, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "Past Visits", value: String(history.length), icon: FileText, color: "text-accent", bg: "bg-accent/10" },
    { label: "Profile", value: profile ? "Complete" : "Incomplete", icon: TrendingUp, color: "text-secondary", bg: "bg-secondary/10" },
  ];

  const recentAppointments = [...upcoming, ...history]
    .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
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
                <p className="font-medium text-foreground">{session.user.name}</p>
                <p className="text-xs text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
            <button onClick={async () => { await logout(); router.push("/"); }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome + Actions */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Welcome back, {session.user.name?.split(" ")[0] || "Patient"}
            </h1>
            <p className="mt-1 text-muted-foreground">Here&apos;s an overview of your health and upcoming activities.</p>
          </div>
          <div className="flex gap-2">
            {!profile && (
              <button onClick={() => setShowProfileForm(true)}
                className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors">
                <HeartPulse className="h-4 w-4" /> Complete Profile
              </button>
            )}
            <button onClick={() => setShowBookingForm(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Book Appointment
            </button>
          </div>
        </div>

        {/* Profile onboarding banner */}
        {!profile && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-center gap-3">
            <HeartPulse className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Profile Incomplete</p>
              <p className="text-xs text-amber-700 dark:text-amber-300/70">Complete your profile to book appointments and receive personalized health insights.</p>
            </div>
            <button onClick={() => setShowProfileForm(true)}
              className="ml-auto rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors whitespace-nowrap">
              Set Up Now
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-card-foreground">{stat.value}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Appointments */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-card-foreground">Recent Appointments</h2>
              <button onClick={() => setShowBookingForm(true)}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Book New
              </button>
            </div>
            {recentAppointments.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">No appointments yet</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Book your first appointment to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAppointments.map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/60">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">Appointment</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(appt.scheduled_time).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${appt.status === "COMPLETED" ? "bg-secondary/10 text-secondary"
                        : appt.status === "CANCELLED" ? "bg-destructive/10 text-destructive"
                          : appt.status === "CONFIRMED" ? "bg-primary/10 text-primary"
                            : "bg-amber-500/10 text-amber-600"
                      }`}>{appt.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">My Profile</h2>
            {profile ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <HeartPulse className="h-8 w-8 text-primary" />
                  </div>
                  <p className="mt-3 text-lg font-semibold text-card-foreground">{profile.first_name} {profile.last_name}</p>
                </div>
                <div className="space-y-3 border-t border-border pt-4">
                  {[
                    ["Blood Group", profile.blood_group || "Not set"],
                    ["Date of Birth", new Date(profile.date_of_birth).toLocaleDateString()],
                    ["Emergency Contact", profile.emergency_contact || "Not set"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-card-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <HeartPulse className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">Profile not set up</p>
                <button onClick={() => setShowProfileForm(true)}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors">
                  Complete Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Profile Form Modal */}
      <Modal isOpen={showProfileForm} onClose={() => setShowProfileForm(false)} title="Complete Your Profile">
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
              <input type="text" required value={profileForm.first_name} onChange={(e) => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
              <input type="text" required value={profileForm.last_name} onChange={(e) => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Date of Birth</label>
            <input type="date" required value={profileForm.date_of_birth} onChange={(e) => setProfileForm(p => ({ ...p, date_of_birth: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Blood Group</label>
            <select value={profileForm.blood_group} onChange={(e) => setProfileForm(p => ({ ...p, blood_group: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none">
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Emergency Contact</label>
            <input type="text" required value={profileForm.emergency_contact} onChange={(e) => setProfileForm(p => ({ ...p, emergency_contact: e.target.value }))}
              placeholder="Phone number or name" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {submitting ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </Modal>

      {/* Booking Form Modal */}
      <Modal isOpen={showBookingForm} onClose={() => setShowBookingForm(false)} title="Book Appointment">
        <form onSubmit={handleBookingSubmit} className="space-y-4">
          {doctors.length === 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-center">
              <p className="text-sm text-amber-800 dark:text-amber-200">No doctors linked to your account yet.</p>
              <p className="text-xs text-amber-700 dark:text-amber-300/70 mt-1">Ask your doctor to add you as a patient from their portal.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Select Doctor</label>
                <select required value={bookingForm.doctor_id} onChange={(e) => setBookingForm(b => ({ ...b, doctor_id: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  <option value="">Choose a doctor...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name} — {d.specialization}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Date & Time</label>
                <input type="datetime-local" required value={bookingForm.scheduled_time}
                  onChange={(e) => setBookingForm(b => ({ ...b, scheduled_time: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notes <span className="text-muted-foreground">(optional)</span></label>
                <textarea value={bookingForm.meeting_notes} onChange={(e) => setBookingForm(b => ({ ...b, meeting_notes: e.target.value }))}
                  rows={3} placeholder="Describe your symptoms or reason for visit..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {submitting ? "Booking..." : "Book Appointment"}
              </button>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
