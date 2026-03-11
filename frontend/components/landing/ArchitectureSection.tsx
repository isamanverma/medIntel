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

const stackItems = [
  {
    label: "AI inference pipelines",
    sublabel: "Medical text analysis",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M7 12h2l1.5-3.5 2 7 1.5-5L15 12h2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    iconBg: "bg-primary/10 text-primary",
    badgeClass:
      "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10",
    cardHover: "hover:ring-primary/15",
  },
  {
    label: "Secure document processing",
    sublabel: "Encrypted at rest & in transit",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <rect
          x="5"
          y="3"
          width="14"
          height="18"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M8 8h8M8 12h8M8 16h5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
    iconBg: "bg-chart-2/10 text-chart-2",
    badgeClass:
      "bg-chart-2/10 text-chart-2 border-chart-2/20 hover:bg-chart-2/10",
    cardHover: "hover:ring-chart-2/15",
  },
  {
    label: "Clinical data extraction",
    sublabel: "Structured output formats",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <rect
          x="3"
          y="5"
          width="18"
          height="3"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <rect
          x="3"
          y="11"
          width="18"
          height="3"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <rect
          x="3"
          y="17"
          width="11"
          height="3"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
    ),
    iconBg: "bg-chart-3/10 text-chart-3",
    badgeClass:
      "bg-chart-3/10 text-chart-3 border-chart-3/20 hover:bg-chart-3/10",
    cardHover: "hover:ring-chart-3/15",
  },
  {
    label: "Role-based access control",
    sublabel: "Patient · Doctor · Admin",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path
          d="M12 3L4 7v6c0 4.418 3.358 8.547 8 9.5C19.642 21.547 20 17.418 20 13V7L12 3Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    iconBg: "bg-chart-4/10 text-chart-4",
    badgeClass:
      "bg-chart-4/10 text-chart-4 border-chart-4/20 hover:bg-chart-4/10",
    cardHover: "hover:ring-chart-4/15",
  },
  {
    label: "API-first architecture",
    sublabel: "Extensible & composable",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path
          d="M4 8l4-4 4 4M8 4v10"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 16l-4 4-4-4M16 20V10"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    iconBg: "bg-chart-1/10 text-chart-1",
    badgeClass:
      "bg-chart-1/10 text-chart-1 border-chart-1/20 hover:bg-chart-1/10",
    cardHover: "hover:ring-chart-1/15",
  },
];

const techTags = [
  { name: "FastAPI", group: "backend" },
  { name: "Python 3.13", group: "backend" },
  { name: "SQLModel", group: "backend" },
  { name: "PostgreSQL", group: "backend" },
  { name: "asyncpg", group: "backend" },
  { name: "Alembic", group: "backend" },
  { name: "Next.js 16", group: "frontend" },
  { name: "TypeScript 5", group: "frontend" },
  { name: "Tailwind CSS v4", group: "frontend" },
  { name: "JWT Auth", group: "security" },
  { name: "RBAC", group: "security" },
  { name: "256-bit AES", group: "security" },
];

const tagBadgeClass: Record<string, string> = {
  backend: "bg-primary/8 text-primary border-primary/15 hover:bg-primary/8",
  frontend: "bg-chart-2/8 text-chart-2 border-chart-2/15 hover:bg-chart-2/8",
  security: "bg-chart-4/8 text-chart-4 border-chart-4/15 hover:bg-chart-4/8",
};

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      delay: 0.06 * i,
    },
  }),
};

export default function ArchitectureSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative border-t border-border bg-muted/20 overflow-hidden"
    >
      {/* Background decoration */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 h-[400px] w-[500px] rounded-full bg-primary/4 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[400px] rounded-full bg-chart-2/4 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-4 flex justify-center"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-primary" />
              <span className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-primary">
                Platform Architecture
              </span>
              <span className="h-px w-8 bg-primary" />
            </div>
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
            Built on a modern
            <br />
            healthcare <span className="text-primary">AI stack.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{
              duration: 0.6,
              delay: 0.16,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-4 text-lg leading-relaxed text-muted-foreground"
          >
            Every layer of the platform is designed for reliability, security,
            and extensibility — from AI inference to the API boundary.
          </motion.p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          {/* Left — stack capabilities */}
          <div className="space-y-2.5">
            {stackItems.map((item, i) => (
              <motion.div
                key={item.label}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                className="group"
              >
                <Card
                  className={`flex-row items-center gap-0 overflow-hidden py-0 transition-all duration-300 hover:-translate-x-0.5 hover:shadow-sm ${item.cardHover}`}
                >
                  <CardContent className="flex flex-1 items-center gap-3 py-3 px-4">
                    {/* Icon */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.iconBg} transition-transform duration-300 group-hover:scale-105`}
                    >
                      {item.icon}
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-card-foreground">
                        {item.label}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {item.sublabel}
                      </p>
                    </div>

                    {/* Right badge */}
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${item.badgeClass}`}
                    >
                      Active
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Right — tech stack visual + detail cards */}
          <div className="flex flex-col gap-4">
            {/* Tech stack tag cloud card */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
              transition={{
                duration: 0.65,
                delay: 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Card className="relative overflow-hidden">
                {/* Subtle grid overlay */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 opacity-[0.025]"
                >
                  <svg
                    className="h-full w-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <pattern
                        id="arch-grid"
                        x="0"
                        y="0"
                        width="32"
                        height="32"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 32 0 L 0 0 0 32"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="0.5"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#arch-grid)" />
                  </svg>
                </div>

                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold uppercase tracking-widest text-muted-foreground">
                      Technology Stack
                    </CardTitle>
                    {/* Legend */}
                    <div className="flex items-center gap-2">
                      {[
                        { label: "Backend", key: "backend" },
                        { label: "Frontend", key: "frontend" },
                        { label: "Security", key: "security" },
                      ].map((g) => (
                        <Badge
                          key={g.key}
                          variant="outline"
                          className={`text-xs ${tagBadgeClass[g.key]}`}
                        >
                          {g.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {techTags.map((tag, i) => (
                      <motion.div
                        key={tag.name}
                        initial={{ opacity: 0, scale: 0.88 }}
                        animate={
                          inView
                            ? { opacity: 1, scale: 1 }
                            : { opacity: 0, scale: 0.88 }
                        }
                        transition={{
                          duration: 0.3,
                          delay: 0.25 + i * 0.035,
                          ease: "easeOut",
                        }}
                      >
                        <Badge
                          variant="outline"
                          className={`transition-transform duration-200 hover:scale-105 ${tagBadgeClass[tag.group]}`}
                        >
                          {tag.name}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* API-first detail card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{
                duration: 0.6,
                delay: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-3.5 w-3.5"
                        aria-hidden
                      >
                        <path
                          d="M10 2L3 6v5c0 4.1 3.1 7.9 7 8.9C17 19.9 17 16.1 17 11V6L10 2Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7 10l2 2 4-4"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-card-foreground">
                        API-first & extensible
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm leading-relaxed">
                        Every feature is exposed through a clean REST API —
                        composable, testable, and ready for integration with
                        existing healthcare infrastructure.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            {/* Async-native detail card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{
                duration: 0.6,
                delay: 0.36,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-3.5 w-3.5"
                        aria-hidden
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="8"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M6 10h3l1.5-3 2 6 1.5-4.5L15 10h1"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-card-foreground">
                        Async-native performance
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm leading-relaxed">
                        Built with async Python and non-blocking database access
                        via asyncpg — handles concurrent clinical workloads
                        without bottlenecks.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
