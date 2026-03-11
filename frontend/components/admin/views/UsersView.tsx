"use client";

import { useState, useMemo } from "react";
import { Power, PowerOff, Trash2, ChevronDown } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { AdminUser } from "@/lib/api-client";

interface UsersViewProps {
  users: AdminUser[];
  onToggleStatus: (user: AdminUser) => void;
  onRoleChange: (userId: string, role: string) => void;
  onDeleteUser: (userId: string) => void;
}

const ROLES = ["PATIENT", "DOCTOR", "ADMIN"] as const;

const roleMeta: Record<string, { label: string; className: string }> = {
  PATIENT: {
    label: "Patient",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  DOCTOR: {
    label: "Doctor",
    className: "bg-secondary/10 text-secondary border-secondary/20",
  },
  ADMIN: {
    label: "Admin",
    className: "bg-accent/10 text-accent border-accent/20",
  },
};

function getInitials(name: string, email: string): string {
  const source = name || email;
  return source
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UsersView({
  users,
  onToggleStatus,
  onRoleChange,
  onDeleteUser,
}: UsersViewProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const pagination = usePagination(users, { pageSize: 15 });

  const handleDeleteClick = (userId: string) => {
    if (confirmDeleteId === userId) {
      onDeleteUser(userId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(userId);
      // auto-cancel after 3 s
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const pageUsers = pagination.pageItems;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length} registered account{users.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header row */}
        <div className="hidden md:grid grid-cols-[1fr_120px_100px_120px_100px] gap-4 px-5 py-3 border-b border-border bg-muted/40">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            User
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Role
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Status
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Joined
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground text-right">
            Actions
          </span>
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No users found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pageUsers.map((u) => {
              const initials = getInitials(u.name, u.email);
              const role = roleMeta[u.role] ?? {
                label: u.role,
                className: "bg-muted text-muted-foreground border-border",
              };
              const isConfirmingDelete = confirmDeleteId === u.id;

              return (
                <div
                  key={u.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_120px_100px] gap-3 md:gap-4 items-center px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  {/* User */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-8 shrink-0 rounded-md">
                      <AvatarFallback className="rounded-md bg-muted text-muted-foreground text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  {/* Role — inline dropdown */}
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                        >
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-semibold cursor-pointer hover:opacity-80 transition-opacity pr-1 gap-1 ${role.className}`}
                          >
                            {role.label}
                            <ChevronDown className="size-3 opacity-60" />
                          </Badge>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-32">
                        {ROLES.map((r) => (
                          <DropdownMenuItem
                            key={r}
                            disabled={r === u.role}
                            onClick={() => onRoleChange(u.id, r)}
                            className="text-sm"
                          >
                            <span
                              className={`mr-2 size-2 rounded-full inline-block ${
                                r === "PATIENT"
                                  ? "bg-primary"
                                  : r === "DOCTOR"
                                    ? "bg-secondary"
                                    : "bg-accent"
                              }`}
                            />
                            {roleMeta[r].label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Status */}
                  <div>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold ${
                        u.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Joined */}
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {new Date(u.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-0.5">
                    {/* Toggle status */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`size-8 transition-colors ${
                        u.is_active
                          ? "text-amber-500 hover:bg-amber-500/10 hover:text-amber-600"
                          : "text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
                      }`}
                      title={u.is_active ? "Deactivate user" : "Activate user"}
                      onClick={() => onToggleStatus(u)}
                    >
                      {u.is_active ? (
                        <PowerOff className="size-3.5" />
                      ) : (
                        <Power className="size-3.5" />
                      )}
                    </Button>

                    {/* Delete — requires double-click to confirm */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`size-8 transition-colors ${
                        isConfirmingDelete
                          ? "bg-destructive/15 text-destructive hover:bg-destructive/20"
                          : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      }`}
                      title={
                        isConfirmingDelete
                          ? "Click again to confirm"
                          : "Delete user"
                      }
                      onClick={() => handleDeleteClick(u.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Pagination
        className="px-5 pb-4"
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
    </div>
  );
}
