"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/providers/SessionProvider";
import Link from "next/link";
import {
  Activity,
  LogOut,
  User,
  ChevronDown,
  Stethoscope,
  HeartPulse,
} from "lucide-react";

type RoleTab = "doctor" | "patient";

export default function Navbar() {
  const { session, status, logout } = useAuth();
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState<RoleTab>("patient");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const authDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        authDropdownRef.current &&
        !authDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAuthDropdown(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isLoggedIn = status === "authenticated" && !!session?.user;

  const getDashboardLink = () => {
    if (!session?.user) return "/";
    const role = session.user.role;
    switch (role) {
      case "DOCTOR":
        return "/doctor/dashboard";
      case "PATIENT":
        return "/patient/dashboard";
      case "ADMIN":
        return "/admin/dashboard";
      default:
        return "/";
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition-transform group-hover:scale-105">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Med<span className="text-primary">Intel</span>
          </span>
        </Link>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            /* Logged-in user menu */
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {session.user.name}
                </span>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary capitalize">
                  {session.user.role.toLowerCase()}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1">
                  <div className="border-b border-border px-3 py-2.5 mb-1">
                    <p className="text-sm font-semibold text-card-foreground truncate">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {session.user.email}
                    </p>
                  </div>
                  <Link
                    href={getDashboardLink()}
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-card-foreground hover:bg-muted transition-colors"
                  >
                    <Activity className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      await logout();
                      window.location.href = "/";
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Auth toggle dropdown for Doctor / Patient */
            <div className="relative" ref={authDropdownRef}>
              <button
                onClick={() => setShowAuthDropdown(!showAuthDropdown)}
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
              >
                Get Started
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAuthDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showAuthDropdown && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-xl animate-in fade-in slide-in-from-top-1">
                  {/* Role toggle tabs */}
                  <div className="mb-4 flex rounded-lg bg-muted p-1">
                    <button
                      onClick={() => setActiveRoleTab("patient")}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        activeRoleTab === "patient"
                          ? "bg-card text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <HeartPulse className="h-4 w-4" />
                      Patient
                    </button>
                    <button
                      onClick={() => setActiveRoleTab("doctor")}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        activeRoleTab === "doctor"
                          ? "bg-card text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Stethoscope className="h-4 w-4" />
                      Doctor
                    </button>
                  </div>

                  {/* Description */}
                  <p className="mb-4 text-center text-xs text-muted-foreground">
                    {activeRoleTab === "patient"
                      ? "Access your health records & AI insights"
                      : "Manage patients & clinical workflows"}
                  </p>

                  {/* Login & Signup buttons */}
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/login?role=${activeRoleTab}`}
                      onClick={() => setShowAuthDropdown(false)}
                      className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                    >
                      Log In as{" "}
                      {activeRoleTab === "patient" ? "Patient" : "Doctor"}
                    </Link>
                    <Link
                      href={`/signup?role=${activeRoleTab}`}
                      onClick={() => setShowAuthDropdown(false)}
                      className="flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      Create Account
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
