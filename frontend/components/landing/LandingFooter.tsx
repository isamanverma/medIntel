"use client";

import Link from "next/link";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Activity } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const footerLinks = [
  {
    heading: "Platform",
    links: [
      { label: "Patient Portal", href: "/login?role=patient" },
      { label: "Doctor Portal", href: "/login?role=doctor" },
      { label: "Create Account", href: "/signup?role=patient" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "API Documentation", href: "#" },
      {
        label: "GitHub Repository",
        href: "https://github.com",
        external: true,
      },
    ],
  },
  {
    heading: "Healthcare",
    links: [{ label: "For Healthcare Providers", href: "/login?role=doctor" }],
  },
  {
    heading: "Administration",
    links: [{ label: "Admin Portal", href: "/admin/login" }],
  },
];

export default function LandingFooter() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <footer
      ref={ref}
      className="relative overflow-hidden border-t border-border bg-muted/20"
    >
      {/* Subtle background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute bottom-0 left-0 h-60 w-96 rounded-full bg-primary/3 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        {/* Top grid */}
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-12">
          {/* Brand column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-2 sm:col-span-3 lg:col-span-1"
          >
            <Link
              href="/"
              className="group mb-4 inline-flex items-center gap-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/30 transition-transform duration-200 group-hover:scale-105">
                <Activity className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-base font-bold tracking-tight text-foreground">
                Med<span className="text-primary">Intel</span>
              </span>
            </Link>

            <p className="mt-1 max-w-52 text-sm leading-relaxed text-muted-foreground">
              AI-powered healthcare intelligence platform for structured medical
              data analysis and clinical insight generation.
            </p>

            {/* Operational status badge */}
            <div className="mt-5">
              <Badge variant="outline" className="gap-2 rounded-full px-3 py-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-chart-2" />
                </span>
                All systems operational
              </Badge>
            </div>
          </motion.div>

          {/* Link columns */}
          {footerLinks.map((section, i) => (
            <motion.div
              key={section.heading}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{
                duration: 0.55,
                delay: 0.06 * (i + 1),
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
                {section.heading}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                        <svg
                          viewBox="0 0 12 12"
                          fill="none"
                          className="h-2.5 w-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          aria-hidden
                        >
                          <path
                            d="M2 10L10 2M10 2H5M10 2v5"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="my-8"
        >
          <Separator />
        </motion.div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.45, delay: 0.38, ease: "easeOut" }}
          className="flex flex-col items-center justify-between gap-4 sm:flex-row"
        >
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MedIntel. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            {/* Tech stack note */}
            <span className="hidden text-xs text-muted-foreground/50 sm:block">
              FastAPI · Next.js · PostgreSQL
            </span>

            <Separator orientation="vertical" className="hidden h-3 sm:block" />

            {/* Admin link */}
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <svg
                viewBox="0 0 14 14"
                fill="none"
                className="h-3 w-3"
                aria-hidden
              >
                <path
                  d="M7 2L2 4.5v3.5c0 2.9 2.1 5.6 5 6.2C9.9 13.6 12 10.9 12 8V4.5L7 2Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 7l1.5 1.5L9 6"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Admin
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
