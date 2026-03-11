"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/ui/Toast";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity } from "lucide-react";

import {
  PatientSidebar,
  type PatientView,
} from "@/components/patient/PatientSidebar";
import { OverviewView } from "@/components/patient/views/OverviewView";
import { AppointmentsView } from "@/components/patient/views/AppointmentsView";
import { DoctorsView } from "@/components/patient/views/DoctorsView";
import { ProfileView } from "@/components/patient/views/ProfileView";
import { ChatView } from "@/components/patient/views/ChatView";
import { ProfileFormModal } from "@/components/patient/modals/ProfileFormModal";
import { BookingFormModal } from "@/components/patient/modals/BookingFormModal";

import { usePatientData } from "@/hooks/use-patient-data";
import { useProfileForm } from "@/hooks/use-profile-form";
import { useBookingForm } from "@/hooks/use-booking-form";
import { createChatRoom } from "@/lib/api-client";

export function PatientDashboardShell() {
  const { session, status, logout, refreshSession } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [activeView, setActiveView] = useState<PatientView>("overview");

  // Chat state — pre-selected room when clicking "Chat" on a doctor card
  const [chatInitialRoomId, setChatInitialRoomId] = useState<string | null>(
    null,
  );
  const [chatSwitchTrigger, setChatSwitchTrigger] = useState(0);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?role=patient");
    }
    if (status === "authenticated" && session?.user?.role !== "PATIENT") {
      router.push(`/${session?.user?.role.toLowerCase()}/dashboard`);
    }
  }, [status, session, router]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const {
    upcoming,
    history,
    doctors,
    profile,
    loading,
    fetchData,
    updateProfile,
  } = usePatientData();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "PATIENT") {
      fetchData();
    }
  }, [status, session, fetchData]);

  // ── Profile form ───────────────────────────────────────────────────────────
  const profileForm = useProfileForm({
    profile,
    onSuccess: async (p) => {
      updateProfile(p);
      await Promise.all([fetchData(), refreshSession()]);
    },
    toast,
  });

  // ── Booking form ───────────────────────────────────────────────────────────
  const bookingForm = useBookingForm({
    profile,
    onSuccess: fetchData,
    toast,
  });

  // ── Chat helpers ───────────────────────────────────────────────────────────
  const handleChatWithDoctor = useCallback(
    async (doctorUserId: string) => {
      try {
        const room = await createChatRoom({
          room_type: "DIRECT",
          participant_ids: [doctorUserId],
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

  // ── Book with specific doctor (pre-fill dropdown) ──────────────────────────
  const handleBookWithDoctor = useCallback(
    (doctorProfileId: string) => {
      bookingForm.open(doctorProfileId);
    },
    [bookingForm],
  );

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/");
  }, [logout, router]);

  // ── Loading / auth states ──────────────────────────────────────────────────
  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-6 w-6 text-primary animate-pulse" />
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

  if (!session?.user || session.user.role !== "PATIENT") return null;

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      {/* Sidebar — sticky full-height column */}
      <PatientSidebar
        user={session.user}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={handleLogout}
        upcomingCount={upcoming.length}
        className="h-svh sticky top-0"
      />

      {/* Main content — fills remaining width, never overflows the viewport */}
      <SidebarInset className="h-svh overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-6 backdrop-blur-md">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground/60 font-medium">
              Patient Portal
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-semibold text-foreground capitalize">
              {activeView === "overview"
                ? "Dashboard"
                : activeView === "chat"
                  ? "Secure Chat"
                  : activeView.replace("-", " ")}
            </span>
          </div>

          {/* Right side — live indicator */}
          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant="outline"
              className="h-6 gap-1.5 px-2.5 text-xs font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </Badge>
          </div>
        </header>

        {/* Chat — always mounted so it never re-fetches on tab switch.
            Hidden via CSS when another view is active. */}
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

        {/* All other views — scrollable, hidden when chat is active */}
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
                history={history}
                doctors={doctors}
                onBookAppointment={() => bookingForm.open()}
                onEditProfile={profileForm.open}
                onChatWithDoctor={handleChatWithDoctor}
                onNavigateToAppointments={() => setActiveView("appointments")}
                onNavigateToDoctors={() => setActiveView("doctors")}
                onNavigateToProfile={() => setActiveView("profile")}
              />
            )}
            {activeView === "appointments" && (
              <AppointmentsView
                upcoming={upcoming}
                history={history}
                doctors={doctors}
                onBookAppointment={() => bookingForm.open()}
                onRefresh={fetchData}
              />
            )}
            {activeView === "doctors" && (
              <DoctorsView
                doctors={doctors}
                onChatWithDoctor={handleChatWithDoctor}
                onBookWithDoctor={handleBookWithDoctor}
              />
            )}
            {activeView === "profile" && (
              <ProfileView
                user={session.user}
                profile={profile}
                onCreateProfile={profileForm.open}
                onProfileUpdated={async (p) => {
                  updateProfile(p);
                  await Promise.all([fetchData(), refreshSession()]);
                }}
              />
            )}
          </div>
        </main>
      </SidebarInset>

      {/* Profile form modal */}
      <ProfileFormModal
        isOpen={profileForm.isOpen}
        onClose={profileForm.close}
        isEditing={!!profile}
        activeTab={profileForm.activeTab}
        onTabChange={profileForm.setActiveTab}
        form={profileForm.form}
        onPatch={profileForm.patchForm}
        submitting={profileForm.submitting}
        generatingTags={profileForm.generatingTags}
        onGenerateTags={profileForm.handleGenerateTags}
        onRemoveTag={profileForm.removeTag}
        onSubmit={profileForm.handleSubmit}
      />

      {/* Booking modal */}
      <BookingFormModal
        isOpen={bookingForm.isOpen}
        onClose={bookingForm.close}
        doctors={doctors}
        form={bookingForm.form}
        onPatch={bookingForm.patchForm}
        submitting={bookingForm.submitting}
        onSubmit={bookingForm.handleSubmit}
      />
    </SidebarProvider>
  );
}
