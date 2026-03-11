"use client";

import { useState, useMemo, useCallback } from "react";
import { usePagination } from "@/hooks/use-pagination";
import { Pagination } from "@/components/ui/Pagination";
import {
  Plus,
  Trash2,
  Link2,
  Search,
  Pencil,
  ArrowRight,
  Stethoscope,
  User,
  X,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type {
  AdminAssignment,
  AssignableUsersResponse,
  AssignablePatient,
  AssignableDoctor,
} from "@/lib/types";

interface AssignmentsViewProps {
  assignments: AdminAssignment[];
  assignableUsers: AssignableUsersResponse;
  onAssign: (
    patientProfileId: string,
    doctorProfileId: string,
  ) => Promise<void>;
  onEdit: (assignmentId: string, newDoctorProfileId: string) => Promise<void>;
  onDelete: (id: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function formatFullDate(iso: string): string {
  const date = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Deterministic color from a string so the same person always gets the same color
const AVATAR_COLORS = [
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  "bg-pink-500/15 text-pink-600 dark:text-pink-400",
];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({
  name,
  seed,
  size = "md",
}: {
  name: string;
  seed: string;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs";
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold shrink-0 ${avatarColor(seed)}`}
    >
      {getInitials(name) || "?"}
    </div>
  );
}

function PersonCell({
  name,
  email,
  seed,
  sub,
}: {
  name: string;
  email: string;
  seed: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Avatar name={name} seed={seed} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">
          {name || "—"}
        </p>
        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
          {email}
        </p>
        {sub && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-primary/70 bg-primary/8 border border-primary/15 rounded-full px-1.5 py-px">
            <Stethoscope className="size-2.5" />
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Searchable person picker used in both dialogs ─────────────────────────────

function PersonPicker<
  T extends { profile_id: string; name: string; email: string },
>({
  label,
  icon: Icon,
  items,
  value,
  onChange,
  renderSub,
  emptyText,
  disabledIds,
}: {
  label: string;
  icon: React.ElementType;
  items: T[];
  value: string;
  onChange: (id: string) => void;
  renderSub?: (item: T) => string | undefined;
  emptyText: string;
  disabledIds?: Set<string>;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        i.email.toLowerCase().includes(term) ||
        (renderSub?.(i) ?? "").toLowerCase().includes(term),
    );
  }, [items, q, renderSub]);

  const selected = items.find((i) => i.profile_id === value);

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Icon className="size-3.5" />
        {label}
      </Label>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8 h-8 text-xs"
          placeholder={`Search ${label.toLowerCase()}…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setQ("")}
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* List */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="max-h-48 overflow-y-auto divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {emptyText}
            </p>
          ) : (
            filtered.map((item) => {
              const isSelected = item.profile_id === value;
              const isDisabled = disabledIds?.has(item.profile_id);
              const sub = renderSub?.(item);
              return (
                <button
                  key={item.profile_id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onChange(item.profile_id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors
                    ${isSelected ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/50"}
                    ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <Avatar name={item.name} seed={item.profile_id} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {item.email}
                    </p>
                    {sub && (
                      <p className="text-[10px] text-primary/70 truncate">
                        {sub}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  )}
                  {isDisabled && (
                    <span className="text-[9px] text-muted-foreground bg-muted rounded px-1 py-0.5 shrink-0">
                      Linked
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected preview */}
      {selected && (
        <p className="text-[11px] text-muted-foreground">
          Selected:{" "}
          <span className="font-medium text-foreground">{selected.name}</span>
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AssignmentsView({
  assignments,
  assignableUsers,
  onAssign,
  onEdit,
  onDelete,
}: AssignmentsViewProps) {
  // ── search/filter ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");

  // ── assign dialog ─────────────────────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPatientId, setAssignPatientId] = useState("");
  const [assignDoctorId, setAssignDoctorId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // ── edit dialog ───────────────────────────────────────────────────────────
  const [editAssignment, setEditAssignment] = useState<AdminAssignment | null>(
    null,
  );
  const [editDoctorId, setEditDoctorId] = useState("");
  const [editing, setEditing] = useState(false);

  // ── delete confirm ────────────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = assignments;
    if (statusFilter !== "ALL")
      list = list.filter((a) => a.status === statusFilter);
    const term = searchQuery.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (a) =>
          a.patient_name?.toLowerCase().includes(term) ||
          a.patient_email?.toLowerCase().includes(term) ||
          a.doctor_name?.toLowerCase().includes(term) ||
          a.doctor_email?.toLowerCase().includes(term) ||
          a.doctor_specialization?.toLowerCase().includes(term),
      );
    }
    return list;
  }, [assignments, searchQuery, statusFilter]);

  const pagination = usePagination(filtered, { pageSize: 10 });

  // ── already-linked patient IDs for the assign dialog ─────────────────────
  const linkedPatientIds = useMemo(
    () =>
      new Set(
        assignments
          .filter((a) => a.status === "ACTIVE")
          .map((a) => a.patient_id),
      ),
    [assignments],
  );

  // ── already-linked doctor IDs for a given patient (edit dialog) ──────────
  const linkedDoctorIdsForPatient = useMemo(() => {
    if (!editAssignment) return new Set<string>();
    return new Set(
      assignments
        .filter(
          (a) =>
            a.status === "ACTIVE" &&
            a.patient_id === editAssignment.patient_id &&
            a.id !== editAssignment.id,
        )
        .map((a) => a.doctor_id),
    );
  }, [assignments, editAssignment]);

  // ── counts ────────────────────────────────────────────────────────────────
  const activeCount = useMemo(
    () => assignments.filter((a) => a.status === "ACTIVE").length,
    [assignments],
  );
  const inactiveCount = useMemo(
    () => assignments.filter((a) => a.status === "INACTIVE").length,
    [assignments],
  );

  // ── handlers ──────────────────────────────────────────────────────────────
  const openAssignDialog = useCallback(() => {
    setAssignPatientId("");
    setAssignDoctorId("");
    setAssignOpen(true);
  }, []);

  const handleAssignSubmit = useCallback(async () => {
    if (!assignPatientId || !assignDoctorId) return;
    setAssigning(true);
    try {
      await onAssign(assignPatientId, assignDoctorId);
      setAssignOpen(false);
    } finally {
      setAssigning(false);
    }
  }, [assignPatientId, assignDoctorId, onAssign]);

  const openEditDialog = useCallback((a: AdminAssignment) => {
    setEditAssignment(a);
    setEditDoctorId(a.doctor_id);
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (!editAssignment || !editDoctorId) return;
    setEditing(true);
    try {
      await onEdit(editAssignment.id, editDoctorId);
      setEditAssignment(null);
    } finally {
      setEditing(false);
    }
  }, [editAssignment, editDoctorId, onEdit]);

  const handleDeleteClick = useCallback(
    (id: string) => {
      if (confirmDeleteId === id) {
        onDelete(id);
        setConfirmDeleteId(null);
      } else {
        setConfirmDeleteId(id);
        setTimeout(() => setConfirmDeleteId(null), 3000);
      }
    },
    [confirmDeleteId, onDelete],
  );

  return (
    <div className="space-y-5">
      {/* ── Page heading ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Assignments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage patient ↔ doctor care relationships
          </p>
        </div>
        <Button
          size="sm"
          onClick={openAssignDialog}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          New Assignment
        </Button>
      </div>

      {/* ── Stat pills ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors
            ${
              statusFilter === "ALL"
                ? "bg-foreground text-background border-foreground"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            }`}
        >
          All
          <span className="tabular-nums">{assignments.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("ACTIVE")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors
            ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
            }`}
        >
          <span className="size-1.5 rounded-full bg-current" />
          Active
          <span className="tabular-nums">{activeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("INACTIVE")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors
            ${
              statusFilter === "INACTIVE"
                ? "bg-muted text-foreground border-border"
                : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60"
            }`}
        >
          <span className="size-1.5 rounded-full bg-current opacity-50" />
          Inactive
          <span className="tabular-nums">{inactiveCount}</span>
        </button>
      </div>

      {/* ── Search bar ────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9 pr-9 h-9 text-sm"
          placeholder="Search by patient, doctor, or specialization…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchQuery("")}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Column headers — hidden on mobile */}
        <div className="hidden md:grid grid-cols-[1fr_24px_1fr_96px_100px_88px] gap-3 px-5 py-2.5 border-b border-border bg-muted/30">
          {["Patient", "", "Doctor", "Status", "Assigned", ""].map((h, i) => (
            <span
              key={i}
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Empty state */}
        {pagination.pageItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Link2 className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {searchQuery || statusFilter !== "ALL"
                  ? "No assignments match your filters"
                  : "No assignments yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try adjusting your search or filter."
                  : "Use the New Assignment button to link a patient to a doctor."}
              </p>
            </div>
            {(searchQuery || statusFilter !== "ALL") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pagination.pageItems.map((a) => {
              const isConfirming = confirmDeleteId === a.id;
              const isActive = a.status === "ACTIVE";

              return (
                <div
                  key={a.id}
                  className="group grid grid-cols-1 md:grid-cols-[1fr_24px_1fr_96px_100px_88px] gap-3 items-center px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  {/* Patient */}
                  <PersonCell
                    name={a.patient_name ?? "Unknown Patient"}
                    email={a.patient_email ?? "—"}
                    seed={a.patient_id}
                  />

                  {/* Arrow connector */}
                  <div className="hidden md:flex items-center justify-center">
                    <ArrowRight className="size-3.5 text-muted-foreground/40" />
                  </div>

                  {/* Doctor */}
                  <PersonCell
                    name={a.doctor_name ?? "Unknown Doctor"}
                    email={a.doctor_email ?? "—"}
                    seed={a.doctor_id}
                    sub={a.doctor_specialization}
                  />

                  {/* Status */}
                  <div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold rounded-full ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {isActive ? (
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        "Inactive"
                      )}
                    </Badge>
                  </div>

                  {/* Date */}
                  <div className="hidden md:block">
                    <p className="text-xs font-medium text-foreground">
                      {formatRelativeDate(a.created_at)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatFullDate(a.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {/* Edit — only for active */}
                    {isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
                        title="Reassign doctor"
                        onClick={() => openEditDialog(a)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    )}

                    {/* Delete */}
                    {isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`size-7 transition-all ${
                          isConfirming
                            ? "bg-destructive/15 text-destructive hover:bg-destructive/20 opacity-100"
                            : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100"
                        }`}
                        title={
                          isConfirming
                            ? "Click again to confirm"
                            : "Remove assignment"
                        }
                        onClick={() => handleDeleteClick(a.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}

                    {/* Confirming label */}
                    {isConfirming && (
                      <span className="text-[10px] text-destructive font-medium whitespace-nowrap">
                        Confirm?
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
          onNext={pagination.next}
          onPrev={pagination.prev}
          onGoTo={pagination.goTo}
        />
      )}

      {/* ── New Assignment Dialog ─────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link2 className="size-3.5 text-primary" />
              </div>
              New Assignment
            </DialogTitle>
            <DialogDescription>
              Select a patient and a doctor to create a care relationship.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {/* Patient picker */}
            <PersonPicker<AssignablePatient>
              label="Patient"
              icon={User}
              items={assignableUsers.patients}
              value={assignPatientId}
              onChange={setAssignPatientId}
              emptyText="No patients found"
            />

            {/* Doctor picker */}
            <PersonPicker<AssignableDoctor>
              label="Doctor"
              icon={Stethoscope}
              items={assignableUsers.doctors}
              value={assignDoctorId}
              onChange={setAssignDoctorId}
              renderSub={(d) => d.specialization}
              emptyText="No doctors found"
            />
          </div>

          {/* Preview of the link being created */}
          {assignPatientId &&
            assignDoctorId &&
            (() => {
              const p = assignableUsers.patients.find(
                (x) => x.profile_id === assignPatientId,
              );
              const d = assignableUsers.doctors.find(
                (x) => x.profile_id === assignDoctorId,
              );
              if (!p || !d) return null;
              return (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                  <Avatar name={p.name} seed={p.profile_id} size="sm" />
                  <span className="text-xs font-medium text-foreground truncate">
                    {p.name}
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground shrink-0 mx-1" />
                  <Avatar name={d.name} seed={d.profile_id} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {d.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {d.specialization}
                    </p>
                  </div>
                </div>
              );
            })()}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignOpen(false)}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubmit}
              disabled={assigning || !assignPatientId || !assignDoctorId}
              className="gap-1.5"
            >
              {assigning ? (
                "Creating…"
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Create Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit / Reassign Dialog ────────────────────────────────── */}
      <Dialog
        open={!!editAssignment}
        onOpenChange={(o) => !o && setEditAssignment(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Pencil className="size-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              Reassign Doctor
            </DialogTitle>
            {editAssignment && (
              <DialogDescription>
                Changing the assigned doctor for{" "}
                <span className="font-medium text-foreground">
                  {editAssignment.patient_name}
                </span>
                .
              </DialogDescription>
            )}
          </DialogHeader>

          {editAssignment && (
            <>
              {/* Current assignment */}
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Current assignment
                </p>
                <div className="flex items-center gap-2">
                  <Avatar
                    name={editAssignment.patient_name ?? ""}
                    seed={editAssignment.patient_id}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {editAssignment.patient_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {editAssignment.patient_email}
                    </p>
                  </div>
                  <ArrowRight className="size-3.5 text-muted-foreground shrink-0 mx-1" />
                  <Avatar
                    name={editAssignment.doctor_name ?? ""}
                    seed={editAssignment.doctor_id}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {editAssignment.doctor_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {editAssignment.doctor_specialization}
                    </p>
                  </div>
                </div>
              </div>

              {/* New doctor picker */}
              <PersonPicker<AssignableDoctor>
                label="New Doctor"
                icon={Stethoscope}
                items={assignableUsers.doctors}
                value={editDoctorId}
                onChange={setEditDoctorId}
                renderSub={(d) => d.specialization}
                emptyText="No doctors found"
                disabledIds={linkedDoctorIdsForPatient}
              />

              {/* Preview of change */}
              {editDoctorId &&
                editDoctorId !== editAssignment.doctor_id &&
                (() => {
                  const newDoc = assignableUsers.doctors.find(
                    (d) => d.profile_id === editDoctorId,
                  );
                  if (!newDoc) return null;
                  return (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        New:
                      </span>
                      <Avatar
                        name={newDoc.name}
                        seed={newDoc.profile_id}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {newDoc.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {newDoc.specialization}
                        </p>
                      </div>
                    </div>
                  );
                })()}
            </>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditAssignment(null)}
              disabled={editing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={
                editing ||
                !editDoctorId ||
                editDoctorId === editAssignment?.doctor_id
              }
              className="gap-1.5"
            >
              {editing ? (
                "Saving…"
              ) : (
                <>
                  <Pencil className="size-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
