"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const capabilities = [
  {
    id: "ai-analysis",
    title: "AI Clinical Analysis",
    description:
      "Natural language models analyze symptoms, medical reports, and health history to generate structured clinical signals and diagnostic suggestions.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-5 w-5" aria-hidden>
        <circle
          cx="20"
          cy="20"
          r="12"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M14 20h3l2-5 3 10 2-7 2 4h2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    iconBg: "bg-primary/10 text-primary",
    badgeClass:
      "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10",
    accentLine: "from-primary/60 to-primary/10",
    hoverBorder: "hover:ring-primary/20",
  },
  {
    id: "medical-records",
    title: "Intelligent Medical Records",
    description:
      "Upload lab reports, prescriptions, and scans. MedIntel automatically extracts, categorizes, and organizes medical data into a unified patient health record.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-5 w-5" aria-hidden>
        <rect
          x="9"
          y="6"
          width="22"
          height="28"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M14 14h12M14 19h12M14 24h8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="28" cy="28" r="5" fill="currentColor" opacity="0.12" />
        <path
          d="M26 28h4M28 26v4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    iconBg: "bg-chart-2/10 text-chart-2",
    badgeClass:
      "bg-chart-2/10 text-chart-2 border-chart-2/20 hover:bg-chart-2/10",
    accentLine: "from-chart-2/60 to-chart-2/10",
    hoverBorder: "hover:ring-chart-2/20",
  },
  {
    id: "risk-detection",
    title: "Risk Detection & Predictive Signals",
    description:
      "Machine learning models detect patterns across medical data to identify potential health risks and early warning indicators before they escalate.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M20 8L34 32H6L20 8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M20 19v5M20 27v1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    iconBg: "bg-destructive/10 text-destructive",
    badgeClass:
      "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10",
    accentLine: "from-destructive/50 to-destructive/10",
    hoverBorder: "hover:ring-destructive/15",
  },
  {
    id: "structured-data",
    title: "Structured Health Data",
    description:
      "Unstructured medical documents are transformed into searchable, machine-readable clinical data for easier analysis and decision support.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-5 w-5" aria-hidden>
        <rect
          x="6"
          y="8"
          width="28"
          height="5"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="6"
          y="18"
          width="28"
          height="5"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="6"
          y="28"
          width="17"
          height="5"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
    iconBg: "bg-chart-3/10 text-chart-3",
    badgeClass:
      "bg-chart-3/10 text-chart-3 border-chart-3/20 hover:bg-chart-3/10",
    accentLine: "from-chart-3/60 to-chart-3/10",
    hoverBorder: "hover:ring-chart-3/20",
  },
  {
    id: "doctor-context",
    title: "Doctor-Ready Patient Context",
    description:
      "Doctors receive summarized medical history, AI-generated insights, and structured reports before consultation — reducing diagnostic friction significantly.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-5 w-5" aria-hidden>
        <circle cx="20" cy="13" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 34c0-6.627 5.373-12 12-12s12 5.373 12 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M28 22l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    iconBg: "bg-chart-1/10 text-chart-1",
    badgeClass:
      "bg-chart-1/10 text-chart-1 border-chart-1/20 hover:bg-chart-1/10",
    accentLine: "from-chart-1/60 to-chart-1/10",
    hoverBorder: "hover:ring-chart-1/20",
  },
  {
    id: "security",
    title: "Secure Health Infrastructure",
    description:
      "End-to-end encryption, role-based access control, and secure medical data storage designed for sensitive healthcare workflows and compliance.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M20 6L8 11v9c0 7.18 5.19 13.89 12 15.5C27.81 33.89 32 27.18 32 20v-9L20 6Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M15 20l3 3 7-7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    iconBg: "bg-chart-4/10 text-chart-4",
    badgeClass:
      "bg-chart-4/10 text-chart-4 border-chart-4/20 hover:bg-chart-4/10",
    accentLine: "from-chart-4/60 to-chart-4/10",
    hoverBorder: "hover:ring-chart-4/20",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      delay: 0.05 * i,
    },
  }),
};

export default function CapabilitiesSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="capabilities"
      ref={ref}
      className="relative border-t border-border bg-background"
    >
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-4 flex justify-center items-center gap-3"
          >
            <span className="h-px w-8 bg-primary" />
            <span className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-primary">
              Core Capabilities
            </span>
            <span className="h-px w-8 bg-primary" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{
              duration: 0.6,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Everything the
            <br />
            platform <span className="text-primary">delivers.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{
              duration: 0.6,
              delay: 0.16,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-4 text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            MedIntel converts raw medical information into structured clinical
            intelligence — built for patients and healthcare professionals
            alike.
          </motion.p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="group"
            >
              <Card
                className={`relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-px hover:shadow-md ${cap.hoverBorder}`}
              >
                {/* Hover glow */}
                <div
                  className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${cap.iconBg.split(" ")[0]} blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />

                {/* Bottom accent line */}
                <div
                  className={`absolute bottom-0 left-0 h-px w-0 bg-linear-to-r ${cap.accentLine} transition-all duration-500 group-hover:w-full`}
                />

                <CardHeader>
                  {/* Icon + badge row */}
                  <div className="mb-1 flex items-center justify-between">
                    <div
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${cap.iconBg} transition-transform duration-300 group-hover:scale-105`}
                    >
                      {cap.icon}
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-[0.15em] ${cap.badgeClass.includes("text-primary") ? "text-primary" : cap.badgeClass.includes("text-chart-2") ? "text-chart-2" : cap.badgeClass.includes("text-destructive") ? "text-destructive" : cap.badgeClass.includes("text-chart-3") ? "text-chart-3" : cap.badgeClass.includes("text-chart-1") ? "text-chart-1" : "text-chart-4"}`}
                    >
                      {cap.id.replace(/-/g, " ")}
                    </span>
                  </div>

                  <CardTitle className="text-base font-semibold leading-snug text-card-foreground">
                    {cap.title}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {cap.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
