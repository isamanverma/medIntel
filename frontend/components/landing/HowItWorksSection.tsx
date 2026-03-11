"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { ease } from "@/lib/motion";

const STEPS = [
  {
    number: "01",
    title: "Create account",
    description:
      "Register as a patient or doctor. Role-based permissions are configured instantly — no manual setup.",
    detail: "RBAC enforced at every layer",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-6 w-6" aria-hidden>
        <circle cx="20" cy="15" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 36c0-6.627 5.373-12 12-12s12 5.373 12 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M27 10l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Upload medical data",
    description:
      "Add lab results, prescriptions, scans, or any medical document. Encrypted and structured automatically.",
    detail: "AES-256 at rest and in transit",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-6 w-6" aria-hidden>
        <rect
          x="9"
          y="8"
          width="22"
          height="26"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M20 28V18M16 22l4-4 4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    number: "03",
    title: "AI generates insights",
    description:
      "Models extract clinical signals, detect risk patterns, and produce a structured patient brief in seconds.",
    detail: "Risk flags · Lab trends · Drug interactions",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-6 w-6" aria-hidden>
        <circle
          cx="20"
          cy="20"
          r="12"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M13 20h3l2-5 3 10 2-7 2 4h2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Doctor acts",
    description:
      "The consulting doctor receives the full AI-generated patient context before the appointment even begins.",
    detail: "Faster decisions · Better outcomes",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-6 w-6" aria-hidden>
        <rect
          x="7"
          y="6"
          width="26"
          height="28"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M13 16h14M13 21h14M13 26h8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="28" cy="26" r="5" fill="currentColor" opacity="0.1" />
        <path
          d="M26 26l1.5 1.5L30 24"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function HowItWorksSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative border-t border-border bg-muted/20 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.4 }}
          className="mb-4 flex items-center gap-3"
        >
          <span className="h-px w-8 bg-primary" />
          <span className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-primary">
            The Process
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.55, delay: 0.06, ease: ease.spring }}
          className="text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          Four steps to
          <br />
          <span className="text-primary">clinical intelligence.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.55, delay: 0.12, ease: ease.spring }}
          className="mt-5 max-w-xl text-lg text-muted-foreground leading-relaxed"
        >
          From account creation to AI-generated clinical brief — the entire
          workflow is designed to be fast, secure, and immediately useful.
        </motion.p>

        {/* Timeline — desktop: horizontal row, mobile: vertical stack */}
        <div className="mt-16 relative">
          {/* Horizontal connector line — desktop only */}
          <div className="hidden lg:block absolute top-[2.75rem] left-0 right-0 h-px">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 1.0, delay: 0.3, ease: ease.spring }}
              className="origin-left h-full w-full bg-border"
            />
          </div>

          {/* Vertical connector line — mobile only */}
          <div className="lg:hidden absolute top-0 bottom-0 left-5 w-px">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 1.0, delay: 0.3, ease: ease.spring }}
              className="origin-top h-full w-full bg-border"
            />
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{
                  duration: 0.55,
                  delay: 0.2 + i * 0.1,
                  ease: ease.spring,
                }}
                className="relative flex flex-row gap-5 lg:flex-col lg:gap-0"
              >
                {/* Node circle — sits ON the line on desktop */}
                <div className="relative z-10 shrink-0 lg:mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={inView ? { scale: 1 } : { scale: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.35 + i * 0.1,
                      ease: ease.spring,
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary bg-background"
                  >
                    <span className="text-xs font-black font-mono text-primary">
                      {step.number}
                    </span>
                  </motion.div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-0.5 lg:pt-0">
                  {/* Icon */}
                  <div className="mb-4 hidden lg:inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground">
                    {step.icon}
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {step.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Detail tag */}
                  <div className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {step.detail}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom callout strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.55, delay: 0.65, ease: ease.spring }}
          className="mt-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rounded-lg border border-border bg-card px-6 py-5"
        >
          <div>
            <p className="text-base font-semibold text-card-foreground">
              The entire process takes under 60 seconds to set up.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              No manual configuration. No complex onboarding. Just structured
              clinical intelligence.
            </p>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            {[
              { value: "< 2s", label: "Processing" },
              { value: "RBAC", label: "Access control" },
              { value: "E2E", label: "Encrypted" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center ${i > 0 ? "pl-6 border-l border-border" : ""}`}
              >
                <span className="text-xl font-black tabular-nums text-foreground">
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
