"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import {
  Activity,
  LogOut,
  Shield,
  Users,
  Calendar,
  FileText,
  BarChart3,
  Loader2,
  Link2,
  Trash2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import {
  getAdminStats,
  getAdminUsers,
  getAssignments,
  createAssignment,
  deleteAssignment,
} from "@/lib/api-client";
import type { AdminStats, AdminAssignment } from "@/lib/types";
import type { AdminUser } from "@/lib/api-client";

export default function AdminDashboard() {
  const { session, status, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignPatientId, setAssignPatientId] = useState("");
  const [assignDoctorId, setAssignDoctorId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes, assignRes] = await Promise.allSettled([
        getAdminStats(),
        getAdminUsers(),
        getAssignments(),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value);
      if (assignRes.status === "fulfilled") setAssignments(assignRes.value);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAssign = async () => {
    if (!assignPatientId || !assignDoctorId) return;
    setAssigning(true);
    try {
      await createAssignment({ patient_id: assignPatientId, doctor_id: assignDoctorId });
      toast("Patient assigned to doctor successfully", "success");
      setShowAssignModal(false);
      setAssignPatientId("");
      setAssignDoctorId("");
      await fetchData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Assignment failed", "error");
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await deleteAssignment(id);
      toast("Assignment removed", "success");
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to remove assignment", "error");
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?role=admin");
    if (status === "authenticated" && session?.user?.role !== "ADMIN")
      router.push(`/${session?.user?.role.toLowerCase()}/dashboard`);
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") fetchData();
  }, [status, session, fetchData]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") return null;

  const statCards = [
    { label: "Total Users", value: stats?.total_users ?? 0, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Patients", value: stats?.total_patients ?? 0, icon: Users, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "Doctors", value: stats?.total_doctors ?? 0, icon: Users, color: "text-accent", bg: "bg-accent/10" },
    { label: "Appointments", value: stats?.total_appointments ?? 0, icon: Calendar, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  const secondaryStats = [
    { label: "Medical Reports", value: stats?.total_reports ?? 0, icon: FileText },
    { label: "Treatment Plans", value: stats?.total_treatment_plans ?? 0, icon: BarChart3 },
    { label: "Admin Users", value: stats?.total_admins ?? 0, icon: Shield },
  ];

  const roleColors: Record<string, string> = {
    PATIENT: "bg-primary/10 text-primary",
    DOCTOR: "bg-secondary/10 text-secondary",
    ADMIN: "bg-accent/10 text-accent",
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">Med<span className="text-primary">Intel</span></span>
            </Link>
            <span className="hidden sm:inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              <Shield className="mr-1 h-3 w-3" /> Admin
            </span>
          </div>
          <button onClick={async () => { await logout(); router.push("/"); }}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome */}
        <div className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-accent/5 via-card to-card p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-accent/10">
              <Shield className="h-7 w-7 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-card-foreground sm:text-3xl">Welcome, {session.user.name || "Admin"}</h1>
              <p className="mt-1 text-muted-foreground">System administration dashboard — live platform statistics.</p>
            </div>
          </div>
        </div>

        {/* Primary Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-card-foreground">{stat.value.toLocaleString()}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* User Management Table */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-card-foreground">User Management</h2>
              </div>
              <span className="text-sm text-muted-foreground">{users.length} users</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">User</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Role</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-card-foreground">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[u.role] || "bg-muted text-muted-foreground"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${u.is_active ? "bg-secondary/10 text-secondary" : "bg-destructive/10 text-destructive"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">Platform Overview</h2>
            <div className="space-y-4">
              {secondaryStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-card-foreground">{stat.label}</span>
                    </div>
                    <span className="text-lg font-bold text-card-foreground">{stat.value.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Patient-Doctor Assignments */}
        <div className="mt-8 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-card-foreground">Patient-Doctor Assignments</h2>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Assign
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Patient ID</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Doctor ID</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Created</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assignments.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No assignments yet. Click "Assign" to create one.</td></tr>
                ) : assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-card-foreground">{a.patient_id.slice(0, 8)}…</td>
                    <td className="px-6 py-3 font-mono text-xs text-card-foreground">{a.doctor_id.slice(0, 8)}…</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${a.status === "ACTIVE" ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove assignment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assign Modal */}
        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Patient to Doctor">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Patient</label>
              <select
                value={assignPatientId}
                onChange={(e) => setAssignPatientId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select a patient…</option>
                {users.filter((u) => u.role === "PATIENT").map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Doctor</label>
              <select
                value={assignDoctorId}
                onChange={(e) => setAssignDoctorId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select a doctor…</option>
                {users.filter((u) => u.role === "DOCTOR").map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAssign}
              disabled={assigning || !assignPatientId || !assignDoctorId}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {assigning ? "Assigning…" : "Create Assignment"}
            </button>
          </div>
        </Modal>
      </main>
    </div>
  );
}
