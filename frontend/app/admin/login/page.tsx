"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Shield,
  Loader2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useAuth } from "@/components/providers/SessionProvider";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const { refreshSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, role: "ADMIN" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid credentials. Please try again.");
        setIsLoading(false);
        return;
      }

      await refreshSession();

      const destination = callbackUrl || "/admin/dashboard";
      router.push(destination);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo — identical to patient/doctor login */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="MedIntel"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-contain"
              priority
            />
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Med<span className="text-primary">Intel</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-card-foreground">
              Admin Portal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Restricted access — authorised personnel only
            </p>
          </div>

          {/* Shield badge — mirrors the role description pill on the other page */}
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5">
            <Shield className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">
              Admin accounts are provisioned by the platform team and cannot be
              self-registered
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
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
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
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

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Sign In to Admin Portal
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back to home — identical placement to patient/doctor login */}
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

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
