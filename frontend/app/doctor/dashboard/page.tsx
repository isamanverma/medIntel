"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import PatientDiscoveryModal from "@/components/doctor/PatientDiscoveryModal";
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
  Send,
  ArrowRightLeft,
  UsersRound,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { SecureChat } from "@/components/chat/SecureChat";
import {
  getUpcomingAppointments,
  getMyPatients,
  getMyDoctorProfile,
  createDoctorProfile,
  updateAppointmentStatus,
  getSentReferrals,
  getReceivedReferrals,
  createReferral,
  updateReferralStatus,
  getDoctorCareTeams,
  createCareTeam,
  createChatRoom,
} from "@/lib/api-client";
import type {
  Appointment,
  MappingPatient,
  DoctorProfile,
  Referral,
  CareTeam,
} from "@/lib/types";

export default function DoctorDashboard() {
  const { session, status, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<MappingPatient[]>([]);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Chat integration — pre-selected room when clicking "Chat" on a patient card
  const [chatInitialRoomId, setChatInitialRoomId] = useState<
    string | undefined
  >(undefined);
  // Controls which main section is visible: "dashboard" | "chat"
  const [activeSection, setActiveSection] = useState<"dashboard" | "chat">(
    "dashboard",
  );

  // Modals
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [showCareTeamForm, setShowCareTeamForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    specialization: "",
    license_number: "",
  });

  // Referrals
  const [sentReferrals, setSentReferrals] = useState<Referral[]>([]);
  const [receivedReferrals, setReceivedReferrals] = useState<Referral[]>([]);
  const [referralTab, setReferralTab] = useState<"received" | "sent">(
    "received",
  );
  const [referralForm, setReferralForm] = useState({
    referred_doctor_id: "",
    patient_id: "",
    reason: "",
  });

  // Care Teams
  const [careTeams, setCareTeams] = useState<CareTeam[]>([]);
  const [careTeamForm, setCareTeamForm] = useState({
    patient_id: "",
    name: "",
    description: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [upcomingRes, patientsRes, sentRef, receivedRef, teamsRes] =
        await Promise.allSettled([
          getUpcomingAppointments(),
          getMyPatients(),
          getSentReferrals(),
          getReceivedReferrals(),
          getDoctorCareTeams(),
        ]);
      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
      if (patientsRes.status === "fulfilled") setPatients(patientsRes.value);
      if (sentRef.status === "fulfilled") setSentReferrals(sentRef.value);
      if (receivedRef.status === "fulfilled")
        setReceivedReferrals(receivedRef.value);
      if (teamsRes.status === "fulfilled") setCareTeams(teamsRes.value);
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
    if (status === "authenticated" && session?.user?.role === "DOCTOR")
      fetchData();
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
      toast(
        err instanceof Error ? err.message : "Failed to create profile",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (
    appointmentId: string,
    newStatus: string,
  ) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      toast(`Appointment ${newStatus.toLowerCase()}!`, "success");
      await fetchData();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to update status",
        "error",
      );
    }
  };

  const handleCreateReferral = async () => {
    if (
      !referralForm.referred_doctor_id ||
      !referralForm.patient_id ||
      !referralForm.reason
    )
      return;
    setSubmitting(true);
    try {
      await createReferral(referralForm);
      toast("Referral sent!", "success");
      setShowReferralForm(false);
      setReferralForm({ referred_doctor_id: "", patient_id: "", reason: "" });
      await fetchData();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to create referral",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReferralAction = async (
    id: string,
    action: "ACCEPTED" | "DECLINED",
  ) => {
    try {
      await updateReferralStatus(id, action);
      toast(`Referral ${action.toLowerCase()}!`, "success");
      await fetchData();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to update referral",
        "error",
      );
    }
  };

  const handleChatWithPatient = async (patientUserId: string) => {
    try {
      const room = await createChatRoom({
        room_type: "DIRECT",
        participant_ids: [patientUserId],
      });
      setChatInitialRoomId(room.id);
      setActiveSection("chat");
      // Scroll to the chat section smoothly
      setTimeout(() => {
        document
          .getElementById("chat-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch {
      toast("Could not open chat. Please try from the Chat tab.", "error");
    }
  };

  const handleCreateCareTeam = async () => {
    if (!careTeamForm.patient_id || !careTeamForm.name) return;
    setSubmitting(true);
    try {
      await createCareTeam(careTeamForm);
      toast("Care team created!", "success");
      setShowCareTeamForm(false);
      setCareTeamForm({ patient_id: "", name: "", description: "" });
      await fetchData();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to create care team",
        "error",
      );
    } finally {
      setSubmitting(false);
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
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const stats = [
    {
      label: "My Patients",
      value: String(patients.length),
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Upcoming",
      value: String(upcoming.length),
      icon: Calendar,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Today",
      value: String(todayAppts.length),
      icon: Clock,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Confirmed",
      value: String(upcoming.filter((a) => a.status === "CONFIRMED").length),
      icon: CheckCircle,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
  ];

  const sortedUpcoming = [...upcoming].sort(
    (a, b) =>
      new Date(a.scheduled_time).getTime() -
      new Date(b.scheduled_time).getTime(),
  );

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
            <button
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome + Actions */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
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
          <div className="flex gap-2">
            {!profile && (
              <button
                onClick={() => setShowProfileForm(true)}
                className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors"
              >
                <Stethoscope className="h-4 w-4" /> Complete Profile
              </button>
            )}
            <button
              onClick={() => setShowAddPatient(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="h-4 w-4" /> Add Patient
            </button>
          </div>
        </div>

        {/* Profile banner */}
        {!profile && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-center gap-3">
            <Stethoscope className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Profile Incomplete
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300/70">
                Complete your profile to manage patients and appointments.
              </p>
            </div>
            <button
              onClick={() => setShowProfileForm(true)}
              className="ml-auto rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
            >
              Set Up Now
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Schedule */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
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
            {sortedUpcoming.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  No upcoming appointments
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">
                          Patient Appointment
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appt.scheduled_time).toLocaleString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}
                          {appt.notes && ` · ${appt.notes}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          appt.status === "COMPLETED"
                            ? "bg-secondary/10 text-secondary"
                            : appt.status === "CONFIRMED"
                              ? "bg-primary/10 text-primary"
                              : appt.status === "CANCELLED"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {appt.status}
                      </span>
                      {appt.status === "PENDING" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              handleStatusUpdate(appt.id, "CONFIRMED")
                            }
                            title="Confirm"
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleStatusUpdate(appt.id, "CANCELLED")
                            }
                            title="Cancel"
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {appt.status === "CONFIRMED" && (
                        <button
                          onClick={() =>
                            handleStatusUpdate(appt.id, "COMPLETED")
                          }
                          title="Mark complete"
                          className="flex h-7 items-center gap-1 rounded-md bg-secondary/10 px-2 text-xs font-medium text-secondary hover:bg-secondary/20 transition-colors"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Done
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Profile / ID Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="h-4 w-4 text-secondary" />
              <h2 className="text-sm font-semibold text-card-foreground">
                My Profile
              </h2>
            </div>
            <div className="flex flex-col items-center pb-4 border-b border-border">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10 text-secondary font-bold text-lg">
                {session.user.name?.charAt(0).toUpperCase()}
              </div>
              <p className="mt-2 text-sm font-semibold text-card-foreground">
                {session.user.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {session.user.email}
              </p>
              {profile && (
                <p className="mt-1 text-xs text-secondary font-medium">
                  {profile.specialization}
                </p>
              )}
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                { label: "User ID", value: session.user.id },
                ...(profile
                  ? [{ label: "Doctor Profile ID", value: String(profile.id) }]
                  : []),
                ...(profile?.license_number
                  ? [{ label: "License #", value: profile.license_number }]
                  : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                    {label}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-[11px] text-foreground font-mono">
                      {value}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(value);
                        toast("Copied!", "success");
                      }}
                      className="flex-shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Copy to clipboard"
                    >
                      <Activity className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!profile && (
              <button
                onClick={() => setShowProfileForm(true)}
                className="mt-3 w-full rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-white hover:bg-secondary/90 transition-colors"
              >
                Complete Profile
              </button>
            )}
          </div>

          {/* My Patients */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-card-foreground">
                My Patients
              </h2>
              <button
                onClick={() => setShowAddPatient(true)}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {patients.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  No patients yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Add patients to manage their care.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {patients.map((p) => (
                  <div
                    key={p.profile_id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                      {p.first_name?.[0]}
                      {p.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground">
                        {p.first_name} {p.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {p.profile_id.slice(0, 8)}…
                      </p>
                    </div>
                    <button
                      onClick={() => handleChatWithPatient(p.user_id)}
                      className="ml-auto flex-shrink-0 rounded-lg p-1.5 text-primary/60 hover:bg-primary/10 hover:text-primary transition-colors"
                      title={`Chat with ${p.first_name} ${p.last_name}`}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Referrals Section */}
        <div className="mt-8 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-card-foreground">
                Referrals
              </h2>
            </div>
            <button
              onClick={() => setShowReferralForm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Send className="h-4 w-4" /> Refer Patient
            </button>
          </div>
          <div className="border-b border-border">
            <div className="flex">
              <button
                onClick={() => setReferralTab("received")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${referralTab === "received" ? "border-b-2 border-accent text-accent" : "text-muted-foreground hover:text-foreground"}`}
              >
                Received ({receivedReferrals.length})
              </button>
              <button
                onClick={() => setReferralTab("sent")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${referralTab === "sent" ? "border-b-2 border-accent text-accent" : "text-muted-foreground hover:text-foreground"}`}
              >
                Sent ({sentReferrals.length})
              </button>
            </div>
          </div>
          <div className="p-4">
            {(referralTab === "received" ? receivedReferrals : sentReferrals)
              .length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No {referralTab} referrals yet.
              </p>
            ) : (
              <div className="space-y-3">
                {(referralTab === "received"
                  ? receivedReferrals
                  : sentReferrals
                ).map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        {ref.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Patient: {ref.patient_id.slice(0, 8)}… ·{" "}
                        {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ref.status === "ACCEPTED" ? "bg-secondary/10 text-secondary" : ref.status === "DECLINED" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"}`}
                      >
                        {ref.status}
                      </span>
                      {referralTab === "received" &&
                        ref.status === "PENDING" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                handleReferralAction(ref.id, "ACCEPTED")
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                              title="Accept"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleReferralAction(ref.id, "DECLINED")
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                              title="Decline"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Care Teams Section */}
        <div className="mt-8 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-secondary" />
              <h2 className="text-lg font-semibold text-card-foreground">
                My Care Teams
              </h2>
            </div>
            <button
              onClick={() => setShowCareTeamForm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-white hover:bg-secondary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> New Team
            </button>
          </div>
          <div className="p-4">
            {careTeams.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No care teams yet. Create one for multi-doctor collaboration.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {careTeams.map((team) => (
                  <div
                    key={team.id}
                    className="rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors"
                  >
                    <h3 className="font-medium text-card-foreground">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {team.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Patient: {team.patient_id.slice(0, 8)}…
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {team.members?.length || 0} members
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Secure Chat */}
        <div id="chat-section" className="mt-8">
          <SecureChat initialRoomId={chatInitialRoomId} />
        </div>
      </main>

      {/* Doctor Profile Modal */}
      <Modal
        isOpen={showProfileForm}
        onClose={() => setShowProfileForm(false)}
        title="Complete Your Doctor Profile"
      >
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={profileForm.first_name}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, first_name: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={profileForm.last_name}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, last_name: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Specialization
            </label>
            <input
              type="text"
              required
              value={profileForm.specialization}
              onChange={(e) =>
                setProfileForm((p) => ({
                  ...p,
                  specialization: e.target.value,
                }))
              }
              placeholder="e.g. Cardiology, General Practice"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              License Number
            </label>
            <input
              type="text"
              required
              value={profileForm.license_number}
              onChange={(e) =>
                setProfileForm((p) => ({
                  ...p,
                  license_number: e.target.value,
                }))
              }
              placeholder="Medical license number"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </Modal>

      {/* Add Patient Discovery Modal */}
      <PatientDiscoveryModal
        isOpen={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        onPatientLinked={async () => {
          await fetchData();
        }}
      />

      {/* Refer Patient Modal */}
      <Modal
        isOpen={showReferralForm}
        onClose={() => setShowReferralForm(false)}
        title="Refer Patient to Another Doctor"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Patient ID
            </label>
            <input
              type="text"
              required
              value={referralForm.patient_id}
              onChange={(e) =>
                setReferralForm((f) => ({ ...f, patient_id: e.target.value }))
              }
              placeholder="Patient profile ID"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Referred Doctor ID
            </label>
            <input
              type="text"
              required
              value={referralForm.referred_doctor_id}
              onChange={(e) =>
                setReferralForm((f) => ({
                  ...f,
                  referred_doctor_id: e.target.value,
                }))
              }
              placeholder="Doctor profile ID to refer to"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Reason
            </label>
            <textarea
              required
              value={referralForm.reason}
              onChange={(e) =>
                setReferralForm((f) => ({ ...f, reason: e.target.value }))
              }
              placeholder="Reason for referral"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
          <button
            onClick={handleCreateReferral}
            disabled={
              submitting ||
              !referralForm.patient_id ||
              !referralForm.referred_doctor_id ||
              !referralForm.reason
            }
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Sending…" : "Send Referral"}
          </button>
        </div>
      </Modal>

      {/* Create Care Team Modal */}
      <Modal
        isOpen={showCareTeamForm}
        onClose={() => setShowCareTeamForm(false)}
        title="Create Care Team"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Patient ID
            </label>
            <input
              type="text"
              required
              value={careTeamForm.patient_id}
              onChange={(e) =>
                setCareTeamForm((f) => ({ ...f, patient_id: e.target.value }))
              }
              placeholder="Patient profile ID"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Team Name
            </label>
            <input
              type="text"
              required
              value={careTeamForm.name}
              onChange={(e) =>
                setCareTeamForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. Cardiac Care Team"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={careTeamForm.description}
              onChange={(e) =>
                setCareTeamForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Brief description"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <button
            onClick={handleCreateCareTeam}
            disabled={
              submitting || !careTeamForm.patient_id || !careTeamForm.name
            }
            className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating…" : "Create Team"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
