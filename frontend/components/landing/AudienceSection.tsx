"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ease } from "@/lib/motion";
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

const audiences = [
  {
    role: "Patient",
    tagline: "Understand your health on your own terms.",
    description:
      "Access and understand your medical data without needing to interpret complex reports. MedIntel gives you a clear picture of your health — past, present, and potential risks ahead.",
    features: [
      "Upload medical records",
      "Track health insights",
      "Detect potential risks early",
      "Maintain a structured health profile",
    ],
    cta: { label: "Create Patient Account", href: "/signup?role=patient" },
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="h-7 w-7" aria-hidden>
        <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M8 42c0-8.837 7.163-16 16-16s16 7.163 16 16"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M24 26v6M21 29h6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
    iconBg: "bg-chart-1/10 text-chart-1",
    badgeClass:
      "bg-chart-1/10 text-chart-1 border-chart-1/20 hover:bg-chart-1/10",
    dotClass: "bg-chart-1",
    checkColor: "text-chart-1",
    cardHover: "hover:ring-chart-1/20",
    ctaVariant: "secondary" as const,
    ctaClass: "bg-foreground text-background hover:bg-foreground/90 w-full",
  },
  {
    role: "Doctor",
    tagline: "Faster context. Better decisions.",
    description:
      "Access patient information in a clear, structured, AI-assisted format before every consultation. Spend less time piecing together records — more time on clinical judgment.",
    features: [
      "Faster case review",
      "AI-supported clinical insights",
      "Organized patient records",
      "Improved decision support",
    ],
    cta: { label: "Join as Doctor", href: "/signup?role=doctor" },
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="h-7 w-7" aria-hidden>
        <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M8 42c0-8.837 7.163-16 16-16s16 7.163 16 16"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="36" cy="30" r="5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M34 30h4M36 28v4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
    iconBg: "bg-primary/10 text-primary",
    badgeClass:
      "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10",
    dotClass: "bg-primary",
    checkColor: "text-primary",
    cardHover: "hover:ring-primary/20",
    ctaVariant: "default" as const,
    ctaClass: "w-full shadow-md shadow-primary/20",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.14 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: ease.out, delay: 0.06 * i },
  }),
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={`h-4 w-4 shrink-0 ${className}`}
      aria-hidden
    >
      <circle
        cx="8"
        cy="8"
        r="7"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
      />
      <path
        d="M5 8l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AudienceSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
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
            className="mb-4 flex justify-center"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-primary" />
              <span className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-primary">
                Who It&apos;s For
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
            Built for every
            <br />
            person in the <span className="text-primary">chain.</span>
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
            Whether you&apos;re managing your own health or providing care for
            others, MedIntel adapts to your role with purpose-built features.
          </motion.p>
        </div>

        {/* Audience cards — equal height, CTA pinned to bottom */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch"
        >
          {audiences.map((audience, cardIndex) => (
            <motion.div
              key={audience.role}
              variants={cardVariants}
              className="group flex"
            >
              <Card
                className={`relative flex w-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-px hover:shadow-lg ${audience.cardHover}`}
              >
                {/* Hover glow */}
                <div
                  className={`pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full ${audience.iconBg.split(" ")[0]} blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />

                {/* Header — fixed height content */}
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Badge
                        variant="outline"
                        className={`mb-3 gap-1.5 ${audience.badgeClass}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${audience.dotClass}`}
                        />
                        {audience.role}
                      </Badge>
                      <CardTitle className="text-2xl font-bold leading-snug text-card-foreground sm:text-3xl">
                        {audience.tagline}
                      </CardTitle>
                    </div>
                    {/* Icon block */}
                    <div
                      className={`shrink-0 rounded-xl p-2.5 ${audience.iconBg} transition-transform duration-300 group-hover:scale-105`}
                    >
                      {audience.icon}
                    </div>
                  </div>

                  <CardDescription className="mt-2 text-base leading-relaxed">
                    {audience.description}
                  </CardDescription>
                </CardHeader>

                {/* Content — grows to fill available space */}
                <CardContent className="flex-1 pt-5">
                  <ul className="space-y-3">
                    {audience.features.map((feature, i) => (
                      <motion.li
                        key={feature}
                        custom={i + cardIndex * 4}
                        variants={listItemVariants}
                        initial="hidden"
                        animate={inView ? "visible" : "hidden"}
                        className="flex items-center gap-3"
                      >
                        <CheckIcon className={audience.checkColor} />
                        <span className="text-base font-medium text-card-foreground">
                          {feature}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>

                <Separator />

                {/* Footer — always at the bottom */}
                <CardFooter className="pt-5">
                  <Button
                    variant={audience.ctaVariant}
                    size="lg"
                    className={`group/btn rounded-xl text-base ${audience.ctaClass}`}
                    asChild
                  >
                    <Link href={audience.cta.href}>
                      {audience.cta.label}
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
        </motion.div>
      </div>
    </section>
  );
}
