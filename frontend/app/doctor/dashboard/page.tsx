"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import {
  Activity,
  LogOut,
  Stethoscope,
  Users,
  Calendar,
  Clock,
  Loader2,
  Inbox,
  Plus,
  CheckCircle,
  XCircle,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import {
  getUpcomingAppointments,
  getMyPatients,
  getMyDoctorProfile,
  createDoctorProfile,
  createMapping,
  updateAppointmentStatus,
} from "@/lib/api-client";
import type { Appointment, MappingPatient, DoctorProfile } from "@/lib/types";

export default function DoctorDashboard() {
  const { session, status, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<MappingPatient[]>([]);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    specialization: "",
    license_number: "",
  });

  // Add patient form
  const [patientId, setPatientId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [upcomingRes, patientsRes] = await Promise.allSettled([
        getUpcomingAppointments(),
        getMyPatients(),
      ]);
      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
      if (patientsRes.status === "fulfilled") setPatients(patientsRes.value);
      try {
        const p = await getMyDoctorProfile();
        setProfile(p);
      } catch {
        // No profile yet
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?role=doctor");
    if (status === "authenticated" && session?.user?.role !== "DOCTOR") {
      router.push(`/${session?.user?.role.toLowerCase()}/dashboard`);
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "DOCTOR") fetchData();
  }, [status, session, fetchData]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const p = await createDoctorProfile(profileForm);
      setProfile(p);
      setShowProfileForm(false);
      toast("Doctor profile created!", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create profile", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createMapping({ patient_id: patientId });
      setShowAddPatient(false);
      setPatientId("");
      toast("Patient linked successfully!", "success");
      await fetchData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to add patient", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (
    appointmentId: string,
    newStatus: string
  ) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      toast(`Appointment ${newStatus.toLowerCase()}!`, "success");
      await fetchData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to update status", "error");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "DOCTOR") return null;

  const todayAppts = upcoming.filter((a) => {
    const d = new Date(a.scheduled_time);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const stats = [
    { label: "My Patients", value: String(patients.length), icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Upcoming", value: String(upcoming.length), icon: Calendar, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "Today", value: String(todayAppts.length), icon: Clock, color: "text-accent", bg: "bg-accent/10" },
    { label: "Confirmed", value: String(upcoming.filter(a => a.status === "CONFIRMED").length), icon: CheckCircle, color: "text-secondary", bg: "bg-secondary/10" },
  ];

  const sortedUpcoming = [...upcoming].sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-white">
                <Stethoscope className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">Med<span className="text-secondary">Intel</span></span>
            </Link>
            <span className="hidden sm:inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary">Doctor Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            </div>
            <button onClick={async () => { await logout(); router.push("/"); }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome + Actions */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, Dr. {session.user.name?.split(" ").pop() || "Doctor"}
            </h1>
            <p className="mt-1 text-muted-foreground">Here&apos;s an overview of your practice today.</p>
          </div>
          <div className="flex gap-2">
            {!profile && (
              <button onClick={() => setShowProfileForm(true)}
                className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors">
                <Stethoscope className="h-4 w-4" /> Complete Profile
              </button>
            )}
            <button onClick={() => setShowAddPatient(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              <UserPlus className="h-4 w-4" /> Add Patient
            </button>
          </div>
        </div>

        {/* Profile banner */}
        {!profile && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-center gap-3">
            <Stethoscope className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Profile Incomplete</p>
              <p className="text-xs text-amber-700 dark:text-amber-300/70">Complete your profile to manage patients and appointments.</p>
            </div>
            <button onClick={() => setShowProfileForm(true)}
              className="ml-auto rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors whitespace-nowrap">Set Up Now</button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-card-foreground">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Schedule */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-secondary" />
                <h2 className="text-lg font-semibold text-card-foreground">Upcoming Schedule</h2>
              </div>
              <span className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>
            {sortedUpcoming.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">No upcoming appointments</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sortedUpcoming.map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">Patient Appointment</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appt.scheduled_time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          {appt.notes && ` · ${appt.notes}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${appt.status === "COMPLETED" ? "bg-secondary/10 text-secondary"
                          : appt.status === "CONFIRMED" ? "bg-primary/10 text-primary"
                            : appt.status === "CANCELLED" ? "bg-destructive/10 text-destructive"
                              : "bg-amber-500/10 text-amber-600"
                        }`}>{appt.status}</span>
                      {appt.status === "PENDING" && (
                        <div className="flex gap-1">
                          <button onClick={() => handleStatusUpdate(appt.id, "CONFIRMED")} title="Confirm"
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors">
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleStatusUpdate(appt.id, "CANCELLED")} title="Cancel"
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {appt.status === "CONFIRMED" && (
                        <button onClick={() => handleStatusUpdate(appt.id, "COMPLETED")} title="Mark complete"
                          className="flex h-7 items-center gap-1 rounded-md bg-secondary/10 px-2 text-xs font-medium text-secondary hover:bg-secondary/20 transition-colors">
                          <CheckCircle className="h-3.5 w-3.5" /> Done
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Patients */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-card-foreground">My Patients</h2>
              <button onClick={() => setShowAddPatient(true)}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {patients.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">No patients yet</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Add patients to manage their care.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {patients.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                      {p.first_name?.[0]}{p.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-muted-foreground">DOB: {new Date(p.date_of_birth).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Doctor Profile Modal */}
      <Modal isOpen={showProfileForm} onClose={() => setShowProfileForm(false)} title="Complete Your Doctor Profile">
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
              <input type="text" required value={profileForm.first_name} onChange={(e) => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-secondary focus:ring-1 focus:ring-secondary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
              <input type="text" required value={profileForm.last_name} onChange={(e) => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-secondary focus:ring-1 focus:ring-secondary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Specialization</label>
            <input type="text" required value={profileForm.specialization} onChange={(e) => setProfileForm(p => ({ ...p, specialization: e.target.value }))}
              placeholder="e.g. Cardiology, General Practice"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-secondary focus:ring-1 focus:ring-secondary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">License Number</label>
            <input type="text" required value={profileForm.license_number} onChange={(e) => setProfileForm(p => ({ ...p, license_number: e.target.value }))}
              placeholder="Medical license number"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-secondary focus:ring-1 focus:ring-secondary outline-none" />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50 transition-colors">
            {submitting ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </Modal>

      {/* Add Patient Modal */}
      <Modal isOpen={showAddPatient} onClose={() => setShowAddPatient(false)} title="Add Patient">
        <form onSubmit={handleAddPatient} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Patient Profile ID</label>
            <input type="text" required value={patientId} onChange={(e) => setPatientId(e.target.value)}
              placeholder="Enter the patient's profile ID"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            <p className="mt-1.5 text-xs text-muted-foreground">Ask the patient for their Profile ID from their dashboard.</p>
          </div>
          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {submitting ? "Linking..." : "Link Patient"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
