"use client";

import React, { Fragment, useRef } from "react";
import { motion, useInView } from "motion/react";
import { fadeUp, ease } from "@/lib/motion";

const PIPELINE = [
  {
    step: "01",
    label: "Raw Input",
    sublabel: "Medical records, labs, scans, prescriptions",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6" aria-hidden>
        <rect
          x="6"
          y="4"
          width="14"
          height="18"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 9h6M10 12h6M10 15h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle
          cx="22"
          cy="22"
          r="5"
          fill="currentColor"
          opacity="0.1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M20 22h4M22 20v4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    step: "02",
    label: "AI Processing",
    sublabel: "Pattern detection, extraction, risk scoring",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6" aria-hidden>
        <circle
          cx="16"
          cy="16"
          r="10"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 16h2.5l2-5 3 10 2-7 1.5 4H22"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    step: "03",
    label: "Clinical Output",
    sublabel: "Structured insights, flags, doctor brief",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6" aria-hidden>
        <rect
          x="4"
          y="4"
          width="24"
          height="24"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M9 12h14M9 16h10M9 20h6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="24" cy="20" r="4" fill="currentColor" opacity="0.12" />
        <path
          d="M22.5 20l1 1 2-2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const METRICS = [
  {
    value: "< 2s",
    label: "Record processing time",
    description: "Average time from upload to structured output",
  },
  {
    value: "94%",
    label: "AI analysis confidence",
    description: "Across lab result extraction and risk flag detection",
  },
  {
    value: "3×",
    label: "Faster consultation prep",
    description: "Doctors arrive with full patient context, not fragments",
  },
  {
    value: "100%",
    label: "Role-isolated access",
    description: "Zero cross-role data leakage by design",
  },
];

function ArrowConnector({ inView, delay }: { inView: boolean; delay: number }) {
  return (
    <div className="hidden lg:flex items-center justify-center w-12 shrink-0">
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={inView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
        transition={{ duration: 0.5, delay, ease: ease.spring }}
        className="origin-left flex items-center gap-0.5 w-full"
      >
        <div className="h-px flex-1 bg-border" />
        <svg
          viewBox="0 0 8 12"
          fill="none"
          className="h-3 w-2 text-border shrink-0"
        >
          <path
            d="M1 1l6 5-6 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}

export default function WhatWeDoSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative border-t border-border overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        {/* Section label */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={0}
          className="mb-4 flex items-center gap-3"
        >
          <span className="h-px w-8 bg-primary" />
          <span className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-primary">
            How It Works
          </span>
        </motion.div>

        {/* Headline — no gradient */}
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={0.06}
          className="max-w-2xl text-4xl font-black tracking-tight text-foreground sm:text-5xl"
        >
          From scattered records
          <br />
          to a <span className="text-primary">complete picture.</span>
        </motion.h2>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={0.12}
          className="mt-5 max-w-xl text-lg text-muted-foreground leading-relaxed"
        >
          MedIntel takes unstructured health data — the messy PDFs, lab sheets,
          and handwritten notes — and turns it into something a doctor can
          actually act on.
        </motion.p>

        {/* Pipeline diagram */}
        <div className="mt-16">
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 lg:gap-0">
            {PIPELINE.map((stage, i) => (
              <Fragment key={stage.step}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                  }
                  transition={{
                    duration: 0.55,
                    delay: 0.15 + i * 0.12,
                    ease: ease.spring,
                  }}
                  className="flex-1 group"
                >
                  <div className="h-full rounded-lg border border-border bg-card p-6 hover:border-primary/40 transition-colors duration-300">
                    {/* Step number */}
                    <div className="flex items-start justify-between mb-5">
                      <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-muted-foreground uppercase">
                        STEP {stage.step}
                      </span>
                      {/* Progress dots */}
                      <div className="flex gap-1">
                        {PIPELINE.map((_, j) => (
                          <span
                            key={j}
                            className={`h-1.5 w-1.5 rounded-full transition-colors ${j <= i ? "bg-primary" : "bg-border"}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground group-hover:border-primary/30 group-hover:text-primary transition-colors duration-300">
                      {stage.icon}
                    </div>

                    {/* Text */}
                    <h3 className="text-lg font-bold text-card-foreground">
                      {stage.label}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {stage.sublabel}
                    </p>
                  </div>
                </motion.div>

                {i < PIPELINE.length - 1 && (
                  <ArrowConnector
                    key={`arrow-${i}`}
                    inView={inView}
                    delay={0.28 + i * 0.12}
                  />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease: ease.spring }}
          className="mt-20 mb-16 h-px w-full bg-border origin-left"
        />

        {/* Metrics grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + i * 0.08 }}
              className="bg-card px-6 py-7 flex flex-col gap-2"
            >
              <span className="text-4xl font-black tabular-nums text-foreground tracking-tight">
                {m.value}
              </span>
              <span className="text-sm font-semibold text-card-foreground">
                {m.label}
              </span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                {m.description}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
