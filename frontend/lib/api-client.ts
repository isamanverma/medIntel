/**
 * Centralized API client for direct browser → FastAPI communication.
 *
 * This client is used by client components that need to fetch data
 * directly from the FastAPI backend (after authentication).  The
 * HttpOnly cookie (`access_token`) set by the Next.js BFF proxy is
 * automatically included on every request thanks to `credentials: "include"`.
 *
 * For auth operations (signup, login, logout) the browser always talks
 * to the Next.js BFF routes (`/api/auth/*`) — never directly to FastAPI.
 * Those BFF routes handle token extraction and cookie management.
 *
 * Architecture:
 *   Browser (data fetching)
 *     → api-client.ts (this file, credentials: "include")
 *       → FastAPI (reads the HttpOnly cookie / Bearer token)
 *
 *   Browser (auth operations)
 *     → /api/auth/* (Next.js BFF proxy)
 *       → lib/api-client.ts (server-side, no cookies needed — passes token explicitly)
 *         → FastAPI
 */

// ---------------------------------------------------------------------------
//  Backend base URL
// ---------------------------------------------------------------------------

const BACKEND_URL: string =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.BACKEND_URL ??
  "http://localhost:8000";

// ---------------------------------------------------------------------------
//  Re-export shared types for convenience
// ---------------------------------------------------------------------------

export type {
  UserRole,
  UserPublic,
  TokenResponse,
  ApiError,
  SignupRequest,
  LoginRequest,
} from "@/lib/types";

import type {
  UserPublic,
  ApiError,
  TokenResponse,
  SignupRequest,
  LoginRequest,
} from "@/lib/types";

// ---------------------------------------------------------------------------
//  Custom error class
// ---------------------------------------------------------------------------

export class BackendError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = "BackendError";
  }
}

// ---------------------------------------------------------------------------
//  Low-level fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Generic request helper.
 *
 * - Automatically sets `Content-Type: application/json`.
 * - Includes credentials (cookies) on every request so the FastAPI
 *   backend can read the `access_token` HttpOnly cookie.
 * - Throws a typed `BackendError` for non-2xx responses.
 *
 * @param path   — URL path relative to the backend base (e.g. `/api/auth/me`)
 * @param options — standard `RequestInit` overrides
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BACKEND_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    credentials: "include", // ← sends the HttpOnly cookie automatically
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Try to parse JSON regardless of status to capture `detail` field
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const detail =
      (body as ApiError | null)?.detail ??
      `Backend responded with ${res.status}`;
    throw new BackendError(res.status, detail);
  }

  return body as T;
}

// ---------------------------------------------------------------------------
//  Auth API — called from Next.js BFF routes (server-side)
//
//  These do NOT set `credentials: "include"` because they run on the
//  server where there is no cookie jar.  The BFF route extracts the
//  token from the FastAPI response and sets the HttpOnly cookie itself.
// ---------------------------------------------------------------------------

/**
 * Register a new user.  Returns a JWT token + public user profile.
 *
 * Called by: `app/api/auth/signup/route.ts` (BFF proxy, server-side)
 */
