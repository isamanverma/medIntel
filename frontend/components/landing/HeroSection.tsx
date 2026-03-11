"use client";

import Link from "next/link";
import { motion, useAnimationFrame } from "motion/react";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, HeartPulse, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp } from "@/lib/motion";

// ── ECG waveform path ─────────────────────────────────────────────────────────
const ECG_PATH =
  "M0,30 L18,30 L22,30 L26,8 L30,52 L34,14 L38,44 L42,30 L48,30 L66,30 L70,30 L74,8 L78,52 L82,14 L86,44 L90,30 L96,30 L114,30 L118,30 L122,8 L126,52 L130,14 L134,44 L138,30 L144,30 L160,30";

// ── Animated ECG line ─────────────────────────────────────────────────────────
function EcgLine() {
  const pathRef = useRef<SVGPathElement>(null);
  const [length, setLength] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (pathRef.current) setLength(pathRef.current.getTotalLength());
  }, []);

  useAnimationFrame((t) => {
    if (!length) return;
    const speed = 0.06;
    setOffset((t * speed) % length);
  });

  return (
    <svg viewBox="0 0 160 60" fill="none" className="w-full h-12" aria-hidden>
      {/* dim base track */}
      <path
        d={ECG_PATH}
        stroke="currentColor"
        strokeWidth="1"
        className="text-border"
      />
      {/* animated bright segment */}
      {length > 0 && (
        <path
          ref={pathRef}
          d={ECG_PATH}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="text-primary"
          strokeDasharray={`28 ${length}`}
          strokeDashoffset={-offset}
        />
      )}
      {/* invisible path for length measurement */}
      {length === 0 && <path ref={pathRef} d={ECG_PATH} stroke="none" />}
    </svg>
  );
}

// ── Arc gauge ─────────────────────────────────────────────────────────────────
function ArcGauge({
  value,
  max = 100,
  danger = false,
}: {
  value: number;
  max?: number;
  danger?: boolean;
}) {
  const r = 22;
  const cx = 28;
  const cy = 28;
  const startAngle = -210;
  const sweepAngle = 240;
  const pct = value / max;
  const filled = sweepAngle * pct;

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(start: number, end: number) {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const trackPath = describeArc(startAngle, startAngle + sweepAngle);
  const fillPath = describeArc(startAngle, startAngle + filled);

  return (
    <svg viewBox="0 0 56 56" className="w-14 h-14" aria-hidden>
      <path
        d={trackPath}
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="stroke-border"
      />
      <path
        d={fillPath}
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        className={danger ? "stroke-destructive" : "stroke-primary"}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        className="fill-foreground"
        fontSize="10"
        fontWeight="700"
      >
        {value}
      </text>
    </svg>
  );
}

// ── Typing animation ──────────────────────────────────────────────────────────
const INSIGHTS = [
  "Elevated HbA1c — review medication plan",
  "BP trending high over 3 visits",
  "Potential drug interaction flagged",
  "Risk score improved since last review",
];

function TypingInsight() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const target = INSIGHTS[idx % INSIGHTS.length];
    if (typing) {
      if (displayed.length < target.length) {
        const t = setTimeout(
          () => setDisplayed(target.slice(0, displayed.length + 1)),
          28,
        );
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTyping(false), 2200);
        return () => clearTimeout(t);
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 12);
        return () => clearTimeout(t);
      } else {
        setIdx((i) => i + 1);
        setTyping(true);
      }
    }
  }, [displayed, typing, idx]);

  return (
    <span className="font-mono text-xs text-primary">
      {displayed}
      <span className="inline-block w-0.5 h-3 bg-primary ml-0.5 align-middle animate-pulse" />
    </span>
  );
}

