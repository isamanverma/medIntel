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
