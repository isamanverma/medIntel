/**
 * Shared TypeScript types used across the frontend.
 *
 * This is the single source of truth for types that mirror the
 * backend's Pydantic models. Both `api-client.ts` and
 * `SessionProvider.tsx` import from here.
 */

// ── User & Auth ──────────────────────────────────────────────────

export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image: string | null;
  auth_provider: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserPublic;
}

// ── API ──────────────────────────────────────────────────────────

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
  role?: string;
}

export interface ApiError {
  detail: string;
}

// ── Session ──────────────────────────────────────────────────────

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthSession {
  user: UserPublic;
}

// ── Helpers ──────────────────────────────────────────────────────

export function roleToDashboard(role: string): string {
  switch (role.toUpperCase()) {
    case "DOCTOR":
      return "/doctor/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    case "PATIENT":
    default:
      return "/patient/dashboard";
  }
}

// ── Domain Models ────────────────────────────────────────────────

export interface PatientProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  blood_group: string | null;
  emergency_contact: string | null;
  // Demographics
  gender: string | null;
  phone: string | null;
  preferred_language: string | null;
  // Medical history
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  past_surgeries: string | null;
  // AI-Powered Condition Discovery
  condition_description: string | null;
  condition_tags: string[] | null;
  // Vitals
  height_cm: number | null;
  weight_kg: number | null;
  blood_pressure: string | null;
  // Insurance
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_group_number: string | null;
  // Address
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_country: string | null;
  created_at: string;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  license_number: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_time: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  notes: string | null;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  total_admins: number;
  total_appointments: number;
  total_reports: number;
  total_treatment_plans: number;
}

export interface MappingDoctor {
  profile_id: string;
  user_id: string; // user UUID — used to open a direct chat room
  first_name: string;
  last_name: string;
  specialization: string;
  mapping_id: string;
}

export interface MappingPatient {
  profile_id: string;
  user_id: string; // user UUID — used to open a direct chat room
  first_name: string;
  last_name: string;
  mapping_id: string;
}

export interface PatientDiscoveryResult {
  profile_id: string;
  first_name: string;
  last_name: string;
  blood_group: string | null;
  gender: string | null;
  age: number | null;
  already_linked: boolean;
  condition_tags: string[] | null;
}

export interface GenerateTagsResponse {
  tags: string[];
  description: string;
}

export interface MedicalReport {
  id: string;
  patient_id: string;
  title: string;
  report_type: string;
  file_url: string | null;
  created_at: string;
}

export interface AdherenceStats {
  total: number;
  taken: number;
  missed: number;
  late: number;
  adherence_percentage: number;
}

// ── Referrals ────────────────────────────────────────────────────

export interface Referral {
  id: string;
  referring_doctor_id: string;
  referred_doctor_id: string;
  patient_id: string;
  reason: string;
  notes: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  created_at: string;
  updated_at: string;
}

// ── Care Teams ───────────────────────────────────────────────────

export interface CareTeamMember {
  id: string;
  doctor_id: string;
  role: string;
  joined_at: string;
}

export interface CareTeam {
  id: string;
  patient_id: string;
  name: string;
  description: string | null;
  members: CareTeamMember[];
  created_at: string;
}

// ── Admin Assignments ────────────────────────────────────────────

export interface AdminAssignment {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  is_active: boolean;
  created_at: string;
}

// — Secure Chat ——————————————————————————————

export interface ChatRoom {
  id: string;
  name: string | null;
  room_type: "DIRECT" | "GROUP";
  created_by: string;
  created_at: string;
  participant_count: number;
}

/** Enriched room returned by GET /api/chat/rooms — drives the full sidebar row. */
export interface ChatRoomEnriched extends ChatRoom {
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  /** user UUID of the other participant (DIRECT rooms only) */
  other_participant_id: string | null;
  /** Display name resolved server-side, e.g. "Dr. Sarah Chen" */
  other_participant_name: string | null;
  /** "DOCTOR" | "PATIENT" | "ADMIN" */
  other_participant_role: string | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  /** Resolved by the backend — null for very old rows before the field existed */
  sender_name: string | null;
  content: string;
  created_at: string;
  is_deleted: boolean;
  /** "TEXT" = normal message | "SYSTEM" = auto-generated event pill */
  message_type: "TEXT" | "SYSTEM";
}

// ── Optimistic messaging ─────────────────────────────────────────

export type MessageStatus = "sending" | "sent" | "failed";

/**
 * A locally-created message that hasn't been confirmed by the server yet.
 * Identified by `tempId` (a client-generated UUID) instead of a real `id`.
 * Rendered with a status indicator (●●● / Failed) in the chat bubble.
 */
export interface OptimisticMessage {
  tempId: string;
  room_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  created_at: string;
  is_deleted: false;
  message_type: "TEXT";
  status: MessageStatus;
}

/** Union used by the message-list renderer — real OR optimistic. */
export type DisplayMessage = ChatMessage | OptimisticMessage;

/** Type guard: true when the message is still pending server confirmation. */
export function isOptimistic(m: DisplayMessage): m is OptimisticMessage {
  return "tempId" in m;
}

/** A user the caller is allowed to start a chat with. */
export interface ChatUserResult {
  id: string;
  name: string;
  role: string;
  /** Ready-to-render label, e.g. "Dr. Sarah Chen · Cardiology" */
  display_label: string;
}

// ── Chat utility helpers ─────────────────────────────────────────

/**
 * Format an ISO timestamp as a compact, human-readable chat time label.
 *
 * Rules:
 *   < 1 minute ago  → "now"
 *   < 1 hour ago    → "Xm"
 *   same day        → "HH:MM"
 *   yesterday       → "Yesterday"
 *   this week       → weekday short name, e.g. "Mon"
 *   older           → "Jan 12"
 */
export function formatChatTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHrs < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  if (diffHrs < 168) {
    // Within the last 7 days → show weekday
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