// ── Clinical dashboard infographic ────────────────────────────────────────────
function ClinicalPanel() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      className="relative w-full"
    >
      {/* Main panel */}
      <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Panel header bar */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
            </div>
            <span className="text-xs font-mono text-muted-foreground ml-1">
              medintel / patient-view
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              LIVE
            </span>
          </div>
        </div>

        {/* Patient header */}
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">SR</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-card-foreground">
                Sarah R., 42
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                ID-00482 · Last visit 3 days ago
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              Risk Level
            </p>
            <p className="text-sm font-bold text-destructive">Moderate</p>
          </div>
        </div>

        {/* ECG strip */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            ECG · Lead II
          </p>
          {mounted && <EcgLine />}
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-px bg-border mx-4 mb-4 rounded-lg overflow-hidden border border-border">
          {[
            {
              label: "Risk Score",
              node: <ArcGauge value={67} danger />,
              sub: "out of 100",
            },
            {
              label: "AI Confidence",
              node: (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-black text-primary tabular-nums">
                    94%
                  </span>
                  <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "94%" }}
                      transition={{
                        duration: 1.2,
                        delay: 0.8,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ),
              sub: "analysis match",
            },
            {
              label: "Records",
              node: (
                <div className="flex flex-col items-center">
                  <motion.span
                    className="text-2xl font-black text-foreground tabular-nums"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                  >
                    18
                  </motion.span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    files indexed
                  </span>
                </div>
              ),
              sub: "processed",
            },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-card flex flex-col items-center justify-center gap-1 py-3 px-2"
            >
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                {m.label}
              </p>
              {m.node}
            </div>
          ))}
        </div>

        {/* AI insight line */}
        <div className="mx-4 mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex items-start gap-2">
          <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary animate-pulse" />
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">
              AI Insight
            </p>
            <TypingInsight />
          </div>
        </div>

        {/* Lab flags */}
        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
          {[
            { label: "HbA1c", value: "7.8%", flag: "high" },
            { label: "LDL", value: "142", flag: "high" },
            { label: "BP", value: "138/88", flag: "watch" },
          ].map((lab) => (
            <div
              key={lab.label}
              className="rounded-md border border-border bg-card px-2 py-1.5"
            >
              <p className="text-[10px] font-mono text-muted-foreground">
                {lab.label}
              </p>
              <p className="text-sm font-bold text-card-foreground tabular-nums">
                {lab.value}
              </p>
              <span
                className={`text-[9px] font-mono font-bold uppercase ${lab.flag === "high" ? "text-destructive" : "text-chart-4"}`}
              >
                ↑ {lab.flag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating annotation: doctor gets this */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute -bottom-4 -left-4 rounded-lg border border-border bg-card shadow-lg px-3 py-2 flex items-center gap-2"
      >
        <Stethoscope className="h-3.5 w-3.5 text-primary shrink-0" />
        <p className="text-xs font-medium text-card-foreground">
          Doctor sees this <span className="text-primary">before</span>{" "}
          consultation
        </p>
      </motion.div>
    </motion.div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function HeroSection() {
  return (
    <section className="relative border-b border-border overflow-hidden">
      {/* Tight grid background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.035] dark:opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="hero-grid"
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
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:items-center">
          {/* ── LEFT: copy ── */}
          <div className="flex flex-col">
            {/* Kicker label */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-6 flex items-center gap-3"
            >
              <span className="h-px w-8 bg-primary" />
              <span className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-primary">
                Clinical Intelligence Platform
              </span>
            </motion.div>

            {/* Headline — NO gradient */}
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.08}
              className="text-5xl font-black leading-[1.0] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
            >
              Healthcare
              <br />
              data,
              <br />
              <span className="text-primary">made</span>
              <br />
              intelligent.
            </motion.h1>

            {/* Subtext — one sentence, no bullets */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.18}
              className="mt-8 max-w-md text-lg leading-relaxed text-muted-foreground"
            >
              MedIntel processes medical records, surfaces clinical patterns,
              and gives doctors the full picture — before they walk in the room.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.26}
              className="mt-10 flex flex-col sm:flex-row gap-3"
            >
              <Button
                size="lg"
                className="rounded-none px-7 h-12 text-base font-semibold"
                asChild
              >
                <Link href="/signup?role=patient">
                  <HeartPulse className="h-4 w-4" data-icon="inline-start" />
                  Get started free
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-none px-7 h-12 text-base font-semibold"
                asChild
              >
                <Link href="/signup?role=doctor">
                  Join as a doctor
                  <ArrowRight className="h-4 w-4" data-icon="inline-end" />
                </Link>
              </Button>
            </motion.div>

            {/* Proof bar */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.34}
              className="mt-12 flex items-center gap-6 border-t border-border pt-8"
            >
              {[
                { value: "3", label: "User roles" },
                { value: "50+", label: "API endpoints" },
                { value: "256-bit", label: "Encryption" },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={`flex flex-col ${i > 0 ? "pl-6 border-l border-border" : ""}`}
                >
                  <span className="text-2xl font-black tabular-nums text-foreground">
                    {s.value}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {s.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT: clinical infographic ── */}
          <div className="relative pb-8">
            <ClinicalPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
