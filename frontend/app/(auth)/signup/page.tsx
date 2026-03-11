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
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/components/providers/SessionProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Role = "doctor" | "patient";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRoleParam = searchParams.get("role");
  const roleParam: Role | null =
    rawRoleParam === "doctor" || rawRoleParam === "patient"
      ? rawRoleParam
      : null;
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
    if (roleParam) {
      setRole(roleParam);
    }
  }, [roleParam]);

  const getDashboard = (r: Role) => {
    switch (r) {
      case "doctor":
        return "/doctor/dashboard";
      case "patient":
        return "/patient/dashboard";
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

      await refreshSession();
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
      pillBg: "bg-primary/10",
      pillIcon: "text-primary",
      description: "Track your health, access AI insights & manage records",
    },
    doctor: {
      icon: Stethoscope,
      label: "Doctor",
      color: "text-chart-2",
      pillBg: "bg-chart-2/10",
      pillIcon: "text-chart-2",
      description: "Manage patients, clinical workflows & diagnostics",
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
          {/* Heading */}
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
            {(["patient", "doctor"] as Role[]).map((r) => {
              const config = roleConfig[r];
              const Icon = config.icon;
              const isActive = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setError("");
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? `bg-card shadow-sm ${config.color}`
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>

          {/* Role description pill */}
          <div
            className={`mb-6 flex items-center gap-2 rounded-lg ${currentRole.pillBg} px-3 py-2.5`}
          >
            <CurrentIcon
              className={`h-4 w-4 shrink-0 ${currentRole.pillIcon}`}
            />
            <p className="text-xs text-muted-foreground">
              {currentRole.description}
            </p>
          </div>

          {/* Error */}
          {error && (
            <Alert
              variant="destructive"
              className="mb-4 border-destructive/30 bg-destructive/10 py-2.5"
            >
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-card-foreground"
              >
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  role === "doctor" ? "Dr. Jane Smith" : "Jane Smith"
                }
                className="h-10.5 rounded-lg border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-card-foreground"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10.5 rounded-lg border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-card-foreground"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="h-10.5 rounded-lg border-border bg-background px-3.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
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

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-card-foreground"
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="h-10.5 rounded-lg border-border bg-background px-3.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
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
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-chart-2" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-chart-2" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
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

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create {currentRole.label} Account
                </>
              )}
            </Button>
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
