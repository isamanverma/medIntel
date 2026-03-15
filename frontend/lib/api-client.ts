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
//
//  Client-side (browser): use RELATIVE URLs so requests go through the
//  Next.js rewrite proxy → same domain → HttpOnly cookie included.
//
//  Server-side (BFF API routes): use the ABSOLUTE backend URL because
//  Next.js API routes run on the server and don't have cookies.
// ---------------------------------------------------------------------------

const ABSOLUTE_BACKEND_URL: string =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.BACKEND_URL ??
  "http://localhost:8000";

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/**
 * Returns "" (empty string = relative URL) on client-side so requests
 * hit the Next.js rewrite proxy, or the absolute URL on server-side.
 */
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Browser: use relative path → Next.js proxy → backend
    return "";
  }
  // Server (BFF routes): call backend directly
  return ABSOLUTE_BACKEND_URL;
}

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
  AdherenceStats,
  AdminStats,
  Appointment,
  DoctorProfile,
  MappingDoctor,
  MappingPatient,
  MedicalReport,
  PatientDiscoveryResult,
  PatientMetricEntry,
  PatientMetricType,
  PatientProfile,
} from "@/lib/types";
import type {
  AdminAssignment,
  CareTeam,
  CareTeamMember,
  Referral,
} from "@/lib/types";
import type {
  ApiError,
  LoginRequest,
  SignupRequest,
  TokenResponse,
  UserPublic,
} from "@/lib/types";
import type { RAGChatSource, ReportInsights } from "@/lib/types";

