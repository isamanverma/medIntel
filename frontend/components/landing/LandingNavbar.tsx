"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/SessionProvider";
import { useTheme } from "next-themes";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  LogOut,
  User,
  ChevronDown,
  Stethoscope,
  HeartPulse,
  LayoutDashboard,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

type RoleTab = "doctor" | "patient";

export default function LandingNavbar() {
  const { session, status, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState<RoleTab>("patient");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const authDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // Only fire when not typing in an input/textarea
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "d" || e.key === "D") {
        toggleTheme();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleTheme]);

  const isLoggedIn = status === "authenticated" && !!session?.user;

  const getDashboardLink = () => {
    if (!session?.user) return "/";
    switch (session.user.role) {
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
    <motion.nav
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-background/90 shadow-sm backdrop-blur-xl"
          : "border-b border-transparent bg-background/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/30 transition-transform duration-200 group-hover:scale-105">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            Med<span className="text-primary">Intel</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {["Capabilities", "How It Works", "Security"].map((item) => (
            <Button key={item} variant="ghost" size="sm" asChild>
              <a href={`#${item.toLowerCase().replace(/ /g, "-")}`}>{item}</a>
            </Button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme (D)"
            title="Toggle theme (D)"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          {isLoggedIn ? (
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="gap-2 rounded-full pl-2"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <span className="hidden max-w-28 truncate sm:block">
                  {session.user.name}
                </span>
                <Badge
                  variant="secondary"
                  className="hidden sm:inline-flex capitalize"
                >
                  {session.user.role.toLowerCase()}
                </Badge>
                <ChevronDown
                  className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`}
                />
              </Button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl border border-border bg-card p-1 shadow-xl"
                  >
                    <div className="px-3 py-2">
                      <p className="truncate text-xs font-semibold text-card-foreground">
                        {session.user.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                    <Separator className="my-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2"
                      asChild
                    >
                      <Link
                        href={getDashboardLink()}
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                        Dashboard
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={async () => {
                        await logout();
                        window.location.href = "/";
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="relative" ref={authDropdownRef}>
              <Button
                size="sm"
                onClick={() => setShowAuthDropdown(!showAuthDropdown)}
                className="gap-1.5 rounded-full"
              >
                Get Started
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${showAuthDropdown ? "rotate-180" : ""}`}
                />
              </Button>

              <AnimatePresence>
                {showAuthDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-68 origin-top-right rounded-2xl border border-border bg-card p-4 shadow-xl"
                  >
                    {/* Role toggle */}
                    <div className="mb-4 flex rounded-lg bg-muted p-0.5">
                      {(["patient", "doctor"] as RoleTab[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setActiveRoleTab(role)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                            activeRoleTab === role
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {role === "patient" ? (
                            <HeartPulse className="h-3.5 w-3.5" />
                          ) : (
                            <Stethoscope className="h-3.5 w-3.5" />
                          )}
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      ))}
                    </div>

                    <p className="mb-4 text-center text-xs text-muted-foreground">
                      {activeRoleTab === "patient"
                        ? "Access your health records & AI insights"
                        : "Manage patients & clinical workflows"}
                    </p>

                    <div className="flex flex-col gap-2">
                      <Button size="lg" className="w-full rounded-xl" asChild>
                        <Link
                          href={`/login?role=${activeRoleTab}`}
                          onClick={() => setShowAuthDropdown(false)}
                        >
                          Log in as{" "}
                          {activeRoleTab === "patient" ? "Patient" : "Doctor"}
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full rounded-xl"
                        asChild
                      >
                        <Link
                          href={`/signup?role=${activeRoleTab}`}
                          onClick={() => setShowAuthDropdown(false)}
                        >
                          Create Account
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
