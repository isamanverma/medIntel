"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, HeartPulse, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const ctas = [
  {
    role: "Patient",
    tagline: "Understand your health.",
    description:
      "Upload your records, track insights, and detect risks early — all in one structured, AI-powered health profile.",
    href: "/signup?role=patient",
    label: "Create Patient Account",
    Icon: HeartPulse,
    badgeClass:
      "bg-chart-1/10 text-chart-1 border-chart-1/20 hover:bg-chart-1/10",
    dotClass: "bg-chart-1",
    cardHover: "hover:ring-chart-1/20",
    glowClass: "bg-chart-1/8",
    ctaVariant: "secondary" as const,
    ctaClass: "w-full bg-foreground text-background hover:bg-foreground/90",
  },
  {
    role: "Doctor",
    tagline: "Make faster clinical decisions.",
    description:
      "Access AI-structured patient context, organized records, and clinical insights — before every consultation.",
    href: "/signup?role=doctor",
    label: "Join as Doctor",
    Icon: Stethoscope,
    badgeClass:
      "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10",
    dotClass: "bg-primary",
    cardHover: "hover:ring-primary/20",
    glowClass: "bg-primary/8",
    ctaVariant: "default" as const,
    ctaClass: "w-full shadow-md shadow-primary/20",
  },
];

export default function CtaSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative border-t border-border bg-muted/30 overflow-hidden"
    >
      {/* Background decoration */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.025]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="cta-grid"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-grid)" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-4 flex items-center justify-center gap-3"
          >
            <span className="h-px w-8 bg-primary" />
            <span className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-primary">
              Get Started
            </span>
            <span className="h-px w-8 bg-primary" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
            transition={{
              duration: 0.65,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            The intelligence layer
            <br />
            between data and <span className="text-primary">decision.</span>
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
            Whether you&apos;re a patient trying to understand your health or a
            doctor seeking faster clinical insights, MedIntel provides the
            context that leads to better decisions.
          </motion.p>
        </div>

        {/* CTA cards — equal height, footer pinned to bottom */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mx-auto lg:max-w-4xl lg:items-stretch">
          {ctas.map((cta, i) => (
            <motion.div
              key={cta.role}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
              transition={{
                duration: 0.65,
                delay: 0.22 + i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group flex"
            >
              <Card
                className={`relative flex w-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-px hover:shadow-lg ${cta.cardHover}`}
              >
                {/* Corner glow */}
                <div
                  className={`pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full ${cta.glowClass} blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />

                {/* Header — grows to fill space, pushing footer down */}
                <CardHeader className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <Badge
                        variant="outline"
                        className={`mb-3 gap-1.5 ${cta.badgeClass}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${cta.dotClass}`}
                        />
                        {cta.role}
                      </Badge>
                      <CardTitle className="text-2xl font-bold leading-snug text-card-foreground sm:text-3xl">
                        {cta.tagline}
                      </CardTitle>
                    </div>
                    {/* Icon block */}
                    <div
                      className={`shrink-0 rounded-xl p-2.5 ${
                        cta.role === "Patient"
                          ? "bg-chart-1/10 text-chart-1"
                          : "bg-primary/10 text-primary"
                      } transition-transform duration-300 group-hover:scale-105`}
                    >
                      <cta.Icon className="h-6 w-6" />
                    </div>
                  </div>

                  <CardDescription className="mt-1 text-base leading-relaxed">
                    {cta.description}
                  </CardDescription>
                </CardHeader>

                <Separator />

                {/* Footer — always at the bottom, never floats up */}
                <CardFooter className="pt-5">
                  <Button
                    variant={cta.ctaVariant}
                    size="lg"
                    className={`group/btn rounded-xl text-base ${cta.ctaClass}`}
                    asChild
                  >
                    <Link href={cta.href}>
                      <cta.Icon className="h-4 w-4" data-icon="inline-start" />
                      {cta.label}
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-0.5"
                        data-icon="inline-end"
                      />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.52 }}
          className="mt-10 text-center text-sm text-muted-foreground/60"
        >
          No credit card required. Set up in under a minute.
        </motion.p>
      </div>
    </section>
  );
}