export async function signup(data: SignupRequest): Promise<TokenResponse> {
  return request<TokenResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Verify email + password.  Returns a JWT token + public user profile.
 *
 * Called by: `app/api/auth/login/route.ts` (BFF proxy, server-side)
 */
export async function login(data: LoginRequest): Promise<TokenResponse> {
  return request<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
//  Data API — called directly from the browser (client-side)
//
//  The `credentials: "include"` in the base `request()` function ensures
//  the HttpOnly `access_token` cookie is sent with every call.
// ---------------------------------------------------------------------------

/**
 * Fetch the currently-authenticated user's profile.
 *
 * Called by: client components that need session data.
 */
export async function getMe(): Promise<UserPublic> {
  return request<UserPublic>("/api/auth/me", {
    method: "GET",
  });
}


// ---------------------------------------------------------------------------
//  Domain API — called directly from the browser (client-side)
// ---------------------------------------------------------------------------

import type {
  PatientProfile,
  DoctorProfile,
  Appointment,
  AdminStats,
  MappingDoctor,
  MappingPatient,
  MedicalReport,
  AdherenceStats,
} from "@/lib/types";

// — Profiles ——————————————————————————————————————

export async function getMyPatientProfile(): Promise<PatientProfile> {
  return request<PatientProfile>("/api/profiles/patient/me");
}

export async function getMyDoctorProfile(): Promise<DoctorProfile> {
  return request<DoctorProfile>("/api/profiles/doctor/me");
}

// — Appointments ——————————————————————————————————

export async function getUpcomingAppointments(): Promise<Appointment[]> {
  return request<Appointment[]>("/api/appointments/upcoming");
}

export async function getAppointmentHistory(): Promise<Appointment[]> {
  return request<Appointment[]>("/api/appointments/history");
}

// — Mappings ——————————————————————————————————————

export async function getMyDoctors(): Promise<MappingDoctor[]> {
  return request<MappingDoctor[]>("/api/mappings/my-doctors");
}

export async function getMyPatients(): Promise<MappingPatient[]> {
  return request<MappingPatient[]>("/api/mappings/my-patients");
}

// — Reports ——————————————————————————————————————

export async function getMyReports(patientId: string): Promise<MedicalReport[]> {
  return request<MedicalReport[]>(`/api/reports/patient/${patientId}`);
}

// — Adherence —————————————————————————————————————

export async function getAdherenceStats(patientId: string): Promise<AdherenceStats> {
  return request<AdherenceStats>(`/api/adherence/stats/${patientId}`);
}

// — Admin —————————————————————————————————————————

export async function getAdminStats(): Promise<AdminStats> {
  return request<AdminStats>("/api/admin/stats");
}


// ---------------------------------------------------------------------------
//  Mutation API — POST / PATCH / DELETE (called from forms)
// ---------------------------------------------------------------------------

// — Create Profiles ———————————————————————————————

export interface CreatePatientProfileData {
  first_name: string;
  last_name: string;
  date_of_birth: string; // YYYY-MM-DD
  blood_group: string;
  emergency_contact: string;
}

export async function createPatientProfile(
  data: CreatePatientProfileData
): Promise<PatientProfile> {
  return request<PatientProfile>("/api/profiles/patient", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface CreateDoctorProfileData {
  first_name: string;
  last_name: string;
  specialization: string;
  license_number: string;
}

export async function createDoctorProfile(
  data: CreateDoctorProfileData
): Promise<DoctorProfile> {
  return request<DoctorProfile>("/api/profiles/doctor", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// — Create Appointments ——————————————————————————

export interface CreateAppointmentData {
  patient_id: string;
  doctor_id: string;
  scheduled_time: string; // ISO datetime
  meeting_notes?: string;
}

export async function createAppointment(
  data: CreateAppointmentData
): Promise<Appointment> {
  return request<Appointment>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: string,
  meeting_notes?: string
): Promise<Appointment> {
  return request<Appointment>(`/api/appointments/${appointmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, meeting_notes }),
  });
}

// — Create Mappings ——————————————————————————————

export interface CreateMappingData {
  patient_id: string;
}

export async function createMapping(
  data: CreateMappingData
): Promise<{ id: string }> {
  return request<{ id: string }>("/api/mappings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteMapping(mappingId: string): Promise<void> {
  await request<void>(`/api/mappings/${mappingId}`, {
    method: "DELETE",
  });
}

// — Treatment Plans ——————————————————————————————

export interface CreateTreatmentPlanData {
  patient_id: string;
  title: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string;
}

export interface TreatmentPlan {
  id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
}

export async function createTreatmentPlan(
  data: CreateTreatmentPlanData
): Promise<TreatmentPlan> {
  return request<TreatmentPlan>("/api/treatment-plans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPatientTreatmentPlans(
  patientId: string
): Promise<TreatmentPlan[]> {
  return request<TreatmentPlan[]>(`/api/treatment-plans/patient/${patientId}`);
}

// — Admin: User List —————————————————————————————

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  return request<AdminUser[]>("/api/admin/users");
}

// — Update Patient Profile ——————————————————————————

export async function updatePatientProfile(
  data: Partial<CreatePatientProfileData & {
    gender?: string;
    phone?: string;
    preferred_language?: string;
    allergies?: string[];
    chronic_conditions?: string[];
    past_surgeries?: string;
    height_cm?: number;
    weight_kg?: number;
    blood_pressure?: string;
    insurance_provider?: string;
    insurance_policy_number?: string;
    insurance_group_number?: string;
    address_street?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
    address_country?: string;
  }>
): Promise<PatientProfile> {
  return request<PatientProfile>("/api/profiles/patient/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// — Referrals —————————————————————————————————————

import type { Referral, CareTeam, CareTeamMember, AdminAssignment } from "@/lib/types";

export interface CreateReferralData {
  referred_doctor_id: string;
  patient_id: string;
  reason: string;
  notes?: string;
}

export async function createReferral(data: CreateReferralData): Promise<Referral> {
  return request<Referral>("/api/referrals", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSentReferrals(): Promise<Referral[]> {
  return request<Referral[]>("/api/referrals/sent");
}

export async function getReceivedReferrals(): Promise<Referral[]> {
  return request<Referral[]>("/api/referrals/received");
}

export async function updateReferralStatus(
  referralId: string,
  status: "ACCEPTED" | "DECLINED"
): Promise<Referral> {
  return request<Referral>(`/api/referrals/${referralId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// — Care Teams ————————————————————————————————————

export interface CreateCareTeamData {
  patient_id: string;
  name: string;
  description?: string;
}

export async function createCareTeam(data: CreateCareTeamData): Promise<CareTeam> {
  return request<CareTeam>("/api/care-teams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function addCareTeamMember(
  teamId: string,
  data: { doctor_id: string; role?: string }
): Promise<CareTeamMember> {
  return request<CareTeamMember>(`/api/care-teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPatientCareTeams(patientId: string): Promise<CareTeam[]> {
  return request<CareTeam[]>(`/api/care-teams/patient/${patientId}`);
}

export async function getDoctorCareTeams(): Promise<CareTeam[]> {
  return request<CareTeam[]>("/api/care-teams/doctor/me");
}

// — Admin Assignments —————————————————————————————

export interface CreateAssignmentData {
  patient_id: string;
  doctor_id: string;
}

export async function createAssignment(data: CreateAssignmentData): Promise<AdminAssignment> {
  return request<AdminAssignment>("/api/admin/assignments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getAssignments(): Promise<AdminAssignment[]> {
  return request<AdminAssignment[]>("/api/admin/assignments");
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  await request<void>(`/api/admin/assignments/${assignmentId}`, {
    method: "DELETE",
  });
}
