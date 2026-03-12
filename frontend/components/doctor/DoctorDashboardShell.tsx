"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/ui/Toast";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Activity, Loader2 } from "lucide-react";

import {
  DoctorSidebar,
  type DoctorView,
} from "@/components/doctor/DoctorSidebar";
import { OverviewView } from "@/components/doctor/views/OverviewView";
import { PatientsView } from "@/components/doctor/views/PatientsView";
import { AppointmentsView } from "@/components/doctor/views/AppointmentsView";
import { ReferralsView } from "@/components/doctor/views/ReferralsView";
import { CareTeamsView } from "@/components/doctor/views/CareTeamsView";
import { ProfileView } from "@/components/doctor/views/ProfileView";
import { ChatView } from "@/components/doctor/views/ChatView";
import { ProfileFormModal } from "@/components/doctor/modals/ProfileFormModal";
import { ReferralFormModal } from "@/components/doctor/modals/ReferralFormModal";
import { CareTeamFormModal } from "@/components/doctor/modals/CareTeamFormModal";
import PatientDiscoveryModal from "@/components/doctor/PatientDiscoveryModal";

import { useDoctorData } from "@/hooks/use-doctor-data";
import {
  createDoctorProfile,
  updateAppointmentStatus,
  createReferral,
  updateReferralStatus,
  createCareTeam,
  createChatRoom,
  sendChatMessage,
} from "@/lib/api-client";
import type { CometChat } from "@cometchat/chat-sdk-javascript";
import { useCometChatSession } from "@/hooks/use-cometchat-session";
import { IncomingCallBanner } from "@/components/chat/IncomingCallBanner";
import { ActiveCallDialog } from "@/components/chat/ActiveCallDialog";

import type { ReferralFormState } from "@/components/doctor/modals/ReferralFormModal";
import type { CareTeamFormState } from "@/components/doctor/modals/CareTeamFormModal";

// ─── Default form states ──────────────────────────────────────────────────────

interface CreateProfileForm {
  first_name: string;
  last_name: string;
  specialization: string;
  license_number: string;
}

const DEFAULT_CREATE_PROFILE_FORM: CreateProfileForm = {
  first_name: "",
  last_name: "",
  specialization: "",
  license_number: "",
};

const DEFAULT_REFERRAL_FORM: ReferralFormState = {
  patient_id: "",
  referred_doctor_id: "",
  reason: "",
};

const DEFAULT_CARE_TEAM_FORM: CareTeamFormState = {
  patient_id: "",
  name: "",
  description: "",
};

// ─── Label map ────────────────────────────────────────────────────────────────

const VIEW_LABELS: Record<DoctorView, string> = {
  overview: "Dashboard",
  patients: "My Patients",
  appointments: "Appointments",
  referrals: "Referrals",
  "care-teams": "Care Teams",
  profile: "My Profile",
  chat: "Secure Chat",
};

// ─── Shell ────────────────────────────────────────────────────────────────────

