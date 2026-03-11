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

const securityFeatures = [
  {
    id: "encryption",
    title: "256-bit Encryption",
    description:
      "All data is encrypted at rest and in transit using AES-256, the same standard used by financial and government institutions.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <rect
          x="5"
          y="11"
          width="14"
          height="11"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M8 11V7a4 4 0 0 1 8 0v4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16" r="1.5" fill="currentColor" />
      </svg>
    ),
    iconBg: "bg-primary/10 text-primary",
    badgeClass:
      "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10",
    cardHover: "hover:ring-primary/20",
  },
  {
    id: "rbac",
    title: "Role-Based Access Control",
    description:
      "Patients, doctors, and admins each operate within strict permission boundaries. No cross-role data leakage — ever.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="17" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M3 20c0-3.314 2.686-6 6-6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M11 20c0-3.314 2.686-6 6-6s6 2.686 6 6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
    iconBg: "bg-chart-3/10 text-chart-3",
    badgeClass:
      "bg-chart-3/10 text-chart-3 border-chart-3/20 hover:bg-chart-3/10",
    cardHover: "hover:ring-chart-3/20",
  },
  {
    id: "storage",
    title: "Secure Document Storage",
    description:
      "Medical documents are stored in isolated, encrypted storage buckets with access audit trails and retention controls.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <ellipse
          cx="12"
          cy="7"
          rx="8"
          ry="3"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M4 7v5c0 1.657 3.582 3 8 3s8-1.343 8-3V7"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M4 12v5c0 1.657 3.582 3 8 3s8-1.343 8-3v-5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
    ),
    iconBg: "bg-chart-2/10 text-chart-2",
    badgeClass:
      "bg-chart-2/10 text-chart-2 border-chart-2/20 hover:bg-chart-2/10",
    cardHover: "hover:ring-chart-2/20",
  },
  {
    id: "api",
    title: "Protected API Access",
    description:
      "All API endpoints are authenticated with JWT tokens, rate-limited to prevent abuse, and protected against CSRF attacks.",
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
    cardHover: "hover:ring-chart-4/20",
  },
  {
    id: "privacy",
    title: "Privacy-First Data Handling",
    description:
      "No health data is used for advertising or shared with third parties. Your medical information is yours — strictly controlled.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M3 3l18 18"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
    iconBg: "bg-chart-1/10 text-chart-1",
    badgeClass:
      "bg-chart-1/10 text-chart-1 border-chart-1/20 hover:bg-chart-1/10",
    cardHover: "hover:ring-chart-1/20",
  },
  {
    id: "audit",
    title: "Audit Trails",
    description:
      "Every access, modification, and data event is logged with timestamps and actor identity — providing a complete clinical audit trail.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path
          d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <rect
          x="9"
          y="3"
          width="6"
          height="4"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M9 12h6M9 16h4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
    iconBg: "bg-destructive/10 text-destructive",
    badgeClass:
      "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10",
    cardHover: "hover:ring-destructive/15",
  },
];

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

function ShieldVisual({ inView }: { inView: boolean }) {
  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
      {/* Rings */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 rounded-full border border-primary/15 bg-primary/4"
      />
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
        transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-6 rounded-full border border-primary/20 bg-primary/6"
      />
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-12 rounded-full border border-primary/30 bg-primary/10"
      />

      {/* Orbiting dots */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <motion.div
          key={deg}
          initial={{ opacity: 0, scale: 0 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{
            duration: 0.35,
            delay: 0.4 + i * 0.055,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `rotate(${deg}deg) translateY(-76px) rotate(-${deg}deg)`,
          }}
        >
          <span className="block h-1.5 w-1.5 rounded-full bg-primary/40 shadow-sm shadow-primary/20" />
        </motion.div>
      ))}

      {/* Center shield */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-chart-3 shadow-xl shadow-primary/25"
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          className="h-9 w-9 text-white"
          aria-hidden
        >
          <path
            d="M20 5L7 10v9c0 7.5 5.5 14.5 13 16.5C27.5 33.5 33 26.5 33 19v-9L20 5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M14 20l4 4 8-8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}

export default function SecuritySection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="security"
      ref={ref}
      className="relative border-t border-border bg-background overflow-hidden"
    >
      {/* Background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/4 blur-[100px]" />
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
                Security & Data Protection
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
            Healthcare data
            <br />
            requires <span className="text-primary">strict protection.</span>
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
            MedIntel implements security at every layer — from the database to
            the API boundary — with no shortcuts on sensitive medical data.
          </motion.p>
        </div>

        {/* Shield callout card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-14 max-w-2xl"
        >
          <Card className="overflow-hidden">
            <CardContent className="flex flex-col items-center gap-6 pt-6 sm:flex-row sm:gap-10 sm:pt-6">
              <ShieldVisual inView={inView} />

              <div className="flex-1 text-center sm:text-left">
                <CardTitle className="text-lg font-bold sm:text-xl">
                  Security is not an afterthought.
                </CardTitle>
                <CardDescription className="mt-2 text-base leading-relaxed">
                  Every architectural decision — from async database access to
                  double-submit CSRF cookies — was made with healthcare-grade
                  security requirements in mind.
                </CardDescription>

                {/* Security badges */}
                <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {[
                    "256-bit AES",
                    "JWT Auth",
                    "CSRF Protection",
                    "Rate Limiting",
                  ].map((label) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="bg-primary/8 text-primary border-primary/20 hover:bg-primary/8 text-sm"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {securityFeatures.map((feature, i) => (
            <motion.div
              key={feature.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="group"
            >
              <Card
                className={`relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-px hover:shadow-md ${feature.cardHover}`}
              >
                {/* Hover glow */}
                <div
                  className={`pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full ${feature.iconBg.split(" ")[0]} blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />

                {/* Bottom accent line */}
                <div
                  className={`absolute bottom-0 left-0 h-px w-0 ${feature.iconBg.split(" ")[0]} transition-all duration-500 group-hover:w-full`}
                />

                <CardHeader>
                  <div className="mb-1 flex items-center justify-between">
                    <div
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${feature.iconBg} transition-transform duration-300 group-hover:scale-105`}
                    >
                      {feature.icon}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[0.6rem] uppercase tracking-wider ${feature.badgeClass}`}
                    >
                      Security
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold leading-snug">
                    {feature.title}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
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
