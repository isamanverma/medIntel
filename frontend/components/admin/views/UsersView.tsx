"use client";

import { useState, useMemo } from "react";
import { Power, PowerOff, Trash2, ChevronDown, Search, X } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "ALL" | "PATIENT" | "DOCTOR" | "ADMIN"
  >("ALL");

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== "ALL") list = list.filter((u) => u.role === roleFilter);
    const term = searchQuery.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term),
      );
    }
    return list;
  }, [users, searchQuery, roleFilter]);

  const roleCounts = useMemo(
    () => ({
      ALL: users.length,
      PATIENT: users.filter((u) => u.role === "PATIENT").length,
      DOCTOR: users.filter((u) => u.role === "DOCTOR").length,
      ADMIN: users.filter((u) => u.role === "ADMIN").length,
    }),
    [users],
  );

  const pagination = usePagination(filtered, { pageSize: 15 });

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
  };

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
  const isFiltered = searchQuery.trim() !== "" || roleFilter !== "ALL";

  return (
    <div className="space-y-5">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Users</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isFiltered
              ? `${filtered.length} of ${users.length} account${users.length !== 1 ? "s" : ""}`
              : `${users.length} registered account${users.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {isFiltered && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearFilters}
            className="gap-1.5 text-muted-foreground"
          >
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Role filter pills */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", "PATIENT", "DOCTOR", "ADMIN"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors
              ${
                roleFilter === r
                  ? r === "ALL"
                    ? "bg-foreground text-background border-foreground"
                    : r === "PATIENT"
                      ? "bg-primary text-primary-foreground border-primary"
                      : r === "DOCTOR"
                        ? "bg-secondary text-secondary-foreground border-secondary"
                        : "bg-accent text-accent-foreground border-accent"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              }`}
          >
            {r === "ALL" ? "All" : roleMeta[r].label}
            <span className="tabular-nums">{roleCounts[r]}</span>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9 pr-9 h-9 text-sm"
          placeholder="Search by name or email…"
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

        {pageUsers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Search className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isFiltered ? "No users match your filters" : "No users found"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isFiltered
                  ? "Try a different name, email, or role."
                  : "No accounts have been registered yet."}
              </p>
            </div>
            {isFiltered && (
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
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
    </div>
  );
}
