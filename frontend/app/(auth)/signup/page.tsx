"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Eye,
  EyeOff,
  Stethoscope,
  HeartPulse,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/providers/SessionProvider";

type Role = "doctor" | "patient" | "admin";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as Role | null;
  const { refreshSession } = useAuth();

  const [role, setRole] = useState<Role>(roleParam || "patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (roleParam && ["doctor", "patient", "admin"].includes(roleParam)) {
      setRole(roleParam);
    }
  }, [roleParam]);

  const getDashboard = (r: Role) => {
    switch (r) {
      case "doctor":
        return "/doctor/dashboard";
      case "patient":
        return "/patient/dashboard";
      case "admin":
        return "/admin/dashboard";
    }
  };

  const passwordChecks = {
    length: password.length >= 6,
    match: password.length > 0 && password === confirmPassword,
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!passwordChecks.length) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!passwordChecks.match) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      // Call the Next.js BFF proxy — it forwards to FastAPI, sets the
      // HttpOnly access_token cookie on success, and returns UserPublic.
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          password,
          role: role.toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // The BFF route already set the HttpOnly cookie. Refresh the
      // AuthProvider session so the React context picks up the new user
      // immediately (no full page reload needed).
      await refreshSession();

      // Navigate to the role-appropriate dashboard
      router.push(getDashboard(role));
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const roleConfig = {
    patient: {
      icon: HeartPulse,
      label: "Patient",
      color: "text-primary",
      bg: "bg-primary/10",
      description: "Track your health, access AI insights & manage records",
    },
    doctor: {
      icon: Stethoscope,
      label: "Doctor",
      color: "text-chart-2",
      bg: "bg-chart-2/10",
      description: "Manage patients, clinical workflows & diagnostics",
    },
    admin: {
      icon: Shield,
      label: "Admin",
      color: "text-chart-4",
      bg: "bg-chart-4/10",
      description: "System administration & platform management",
    },
  };

  const currentRole = roleConfig[role];
  const CurrentIcon = currentRole.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Med<span className="text-primary">Intel</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-card-foreground">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Join MedIntel and get started today
            </p>
          </div>

          {/* Role toggle */}
          <div className="mb-6 flex rounded-xl bg-muted p-1">
            {(["patient", "doctor", "admin"] as Role[]).map((r) => {
              const config = roleConfig[r];
              const Icon = config.icon;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setError("");
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium transition-all ${
                    role === r
                      ? "bg-card shadow-sm " + config.color
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active role badge */}
          <div
            className={`mb-6 flex items-center gap-2 rounded-lg ${currentRole.bg} px-3 py-2.5`}
          >
            <CurrentIcon
              className={`h-4 w-4 flex-shrink-0 ${currentRole.color}`}
            />
            <p className="text-xs text-muted-foreground">
              {currentRole.description}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Signup form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  role === "doctor" ? "Dr. Jane Smith" : "Jane Smith"
                }
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password strength indicators */}
            {password.length > 0 && (
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.length ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-chart-2 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span
                    className={
                      passwordChecks.length
                        ? "text-chart-2"
                        : "text-muted-foreground"
                    }
                  >
                    At least 6 characters
                  </span>
                </div>
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    {passwordChecks.match ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-chart-2 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                    )}
                    <span
                      className={
                        passwordChecks.match
                          ? "text-chart-2"
                          : "text-destructive"
                      }
                    >
                      Passwords match
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                `Create ${currentRole.label} Account`
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={`/login?role=${role}`}
              className="font-semibold text-primary hover:opacity-80 transition-opacity"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
