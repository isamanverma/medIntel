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
    id: string;
    first_name: string;
    last_name: string;
    specialization: string;
}

export interface MappingPatient {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
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

export interface ChatMessage {
    id: string;
    room_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_deleted: boolean;
}
