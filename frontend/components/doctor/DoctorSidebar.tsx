"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  Calendar,
  MessageSquare,
  LayoutDashboard,
  Stethoscope,
  LogOut,
  ChevronsUpDown,
  Users,
  ArrowRightLeft,
  UsersRound,
  UserCircle,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { UserPublic } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DoctorView =
  | "overview"
  | "patients"
  | "appointments"
  | "referrals"
  | "care-teams"
  | "profile"
  | "chat";

interface NavItem {
  id: DoctorView;
  label: string;
  icon: React.ElementType;
  description: string;
}

// ─── Nav config (profile removed — accessible via footer dropdown) ────────────

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Practice summary",
  },
  {
    id: "patients",
    label: "My Patients",
    icon: Users,
    description: "Manage your patients",
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: Calendar,
    description: "Schedule & manage",
  },
  {
    id: "referrals",
    label: "Referrals",
    icon: ArrowRightLeft,
    description: "Sent & received",
  },
  {
    id: "care-teams",
    label: "Care Teams",
    icon: UsersRound,
    description: "Collaborative care",
  },
  {
    id: "chat",
    label: "Secure Chat",
    icon: MessageSquare,
    description: "Messages",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DoctorSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: UserPublic;
  activeView: DoctorView;
  onNavigate: (view: DoctorView) => void;
  onLogout: () => void;
  upcomingCount: number;
  pendingReferrals: number;
}

// ─── Theme toggle — pill slider ───────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-widest select-none">
        Theme
      </span>

      {/*
        Pill track: Dark label · thumb · Light label
        Clicking either label or the whole pill snaps to that mode.
      */}
      <button
        role="switch"
        aria-checked={!isDark}
        aria-label="Toggle theme"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "relative flex h-7 w-30 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isDark
            ? "border-white/10 bg-[hsl(var(--sidebar-background))]"
            : "border-black/10 bg-[hsl(var(--sidebar-background))]",
        )}
      >
        {/* Sliding thumb — fills half the track */}
        <span
          className={cn(
            "absolute top-0.5 h-[calc(100%-4px)] w-[calc(50%-2px)] rounded-full shadow-sm transition-all duration-300 ease-in-out",
            isDark
              ? "left-0.5 bg-sidebar-foreground/15"
              : "left-[calc(50%+1px)] bg-sidebar-foreground/15",
          )}
          aria-hidden
        />

        {/* Dark label */}
        <span
          onClick={(e) => {
            e.stopPropagation();
            setTheme("dark");
          }}
          className={cn(
            "relative z-10 flex flex-1 cursor-pointer select-none items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-200",
            isDark ? "text-sidebar-foreground" : "text-sidebar-foreground/35",
          )}
        >
          {/* Crescent moon dot */}
          <span
            className={cn(
              "size-1.5 rounded-full transition-colors duration-200",
              isDark ? "bg-sidebar-foreground" : "bg-sidebar-foreground/30",
            )}
            aria-hidden
          />
          Dark
        </span>

        {/* Light label */}
        <span
          onClick={(e) => {
            e.stopPropagation();
            setTheme("light");
          }}
          className={cn(
            "relative z-10 flex flex-1 cursor-pointer select-none items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-200",
            !isDark ? "text-sidebar-foreground" : "text-sidebar-foreground/35",
          )}
        >
          {/* Sun dot */}
          <span
            className={cn(
              "size-1.5 rounded-full transition-colors duration-200",
              !isDark ? "bg-amber-400" : "bg-sidebar-foreground/30",
            )}
            aria-hidden
          />
          Light
        </span>
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DoctorSidebar({
  user,
  activeView,
  onNavigate,
  onLogout,
  upcomingCount,
  pendingReferrals,
  ...props
}: DoctorSidebarProps) {
  const initials = getInitials(user.name || "D");

  return (
    <Sidebar collapsible="none" {...props}>
      {/* ── Brand header ─────────────────────────────────────────────── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="cursor-default hover:bg-transparent active:bg-transparent focus-visible:ring-0 pointer-events-none"
            >
              {/* Logo mark */}
              <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Activity className="size-5" />
              </div>

              {/* Word-mark */}
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold tracking-tight text-base">
                  Med<span className="text-primary">Intel</span>
                </span>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                  Doctor Portal
                </span>
              </div>

              {/* Live indicator */}
              <span className="ml-auto flex size-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_2px_rgba(52,211,153,0.45)]" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* ── Main navigation ──────────────────────────────────────────── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                const showApptBadge =
                  item.id === "appointments" && upcomingCount > 0;
                const showReferralBadge =
                  item.id === "referrals" && pendingReferrals > 0;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      size="default"
                      isActive={isActive}
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        "h-11 gap-3 rounded-md text-sm transition-all duration-200 ease-out",
                        isActive
                          ? "bg-primary/15 text-primary font-medium border-l-2 border-primary rounded-l-none shadow-sm hover:bg-primary/20 hover:text-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-colors duration-200",
                          isActive
                            ? "text-primary"
                            : "text-sidebar-foreground/80",
                        )}
                      />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>

                    {showApptBadge && (
                      <SidebarMenuBadge>{upcomingCount}</SidebarMenuBadge>
                    )}
                    {showReferralBadge && (
                      <SidebarMenuBadge>{pendingReferrals}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer: theme toggle + user menu ─────────────────────────── */}
      <SidebarSeparator />
      <SidebarFooter className="gap-1.5 pb-4 pt-2">
        {/* Theme pill */}
        <ThemeToggle />

        {/* User / logout */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-12"
                >
                  <Avatar className="size-9 shrink-0 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-sm font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>

                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                {/* Identity block */}
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 shrink-0 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => onNavigate("profile")}>
                  <UserCircle className="mr-2 size-4" />
                  My Profile
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
