import type { Transition, Variants } from "motion/react";

// ─── Easing curves ────────────────────────────────────────────────────────────

export const ease = {
  /** Smooth spring-like ease — use for most entrance animations */
  spring: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** Standard ease-out */
  out: [0, 0, 0.2, 1] as [number, number, number, number],
  /** Standard ease-in-out */
  inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const;

// ─── Reusable transitions ──────────────────────────────────────────────────────

export const transition = {
  fast: { duration: 0.25, ease: ease.spring } satisfies Transition,
  base: { duration: 0.45, ease: ease.spring } satisfies Transition,
  slow: { duration: 0.65, ease: ease.spring } satisfies Transition,
  fade: { duration: 0.3, ease: ease.out } satisfies Transition,
} as const;

// ─── Variant factories ─────────────────────────────────────────────────────────

/**
 * Fade + slide up. Pass delay (seconds) via the `custom` prop on motion elements.
 *
 * Usage:
 *   <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.1} />
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: ease.spring, delay },
  }),
};

/**
 * Fade + slide down. Useful for dropdowns / overlays.
 */
export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: ease.spring, delay },
  }),
};

/**
 * Pure fade. Minimal distraction.
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.4, ease: ease.out, delay },
  }),
};

/**
 * Scale up from slightly smaller. Good for cards & modals.
 */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: ease.spring, delay },
  }),
};

/**
 * Stagger container — use on the parent wrapper.
 * Children pick up stagger automatically via `staggerChildren`.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0,
    },
  },
};

/**
 * Card stagger child — pairs with `staggerContainer`.
 */
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: ease.spring },
  },
};

/**
 * Slide in from the left. Delay via `custom` prop.
 */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: ease.spring, delay },
  }),
};