import type { AssignableUsersResponse } from "@/lib/types";

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
  const url = `${getBaseUrl()}${path}`;

  const res = await fetch(url, {
    ...options,
    credentials: "include", // ← sends the HttpOnly cookie automatically
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
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
    if (res.status === 401) {
      unauthorizedHandler?.();
    }
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

// — Patient Discovery ————————————————————————————

export interface DiscoverPatientsParams {
  q?: string;
  blood_group?: string;
  gender?: string;
  tag?: string;
  limit?: number;
}

export interface CreatePatientMetricEntryData {
  metric_type: PatientMetricType;
  value: string;
  recorded_at?: string;
  notes?: string;
}

export interface ListPatientMetricsParams {
  metric_type?: PatientMetricType;
  limit?: number;
}

export async function discoverPatients(
  params: DiscoverPatientsParams = {},
): Promise<PatientDiscoveryResult[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.blood_group) qs.set("blood_group", params.blood_group);
  if (params.gender) qs.set("gender", params.gender);
  if (params.tag) qs.set("tag", params.tag);
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<PatientDiscoveryResult[]>(
    `/api/mappings/discover-patients${query ? `?${query}` : ""}`,
  );
}

// — AI Tag Generation ————————————————————————————

export async function generateConditionTags(
  description: string,
): Promise<import("@/lib/types").GenerateTagsResponse> {
  return request<import("@/lib/types").GenerateTagsResponse>(
    "/api/profiles/patient/generate-tags",
    {
      method: "POST",
      body: JSON.stringify({ description }),
    },
  );
}

export async function createPatientMetricEntry(
  data: CreatePatientMetricEntryData,
): Promise<PatientMetricEntry> {
  return request<PatientMetricEntry>("/api/profiles/patient/metrics", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listPatientMetricEntries(
  params: ListPatientMetricsParams = {},
): Promise<PatientMetricEntry[]> {
  const qs = new URLSearchParams();
  if (params.metric_type) qs.set("metric_type", params.metric_type);
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<PatientMetricEntry[]>(
    `/api/profiles/patient/metrics${query ? `?${query}` : ""}`,
  );
}

// — Reports ——————————————————————————————————————

export async function getMyReports(
  patientId: string,
): Promise<MedicalReport[]> {
  return request<MedicalReport[]>(`/api/reports/patient/${patientId}`);
}

export async function uploadReport(
  formData: FormData,
): Promise<MedicalReport> {
  const url = `${getBaseUrl()}/api/reports/upload`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData, // multipart — do NOT set Content-Type manually
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const detail =
      (body as { detail?: string } | null)?.detail ??
      `Upload failed with ${res.status}`;
    throw new BackendError(res.status, detail);
  }
  return body as MedicalReport;
}

export async function getReportInsights(
  patientId: string,
): Promise<ReportInsights> {
  return request<ReportInsights>(
    `/api/reports/patient/${patientId}/insights`,
  );
}

export interface RAGChatResponse {
  answer: string;
  sources: RAGChatSource[];
}

export async function sendRAGQuery(
  query: string,
  patientId: string,
): Promise<RAGChatResponse> {
  return request<RAGChatResponse>("/api/reports/rag-chat", {
    method: "POST",
    body: JSON.stringify({ query, patient_id: patientId }),
  });
}

// — Adherence —————————————————————————————————————

export async function getAdherenceStats(
  patientId: string,
): Promise<AdherenceStats> {
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
  data: CreatePatientProfileData,
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
  data: CreateDoctorProfileData,
): Promise<DoctorProfile> {
  return request<DoctorProfile>("/api/profiles/doctor", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface UpdateDoctorProfileData {
  first_name?: string;
  last_name?: string;
  specialization?: string;
  license_number?: string;
}

export async function updateDoctorProfile(
  data: UpdateDoctorProfileData,
): Promise<DoctorProfile> {
  return request<DoctorProfile>("/api/profiles/doctor/me", {
    method: "PUT",
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
  data: CreateAppointmentData,
): Promise<Appointment> {
  return request<Appointment>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: string,
  meeting_notes?: string,
): Promise<Appointment> {
  return request<Appointment>(`/api/appointments/${appointmentId}`, {
    method: "PUT",
    body: JSON.stringify({ status, meeting_notes }),
  });
}

// — Create Mappings ——————————————————————————————

export interface CreateMappingData {
  patient_id: string;
}

export async function createMapping(
  data: CreateMappingData,
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
  data: CreateTreatmentPlanData,
): Promise<TreatmentPlan> {
  return request<TreatmentPlan>("/api/treatment-plans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPatientTreatmentPlans(
  patientId: string,
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
  data: Partial<
    CreatePatientProfileData & {
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
      condition_description?: string;
      condition_tags?: string[];
    }
  >,
): Promise<PatientProfile> {
  return request<PatientProfile>("/api/profiles/patient/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// — Referrals —————————————————————————————————————


export interface CreateReferralData {
  referred_doctor_id: string;
  patient_id: string;
  reason: string;
  notes?: string;
}

export async function createReferral(
  data: CreateReferralData,
): Promise<Referral> {
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
  status: "ACCEPTED" | "DECLINED",
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

export async function createCareTeam(
  data: CreateCareTeamData,
): Promise<CareTeam> {
  return request<CareTeam>("/api/care-teams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function addCareTeamMember(
  teamId: string,
  data: { doctor_id: string; role?: string },
): Promise<CareTeamMember> {
  return request<CareTeamMember>(`/api/care-teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPatientCareTeams(
  patientId: string,
): Promise<CareTeam[]> {
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

export interface UpdateAssignmentData {
  doctor_id: string;
}

export async function getAssignableUsers(): Promise<AssignableUsersResponse> {
  return request<AssignableUsersResponse>("/api/admin/assignable");
}

export async function createAssignment(
  data: CreateAssignmentData,
): Promise<AdminAssignment> {
  return request<AdminAssignment>("/api/admin/assignments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAssignment(
  assignmentId: string,
  data: UpdateAssignmentData,
): Promise<AdminAssignment> {
  return request<AdminAssignment>(`/api/admin/assignments/${assignmentId}`, {
    method: "PATCH",
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

// — Admin User Controls ——————————————————————————————

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<AdminUser> {
  return request<AdminUser>(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function updateUserStatus(
  userId: string,
  is_active: boolean,
): Promise<AdminUser> {
  return request<AdminUser>(`/api/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await request<void>(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
}

// ── Secure Chat ───────────────────────────────────────────────────────────────

/**
 * Create a new chat room.
 * For DIRECT rooms with one participant the server is idempotent:
 * if a room already exists between the two users it is returned unchanged.
 */
export async function createChatRoom(data: {
  name?: string;
  room_type?: string;
  participant_ids: string[];
}) {
  return request<import("./types").ChatRoomEnriched>("/api/chat/rooms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * List all rooms the current user participates in.
 * Each item is enriched with last-message preview, unread count, and
 * the other participant's name + role (for DIRECT rooms).
 */
export async function getChatRooms() {
  return request<import("./types").ChatRoomEnriched[]>("/api/chat/rooms");
}

/**
 * Fetch the initial page of messages for a room (last 50, oldest-first).
 */
export async function getChatMessages(roomId: string) {
  return request<import("./types").ChatMessage[]>(
    `/api/chat/rooms/${roomId}/messages`,
  );
}

/**
 * Polling delta — fetch only messages newer than the given ISO timestamp.
 * Returns an empty array when nothing has changed, which is the common case.
 */
export async function getChatMessagesSince(
  roomId: string,
  since: string,
): Promise<import("./types").ChatMessage[]> {
  return request<import("./types").ChatMessage[]>(
    `/api/chat/rooms/${roomId}/messages?since=${encodeURIComponent(since)}`,
  );
}

/**
 * Load-more / infinite scroll — fetch messages older than the given ISO timestamp.
 * Returns at most 50 messages, oldest-first.
 */
export async function getChatMessagesPage(
  roomId: string,
  before: string,
): Promise<import("./types").ChatMessage[]> {
  return request<import("./types").ChatMessage[]>(
    `/api/chat/rooms/${roomId}/messages?before=${encodeURIComponent(before)}&limit=50`,
  );
}

/**
 * Send a message to a room.
 * The caller should optimistically insert the message before awaiting this.
 */
export async function sendChatMessage(
  roomId: string,
  content: string,
): Promise<import("./types").ChatMessage> {
  return request<import("./types").ChatMessage>(
    `/api/chat/rooms/${roomId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
}

/**
 * Admin-only soft delete.
 * SYSTEM messages are immutable and the server will reject deletion attempts.
 */
export async function deleteChatMessage(
  roomId: string,
  messageId: string,
): Promise<void> {
  await request<void>(`/api/chat/rooms/${roomId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

/**
 * Stamp last_read_at = now() for the calling user in this room.
 * Call this every time the user opens or switches to a room so the unread
 * badge is cleared in subsequent getChatRooms() responses.
 */
export async function markRoomRead(roomId: string): Promise<void> {
  await request<void>(`/api/chat/rooms/${roomId}/read`, {
    method: "PATCH",
  });
}

/**
 * Search users the caller is allowed to start a chat with.
 * Results are visibility-scoped by the server:
 *   Patient → only their linked doctors
 *   Doctor  → linked patients + all other doctors
 *   Admin   → all active users
 */
export async function searchChatUsers(
  q: string,
): Promise<import("./types").ChatUserResult[]> {
  return request<import("./types").ChatUserResult[]>(
    `/api/chat/users/searchable?q=${encodeURIComponent(q)}`,
  );
}

// ── Video Calling ─────────────────────────────────────────────────────────────

export interface VideoTokenResponse {
  cometchat_uid: string;
  auth_token: string;
  app_id: string;
  region: string;
}

export interface CallEligibilityResponse {
  eligible: boolean;
  reason: string;
  appointment_id: string;
  scheduled_time: string;
  other_party_cometchat_uid: string | null;
  other_party_name: string | null;
}

/**
 * Provision the current user in CometChat and return a fresh auth token.
 * Safe to call on every page load — idempotent on the server.
 */
export async function getVideoToken(): Promise<VideoTokenResponse> {
  return request<VideoTokenResponse>("/api/video/token", { method: "POST" });
}

/**
 * Check whether a video call button should be shown for the given appointment.
 * Eligibility window: scheduled_time − 5 min → + 60 min (CONFIRMED only).
 */
export async function getCallEligibility(
  appointmentId: string,
): Promise<CallEligibilityResponse> {
  return request<CallEligibilityResponse>(
    `/api/video/eligibility/${appointmentId}`,
  );
}
