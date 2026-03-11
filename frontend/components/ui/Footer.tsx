import Link from "next/link";
import { Activity, Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Med<span className="text-primary">Intel</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered healthcare intelligence platform. Smarter diagnostics,
              better outcomes.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Platform
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/login?role=patient"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Patient Portal
                </Link>
              </li>
              <li>
                <Link
                  href="/login?role=doctor"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Doctor Portal
                </Link>
              </li>
              <li>
                <Link
                  href="/signup?role=patient"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  GitHub Repository
                </Link>
              </li>
              <li>
                <Link
                  href="/login?role=doctor"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  For Healthcare Providers
                </Link>
              </li>
            </ul>
          </div>

          {/* Admin Access */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Administration
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MedIntel. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