export function DoctorDashboardShell() {
  const { session, status, logout, refreshSession } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [activeView, setActiveView] = useState<DoctorView>("overview");

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [chatInitialRoomId, setChatInitialRoomId] = useState<string | null>(
    null,
  );
  const [chatSwitchTrigger, setChatSwitchTrigger] = useState(0);

  // ── CometChat video call ────────────────────────────────────────────────────
  const { isReady: cometChatReady } = useCometChatSession();
  const [activeCall, setActiveCall] = useState<CometChat.Call | null>(null);

  // ── Modal open flags ───────────────────────────────────────────────────────
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [showCareTeamForm, setShowCareTeamForm] = useState(false);

  // ── Form states ────────────────────────────────────────────────────────────
  const [createProfileForm, setCreateProfileForm] = useState<CreateProfileForm>(
    DEFAULT_CREATE_PROFILE_FORM,
  );
  const [referralForm, setReferralForm] = useState<ReferralFormState>(
    DEFAULT_REFERRAL_FORM,
  );
  const [careTeamForm, setCareTeamForm] = useState<CareTeamFormState>(
    DEFAULT_CARE_TEAM_FORM,
  );

  // ── Submission loading ─────────────────────────────────────────────────────
  const [submittingCreateProfile, setSubmittingCreateProfile] = useState(false);
  const [submittingReferral, setSubmittingReferral] = useState(false);
  const [submittingCareTeam, setSubmittingCareTeam] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?role=doctor");
    }
    if (status === "authenticated" && session?.user?.role !== "DOCTOR") {
      router.push(`/${session?.user?.role.toLowerCase()}/dashboard`);
    }
  }, [status, session, router]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const {
    upcoming,
    history,
    patients,
    profile,
    sentReferrals,
    receivedReferrals,
    careTeams,
    loading,
    fetchData,
    updateProfile,
    setUpcoming,
    setHistory,
  } = useDoctorData();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "DOCTOR") {
      fetchData();
    }
  }, [status, session, fetchData]);

  // ── Cross-side polling: refresh appointments every 30s when on that view ───
  useEffect(() => {
    if (activeView !== "appointments") return;
    const id = setInterval(() => {
      fetchData();
    }, 30_000);
    return () => clearInterval(id);
  }, [activeView, fetchData]);

  // ── Open create-profile form (only used when no profile exists yet) ────────
  const openCreateProfileForm = useCallback(() => {
    setCreateProfileForm({
      first_name: "",
      last_name: "",
      specialization: "",
      license_number: "",
    });
    setShowCreateProfile(true);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreateProfileSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmittingCreateProfile(true);
      try {
        const p = await createDoctorProfile(createProfileForm);
        updateProfile(p);
        setShowCreateProfile(false);
        toast("Doctor profile created!", "success");
        await Promise.all([fetchData(), refreshSession()]);
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Failed to create profile",
          "error",
        );
      } finally {
        setSubmittingCreateProfile(false);
      }
    },
    [createProfileForm, updateProfile, fetchData, refreshSession, toast],
  );

  const handleStatusUpdate = useCallback(
    async (appointmentId: string, newStatus: string) => {
      // Optimistic update: immediately reflect status change in UI
      const validStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
      if (validStatuses.includes(newStatus)) {
        const typedStatus = newStatus as
          | "PENDING"
          | "CONFIRMED"
          | "COMPLETED"
          | "CANCELLED";
        if (typedStatus === "COMPLETED" || typedStatus === "CANCELLED") {
          // Move from upcoming to history
          const appt = upcoming.find((a) => a.id === appointmentId);
          if (appt) {
            const updated = { ...appt, status: typedStatus };
            setUpcoming((prev) => prev.filter((a) => a.id !== appointmentId));
            setHistory((prev) => [
              updated,
              ...prev.filter((a) => a.id !== appointmentId),
            ]);
          }
        } else {
          // Update in-place in upcoming list
          setUpcoming((prev) =>
            prev.map((a) =>
              a.id === appointmentId ? { ...a, status: typedStatus } : a,
            ),
          );
        }
      }

      try {
        await updateAppointmentStatus(appointmentId, newStatus);
        toast(`Appointment ${newStatus.toLowerCase()}!`, "success");

        // Notify the patient via chat when the doctor cancels
        if (newStatus === "CANCELLED") {
          const appt = upcoming.find((a) => a.id === appointmentId);
          if (appt) {
            const patient = patients.find(
              (p) => p.profile_id === appt.patient_id,
            );
            if (patient) {
              try {
                const room = await createChatRoom({
                  participant_ids: [patient.user_id],
                });
                const dateStr = new Date(appt.scheduled_time).toLocaleString(
                  "en-US",
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  },
                );
                await sendChatMessage(
                  room.id,
                  `Your appointment scheduled for ${dateStr} has been cancelled by your doctor.`,
                );
              } catch {
                // Non-critical — notification failure should not block the cancel
              }
            }
          }
        }

        // Background sync
        fetchData().catch(() => {});
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Failed to update appointment",
          "error",
        );
        // Revert by re-fetching
        await fetchData();
      }
    },
    [fetchData, setUpcoming, setHistory, toast, upcoming, patients],
  );

  const handleCreateReferral = useCallback(async () => {
    setSubmittingReferral(true);
    try {
      await createReferral(referralForm);
      toast("Referral sent!", "success");
      setShowReferralForm(false);
      setReferralForm(DEFAULT_REFERRAL_FORM);
      await fetchData();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to send referral",
        "error",
      );
    } finally {
      setSubmittingReferral(false);
    }
  }, [referralForm, fetchData, toast]);

  const handleReferralAction = useCallback(
    async (id: string, action: "ACCEPTED" | "DECLINED") => {
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
    },
    [fetchData, toast],
  );

  const handleCreateCareTeam = useCallback(async () => {
    setSubmittingCareTeam(true);
    try {
      await createCareTeam(careTeamForm);
      toast("Care team created!", "success");
      setShowCareTeamForm(false);
      setCareTeamForm(DEFAULT_CARE_TEAM_FORM);
      await fetchData();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to create care team",
        "error",
      );
    } finally {
      setSubmittingCareTeam(false);
    }
  }, [careTeamForm, fetchData, toast]);

  const handleChatWithPatient = useCallback(
    async (patientUserId: string) => {
      try {
        const room = await createChatRoom({
          room_type: "DIRECT",
          participant_ids: [patientUserId],
        });
        setChatInitialRoomId(room.id);
        setChatSwitchTrigger((t) => t + 1);
        setActiveView("chat");
      } catch {
        toast(
          "Could not open chat. Please try from the Chat section.",
          "error",
        );
      }
    },
    [toast],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/");
  }, [logout, router]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const pendingReferrals = receivedReferrals.filter(
    (r) => r.status === "PENDING",
  ).length;

  // ── Loading / auth states ──────────────────────────────────────────────────
  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
            <Activity className="h-6 w-6 text-secondary animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Loading your dashboard…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "DOCTOR") return null;

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      {/* Sidebar — sticky full-height column */}
      <DoctorSidebar
        user={session.user}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={handleLogout}
        upcomingCount={upcoming.length}
        pendingReferrals={pendingReferrals}
        className="h-svh sticky top-0"
      />

      {/* Main content — fills remaining width */}
      <SidebarInset className="h-svh overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-6 backdrop-blur-md">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground/60 font-medium">
              Doctor Portal
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-semibold text-foreground capitalize">
              {VIEW_LABELS[activeView]}
            </span>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            {pendingReferrals > 0 && (
              <Badge
                variant="outline"
                className="h-6 gap-1.5 px-2.5 text-xs font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 cursor-pointer"
                onClick={() => setActiveView("referrals")}
              >
                {pendingReferrals} pending referral
                {pendingReferrals > 1 ? "s" : ""}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="h-6 gap-1.5 px-2.5 text-xs font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </Badge>
          </div>
        </header>

        {/* Chat — always mounted, hidden via CSS when inactive */}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-hidden",
            activeView === "chat" ? "flex" : "hidden",
          )}
        >
          <ChatView
            initialRoomId={chatInitialRoomId}
            switchTrigger={chatSwitchTrigger}
          />
        </div>

        {/* All other views — scrollable */}
        <main
          className={cn(
            "flex-1 min-h-0 overflow-y-auto px-6 py-8 sm:px-8 lg:px-10",
            activeView === "chat" ? "hidden" : "block",
          )}
        >
          <div className="mx-auto max-w-6xl w-full">
            {activeView === "overview" && (
              <OverviewView
                user={session.user}
                profile={profile}
                upcoming={upcoming}
                patients={patients}
                receivedReferrals={receivedReferrals}
                onAddPatient={() => setShowAddPatient(true)}
                onCompleteProfile={openCreateProfileForm}
                onChatWithPatient={handleChatWithPatient}
                onNavigateToAppointments={() => setActiveView("appointments")}
                onNavigateToPatients={() => setActiveView("patients")}
                onNavigateToReferrals={() => setActiveView("referrals")}
                onStatusUpdate={handleStatusUpdate}
              />
            )}

            {activeView === "patients" && (
              <PatientsView
                patients={patients}
                onAddPatient={() => setShowAddPatient(true)}
                onChatWithPatient={handleChatWithPatient}
              />
            )}

            {activeView === "appointments" && (
              <AppointmentsView
                upcoming={upcoming}
                history={history}
                patients={patients}
                onStatusUpdate={handleStatusUpdate}
                onRefresh={fetchData}
                sessionReady={cometChatReady}
              />
            )}

            {activeView === "referrals" && (
              <ReferralsView
                sentReferrals={sentReferrals}
                receivedReferrals={receivedReferrals}
                onCreateReferral={() => setShowReferralForm(true)}
                onReferralAction={handleReferralAction}
              />
            )}

            {activeView === "care-teams" && (
              <CareTeamsView
                careTeams={careTeams}
                onCreateTeam={() => setShowCareTeamForm(true)}
              />
            )}

            {activeView === "profile" && (
              <ProfileView
                user={session.user}
                profile={profile}
                onCreateProfile={openCreateProfileForm}
                onProfileUpdated={async (p) => {
                  updateProfile(p);
                  await Promise.all([fetchData(), refreshSession()]);
                }}
              />
            )}
          </div>
        </main>
      </SidebarInset>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Create doctor profile (only shown when no profile exists yet) */}
      {!profile && (
        <ProfileFormModal
          isOpen={showCreateProfile}
          onClose={() => setShowCreateProfile(false)}
          isEditing={false}
          form={createProfileForm}
          onPatch={(patch) =>
            setCreateProfileForm((prev) => ({ ...prev, ...patch }))
          }
          submitting={submittingCreateProfile}
          onSubmit={handleCreateProfileSubmit}
        />
      )}

      {/* Add / discover patient */}
      <PatientDiscoveryModal
        isOpen={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        onPatientLinked={async () => {
          await fetchData();
        }}
      />

      {/* Refer patient */}
      <ReferralFormModal
        isOpen={showReferralForm}
        onClose={() => setShowReferralForm(false)}
        form={referralForm}
        onPatch={(patch) => setReferralForm((prev) => ({ ...prev, ...patch }))}
        submitting={submittingReferral}
        onSubmit={handleCreateReferral}
      />

      {/* Create care team */}
      <CareTeamFormModal
        isOpen={showCareTeamForm}
        onClose={() => setShowCareTeamForm(false)}
        form={careTeamForm}
        onPatch={(patch) => setCareTeamForm((prev) => ({ ...prev, ...patch }))}
        submitting={submittingCareTeam}
        onSubmit={handleCreateCareTeam}
      />

      {/* ── CometChat call overlay ─────────────────────────────────────── */}
      <IncomingCallBanner onCallAccepted={setActiveCall} />
      {activeCall && (
        <ActiveCallDialog
          call={activeCall}
          onCallEnded={() => setActiveCall(null)}
        />
      )}
    </SidebarProvider>
  );
}
