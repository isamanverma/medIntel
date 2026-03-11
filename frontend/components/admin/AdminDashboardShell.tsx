"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/ui/Toast";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Activity, Loader2 } from "lucide-react";

import { AdminSidebar, type AdminView } from "@/components/admin/AdminSidebar";
import { OverviewView } from "@/components/admin/views/OverviewView";
import { UsersView } from "@/components/admin/views/UsersView";
import { AssignmentsView } from "@/components/admin/views/AssignmentsView";
import { SecureChat } from "@/components/chat/SecureChat";

import {
  getAdminStats,
  getAdminUsers,
  getAssignments,
  getAssignableUsers,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from "@/lib/api-client";
import type {
  AdminStats,
  AdminAssignment,
  AssignableUsersResponse,
} from "@/lib/types";
import type { AdminUser } from "@/lib/api-client";

const VIEW_LABELS: Record<AdminView, string> = {
  overview: "Overview",
  users: "Users",
  assignments: "Assignments",
  chat: "Secure Chat",
};

export function AdminDashboardShell() {
  const { session, status, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [activeView, setActiveView] = useState<AdminView>("overview");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [assignableUsers, setAssignableUsers] =
    useState<AssignableUsersResponse>({ patients: [], doctors: [] });
  const [loading, setLoading] = useState(true);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?role=admin");
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push(`/${session?.user?.role.toLowerCase()}/dashboard`);
    }
  }, [status, session, router]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes, assignRes, assignableRes] =
        await Promise.allSettled([
          getAdminStats(),
          getAdminUsers(),
          getAssignments(),
          getAssignableUsers(),
        ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value);
      if (assignRes.status === "fulfilled") setAssignments(assignRes.value);
      if (assignableRes.status === "fulfilled")
        setAssignableUsers(assignableRes.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchData();
    }
  }, [status, session, fetchData]);

  // ── User actions ───────────────────────────────────────────────────────────
  const handleToggleStatus = useCallback(
    async (u: AdminUser) => {
      try {
        const updated = await updateUserStatus(u.id, !u.is_active);
        setUsers((prev) =>
          prev.map((x) => (x.id === updated.id ? updated : x)),
        );
        toast(
          `User ${updated.is_active ? "activated" : "deactivated"}`,
          "success",
        );
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Failed to update status",
          "error",
        );
      }
    },
    [toast],
  );

  const handleRoleChange = useCallback(
    async (userId: string, role: string) => {
      try {
        const updated = await updateUserRole(userId, role);
        setUsers((prev) =>
          prev.map((x) => (x.id === updated.id ? updated : x)),
        );
        toast(`Role updated to ${role}`, "success");
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Failed to update role",
          "error",
        );
      }
    },
    [toast],
  );

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      try {
        await deleteUser(userId);
        setUsers((prev) => prev.filter((x) => x.id !== userId));
        toast("User deleted", "success");
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Failed to delete user",
          "error",
        );
      }
    },
    [toast],
  );

  // ── Assignment actions ─────────────────────────────────────────────────────
  const handleAssign = useCallback(
    async (patientId: string, doctorId: string) => {
      try {
        const newAssignment = await createAssignment({
          patient_id: patientId,
          doctor_id: doctorId,
        });
        // Optimistic insert — no need to re-fetch all 3 endpoints
        setAssignments((prev) => [newAssignment, ...prev]);
        toast("Patient assigned to doctor successfully", "success");
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create assignment";
        toast(message, "error");
        // Rethrow so the dialog knows to stay open
        throw err;
      }
    },
    [toast],
  );

  const handleDeleteAssignment = useCallback(
    async (id: string) => {
      try {
        await deleteAssignment(id);
        toast("Assignment removed", "success");
        setAssignments((prev) => prev.filter((a) => a.id !== id));
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Failed to remove assignment",
          "error",
        );
      }
    },
    [toast],
  );

  const handleEditAssignment = useCallback(
    async (assignmentId: string, newDoctorProfileId: string) => {
      const updated = await updateAssignment(assignmentId, {
        doctor_id: newDoctorProfileId,
      });
      setAssignments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
      toast("Assignment updated successfully", "success");
    },
    [toast],
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
              Loading admin console…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") return null;

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        user={session.user}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={handleLogout}
        totalUsers={users.length}
        className="h-svh sticky top-0"
      />

      {/* Main content */}
      <SidebarInset className="h-svh overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-6 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground/60 font-medium">
              Admin Console
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-semibold text-foreground">
              {VIEW_LABELS[activeView]}
            </span>
          </div>

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

        {/* Chat — always mounted, hidden via CSS when not active */}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-hidden",
            activeView === "chat" ? "flex" : "hidden",
          )}
        >
          <SecureChat />
        </div>

        {/* All other views — scrollable */}
        <main
          className={cn(
            "flex-1 min-h-0 overflow-y-auto px-6 py-8 sm:px-8 lg:px-10",
            activeView === "chat" ? "hidden" : "block",
          )}
        >
          <div className="mx-auto max-w-5xl w-full">
            {activeView === "overview" && (
              <OverviewView stats={stats} user={session.user} />
            )}
            {activeView === "users" && (
              <UsersView
                users={users}
                onToggleStatus={handleToggleStatus}
                onRoleChange={handleRoleChange}
                onDeleteUser={handleDeleteUser}
              />
            )}
            {activeView === "assignments" && (
              <AssignmentsView
                assignments={assignments}
                assignableUsers={assignableUsers}
                onAssign={handleAssign}
                onEdit={handleEditAssignment}
                onDelete={handleDeleteAssignment}
              />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
