# MASTER BUILD PROMPT — MedIntel: Production-Grade Healthcare Intelligence Platform

You are a senior full-stack engineer building **MedIntel**, a production-grade AI-driven healthcare intelligence ecosystem for a capstone project that will be evaluated at a professional standard.

**Architecture Decision: Separate Frontend Applications**

MedIntel uses a **monorepo with isolated frontends** strategy:
- `backend/` — Shared FastAPI service
- `frontend-patient/` — Patient-facing Next.js application
- `frontend-doctor/` — Provider-facing Next.js application

This separation provides:
- **Clear boundaries** between user experiences
- **Independent deployment** cycles
- **Optimized builds** (no unused code shipping to patients)
- **Team scalability** (different developers can own different frontends)
- **Security isolation** (patient app never loads doctor-only code)

---

## Engineering Philosophy

**Build like a funded startup, not a student demo.**

- Write maintainable, production-ready code that a real engineering team would be proud to own
- Make confident architectural decisions without endless deliberation
- Favor clarity and debuggability over premature optimization
- Keep explanations technical and concise—code should speak for itself
- If something feels over-engineered, ruthlessly simplify it
- **Think system-level**: every component should contribute to the intelligence layer

---

## Core Technology Stack

### Backend (Shared Service)
- **Python 3.11+**
- **FastAPI** (async-first architecture)
- **Uvicorn** (ASGI server)
- **Supabase** (Postgres + Auth + Storage)
- **Qdrant** (vector database for semantic retrieval)
- **Pydantic v2** (validation & serialization)

### Frontend-Patient (Consumer Experience)
- **Next.js 14+** (App Router)
- **TypeScript 5+** (strict mode)
- **Zustand** (minimal client state)
- **Tailwind CSS** (mobile-first, accessible design)
- **React Server Components** (default pattern)

### Frontend-Doctor (Clinical Workstation)
- **Next.js 14+** (App Router)
- **TypeScript 5+** (strict mode)
- **Zustand** (minimal client state)
- **Tailwind CSS** (information-dense, desktop-optimized)
- **React Server Components** (default pattern)

### AI/ML Layer (Backend)
- **LangChain/LlamaIndex** (RAG orchestration—keep it transparent)
- **OpenAI/Anthropic APIs** (LLM inference)
- **spaCy/Transformers** (NLP preprocessing)
- **scikit-learn** (predictive models)

---

## Non-Negotiable Architecture Principles

1. **No file exceeds 300 LOC** (unless it's a well-justified schema/config file)
2. **Single Responsibility Principle** — one concern per module
3. **Business logic lives in backend only** — frontends are presentation layers
4. **No code duplication across frontends** — use shared npm packages for common code
5. **Explicit over implicit** — no magic, no hidden behavior
6. **API-first design** — backend is the single source of truth
7. **Intelligence as a first-class concern** — AI/ML is not bolted on, it's core infrastructure
8. **Frontend independence** — patient and doctor apps can deploy separately

---

## Project Structure (Monorepo)

```
medintel/
├── backend/
│   ├── app/
│   │   ├── domains/          # domain-driven organization
│   │   ├── core/             # shared infrastructure
│   │   ├── intelligence/     # AI/ML layer
│   │   └── integrations/     # external services
│   ├── tests/
│   ├── alembic/              # database migrations
│   ├── pyproject.toml
│   └── .env.example
│
├── frontend-patient/
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   ├── features/         # patient-specific features
│   │   ├── shared/           # UI components, utilities
│   │   └── lib/              # API client, utilities
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
│
├── frontend-doctor/
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   ├── features/         # provider-specific features
│   │   ├── shared/           # UI components, utilities
│   │   └── lib/              # API client, utilities
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
│
├── packages/                 # shared code (optional, for mature projects)
│   ├── shared-types/         # TypeScript definitions shared by both frontends
│   └── api-client/           # typed API client (OpenAPI generated)
│
├── docker-compose.yml        # local development environment
└── README.md
```

---

## Backend Architecture (Domain-Driven Design)

Organize by **clinical domain**, not technical layers.

```
backend/
├── app/
│   ├── domains/
│   │   ├── auth/
│   │   │   ├── router.py       # HTTP layer
│   │   │   ├── service.py      # business logic
│   │   │   ├── repository.py   # data access
│   │   │   └── models.py       # Pydantic schemas
│   │   ├── patients/
│   │   ├── providers/          # doctors, nurses, specialists
│   │   ├── appointments/
│   │   ├── documents/          # medical records, imaging, labs
│   │   ├── vitals/
│   │   ├── diagnostics/        # NLP parsing, structured extraction
│   │   ├── analytics/          # predictive models, insights
│   │   └── claims/             # operational intelligence (optional)
│   │
│   ├── core/
│   │   ├── config.py           # environment-based settings
│   │   ├── security.py         # auth, RBAC, encryption
│   │   ├── database.py         # connection management
│   │   ├── middleware.py       # logging, error handling, CORS
│   │   └── dependencies.py     # FastAPI dependency injection
│   │
│   ├── intelligence/           # CRITICAL: MedIntel's brain
│   │   ├── nlp/
│   │   │   ├── extractors.py   # clinical entity recognition
│   │   │   ├── parsers.py      # document → structured data
│   │   │   └── embeddings.py   # vectorization pipeline
│   │   ├── ml/
│   │   │   ├── predictive.py   # risk scoring, outcome prediction
│   │   │   ├── clustering.py   # patient cohorts, pattern detection
│   │   │   └── explainability.py # model interpretation
│   │   ├── retrieval/
│   │   │   ├── rag_engine.py   # context-aware document retrieval
│   │   │   └── query_optimizer.py
│   │   └── orchestrator.py     # coordinates intelligence workflows
│   │
│   └── integrations/
│       ├── supabase_client.py
│       ├── qdrant_client.py
│       ├── llm_provider.py     # LLM abstraction layer
│       └── fhir_adapter.py     # optional: healthcare interop
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
│
└── main.py                     # FastAPI application entry point
```

### Layer Responsibilities (Strict Enforcement)

- **router.py** → HTTP request/response only, role-based access control
- **service.py** → orchestrates business rules, delegates to repos/ML
- **repository.py** → database operations only
- **models.py** → request/response validation, serialization
- **ml.py** → domain-specific AI/ML operations

**Critical**: Backend must enforce role-based access at the API level. Patient endpoints and doctor endpoints should have separate authorization logic.

```python
# Example: domains/patients/router.py
@router.get("/patients/{patient_id}", response_model=PatientDetail)
async def get_patient(
    patient_id: str,
    current_user: User = Depends(get_current_user)
):
    # Patients can only access their own data
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(status_code=403)
    
    # Providers can access any patient
    if current_user.role not in ["patient", "provider"]:
        raise HTTPException(status_code=403)
    
    return await patient_service.get_patient(patient_id)
```

**Never skip layers. Never mix responsibilities.**

---

## Frontend-Patient Architecture

**Design Philosophy**: Simple, mobile-first, empowering

### Structure

```
frontend-patient/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout (auth provider, theme)
│   │   ├── page.tsx                # landing page
│   │   ├── (auth)/                 # route group
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/            # route group (requires auth)
│   │   │   ├── layout.tsx          # dashboard layout
│   │   │   ├── page.tsx            # dashboard home
│   │   │   ├── appointments/
│   │   │   ├── documents/
│   │   │   ├── vitals/
│   │   │   ├── history/
│   │   │   └── profile/
│   │   └── api/                    # Next.js API routes (minimal)
│   │
│   ├── features/
│   │   ├── appointments/
│   │   │   ├── components/
│   │   │   │   ├── AppointmentCard.tsx
│   │   │   │   ├── BookingForm.tsx (Client Component)
│   │   │   │   └── AppointmentList.tsx (Server Component)
│   │   │   ├── hooks/
│   │   │   │   └── useAppointmentBooking.ts
│   │   │   ├── api/
│   │   │   │   └── appointmentApi.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── documents/
│   │   │   ├── components/
│   │   │   │   ├── DocumentUpload.tsx (Client Component)
│   │   │   │   ├── DocumentViewer.tsx
│   │   │   │   └── DocumentList.tsx (Server Component)
│   │   │   ├── hooks/
│   │   │   └── api/
│   │   │
│   │   ├── vitals/
│   │   │   ├── components/
│   │   │   │   ├── VitalsForm.tsx (Client Component)
│   │   │   │   ├── VitalsChart.tsx (Client Component)
│   │   │   │   └── VitalsHistory.tsx (Server Component)
│   │   │   ├── hooks/
│   │   │   └── api/
│   │   │
│   │   └── auth/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── state/
│   │           └── authStore.ts (Zustand)
│   │
│   ├── shared/
│   │   ├── ui/                     # reusable components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── types/                  # shared TypeScript definitions
│   │   ├── lib/
│   │   │   ├── apiClient.ts        # axios/fetch wrapper
│   │   │   ├── formatters.ts       # date, currency, etc.
│   │   │   └── validators.ts
│   │   └── constants/
│   │       └── routes.ts
│   │
│   └── middleware.ts               # auth protection, redirects
│
├── public/
│   ├── images/
│   └── icons/
│
└── tailwind.config.ts
```

### Design Priorities for Patient App
- **Mobile-first** — 70% of patients use mobile
- **Large touch targets** — minimum 44x44px
- **Simple navigation** — max 3 levels deep
- **Accessibility** — WCAG 2.1 AA compliance
- **Progressive disclosure** — don't overwhelm with options
- **Clear CTAs** — "Book Appointment", "Upload Document"

---

## Frontend-Doctor Architecture

**Design Philosophy**: Information-dense, desktop-optimized, efficient

### Structure

```
frontend-doctor/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout
│   │   ├── page.tsx                # provider dashboard
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (workspace)/            # route group (requires provider role)
│   │   │   ├── layout.tsx          # workspace layout (sidebar, search)
│   │   │   ├── page.tsx            # today's schedule
│   │   │   ├── patients/
│   │   │   │   ├── page.tsx        # patient list
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # patient overview
│   │   │   │       ├── documents/
│   │   │   │       ├── vitals/
│   │   │   │       └── history/
│   │   │   ├── appointments/
│   │   │   ├── analytics/          # population health insights
│   │   │   └── settings/
│   │   └── api/
│   │
│   ├── features/
│   │   ├── patients/
│   │   │   ├── components/
│   │   │   │   ├── PatientSearch.tsx (Client Component)
│   │   │   │   ├── PatientOverview.tsx (Server Component)
│   │   │   │   ├── RiskScoreCard.tsx
│   │   │   │   └── VitalsTrendChart.tsx (Client Component)
│   │   │   ├── hooks/
│   │   │   │   └── usePatientSearch.ts
│   │   │   └── api/
│   │   │
│   │   ├── intelligence/           # AI-powered features
│   │   │   ├── components/
│   │   │   │   ├── PatientSummary.tsx (AI-generated)
│   │   │   │   ├── ClinicalInsights.tsx
│   │   │   │   ├── DrugInteractionWarnings.tsx
│   │   │   │   └── SuggestedDiagnostics.tsx
│   │   │   └── api/
│   │   │
│   │   ├── documents/
│   │   │   ├── components/
│   │   │   │   ├── DocumentTimeline.tsx (Server Component)
│   │   │   │   ├── DocumentSearch.tsx (Client Component - semantic)
│   │   │   │   ├── EntityExtraction.tsx
│   │   │   │   └── DocumentViewer.tsx
│   │   │   └── api/
│   │   │
│   │   ├── analytics/
│   │   │   ├── components/
│   │   │   │   ├── PopulationDashboard.tsx
│   │   │   │   ├── ReadmissionTrends.tsx
│   │   │   │   └── PatientCohorts.tsx
│   │   │   └── api/
│   │   │
│   │   ├── appointments/
│   │   │   ├── components/
│   │   │   │   ├── ScheduleCalendar.tsx (Client Component)
│   │   │   │   ├── AppointmentQueue.tsx
│   │   │   │   └── EncounterNotes.tsx
│   │   │   └── api/
│   │   │
│   │   └── auth/
│   │       ├── components/
│   │       └── state/
│   │           └── authStore.ts (Zustand)
│   │
│   ├── shared/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── DataTable.tsx          # complex table for patient lists
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Badge.tsx
│   │   ├── types/
│   │   ├── lib/
│   │   │   ├── apiClient.ts
│   │   │   ├── chartUtils.ts
│   │   │   └── clinicalFormatters.ts  # ICD codes, vitals display
│   │   └── constants/
│   │       ├── routes.ts
│   │       └── clinicalCodes.ts       # ICD-10, LOINC
│   │
│   └── middleware.ts                   # provider role enforcement
│
└── tailwind.config.ts
```

### Design Priorities for Doctor App
- **Desktop-first** — optimized for 1920x1080+
- **Information density** — show more data per screen
- **Keyboard shortcuts** — power user efficiency
- **Multi-tab workflows** — support multiple patients
- **Fast data scanning** — tables, charts, timelines
- **Contextual AI** — insights appear when relevant

---

## Shared Code Strategy

### Option 1: Simple Duplication (Recommended for Capstone)
- Copy shared components/utilities between frontends
- Keeps projects independent
- Easier to customize per-audience
- No build tooling complexity

### Option 2: Shared Packages (Advanced)
If you want to demonstrate monorepo expertise:

```
packages/
├── shared-types/
│   ├── package.json
│   ├── src/
│   │   ├── api/              # API request/response types
│   │   ├── entities/         # Patient, Appointment, etc.
│   │   └── index.ts
│   └── tsconfig.json
│
└── api-client/
    ├── package.json
    ├── src/
    │   ├── client.ts         # base axios instance
    │   ├── patients.ts       # patient endpoints
    │   ├── appointments.ts
    │   └── index.ts
    └── tsconfig.json
```

Then in each frontend:
```json
// frontend-patient/package.json
{
  "dependencies": {
    "@medintel/shared-types": "workspace:*",
    "@medintel/api-client": "workspace:*"
  }
}
```

**Decision Rule**: Use Option 1 unless you have extra time and want to showcase monorepo tooling (pnpm workspaces, Turborepo).

---

## Next.js Architecture Rules (Both Frontends)

### Server Components by Default

**Critical Mindset**: MedIntel is data-heavy. Fetch on the server, deliver fast.

### When to Use Client Components

**Only use `"use client"` when absolutely necessary:**

**Patient App:**
- File upload interfaces
- Vitals input forms
- Appointment booking calendar
- Interactive charts (vitals trends)
- Zustand state access

**Doctor App:**
- Patient search with autocomplete
- Real-time vitals monitoring
- Interactive dashboards (charts with filters)
- Document viewer with annotations
- Calendar/schedule management

**Default to Server Components for:**

**Patient App:**
- Appointment list
- Document list
- Medical history display
- Profile information

**Doctor App:**
- Patient overview
- Document timeline
- Analytics reports
- Appointment queue

### Example: Patient Dashboard (Server Component)

```tsx
// frontend-patient/src/app/(dashboard)/page.tsx
import { getUpcomingAppointments } from '@/features/appointments/api/appointmentApi'
import { getRecentDocuments } from '@/features/documents/api/documentApi'
import { AppointmentList } from '@/features/appointments/components/AppointmentList'
import { DocumentList } from '@/features/documents/components/DocumentList'

export default async function DashboardPage() {
  // Fetch on server - no loading states needed in client
  const [appointments, documents] = await Promise.all([
    getUpcomingAppointments(),
    getRecentDocuments(5)
  ])

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
        <AppointmentList appointments={appointments} />
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Documents</h2>
        <DocumentList documents={documents} />
      </section>
    </div>
  )
}
```

---

## Zustand Rules (Both Frontends)

**Zustand is NOT your backend cache.**

### ✅ Valid Use Cases
- **Auth state** (user session, role, token)
- **UI state** (sidebar open/closed, active tab, modal visibility)
- **Form state** (multi-step wizard progress)
- **Temporary selections** (selected patients for batch actions)

### ❌ Invalid Use Cases
- Patient records (fetch server-side)
- Appointment lists (fetch server-side)
- Document metadata (fetch server-side)
- Analytics data (fetch server-side)

### Shared Store Structure (Similar in Both Apps)

```typescript
// frontend-patient/src/features/auth/state/authStore.ts
import { create } from 'zustand'

interface AuthState {
  user: User | null
  role: 'patient' | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, role: 'patient', isAuthenticated: true }),
  logout: () => set({ user: null, role: null, isAuthenticated: false })
}))
```

```typescript
// frontend-doctor/src/features/auth/state/authStore.ts
interface AuthState {
  user: User | null
  role: 'provider' | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  logout: () => void
}
// ... similar structure, different role
```

---

## API Client Pattern (Both Frontends)

**Create a typed API client for backend communication.**

```typescript
// frontend-patient/src/shared/lib/apiClient.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  timeout: 10000,
})

// Request interceptor - add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

```typescript
// frontend-patient/src/features/appointments/api/appointmentApi.ts
import apiClient from '@/shared/lib/apiClient'
import { Appointment } from '@/shared/types/appointment'

export async function getUpcomingAppointments(): Promise<Appointment[]> {
  const response = await apiClient.get('/appointments/upcoming')
  return response.data
}

export async function bookAppointment(data: BookingRequest): Promise<Appointment> {
  const response = await apiClient.post('/appointments', data)
  return response.data
}
```

**Doctor app has identical structure, just different endpoints:**

```typescript
// frontend-doctor/src/features/patients/api/patientApi.ts
export async function searchPatients(query: string): Promise<Patient[]> {
  const response = await apiClient.get('/patients/search', { params: { q: query } })
  return response.data
}

export async function getPatientOverview(patientId: string): Promise<PatientOverview> {
  const response = await apiClient.get(`/patients/${patientId}/overview`)
  return response.data
}
```

---

## Database Schema Design (Shared Backend)

### Core Entities

```sql
-- Users & Roles (supports both frontends)
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('patient', 'provider', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
)

patient_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  mrn VARCHAR UNIQUE NOT NULL,  -- medical record number
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  dob DATE NOT NULL,
  phone VARCHAR,
  emergency_contact JSONB
)

provider_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  npi VARCHAR UNIQUE NOT NULL,  -- national provider identifier
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  specialty VARCHAR NOT NULL,
  license_number VARCHAR,
  phone VARCHAR
)

-- Clinical Data
appointments (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES users(id),
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  type VARCHAR,  -- 'routine', 'follow_up', 'urgent'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

vitals (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES users(id),
  recorded_at TIMESTAMP NOT NULL,
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  heart_rate INT,
  temperature DECIMAL,
  oxygen_saturation INT,
  recorded_by UUID REFERENCES users(id),  -- provider who recorded
  created_at TIMESTAMP DEFAULT NOW()
)

documents (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES users(id),
  uploaded_by UUID REFERENCES users(id),
  type VARCHAR,  -- 'lab', 'imaging', 'discharge_summary', 'referral'
  storage_path VARCHAR NOT NULL,
  original_filename VARCHAR,
  file_size BIGINT,
  parsed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)

document_embeddings (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  chunk_index INT,
  embedding VECTOR(1536),  -- pgvector extension
  content TEXT,
  metadata JSONB
)

-- Intelligence Layer
diagnostic_extractions (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  extracted_entities JSONB,  -- conditions, medications, procedures
  icd_codes VARCHAR[],
  confidence_score DECIMAL,
  extracted_at TIMESTAMP DEFAULT NOW()
)

risk_scores (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES users(id),
  score_type VARCHAR,  -- 'readmission_7d', 'readmission_30d', 'deterioration'
  score DECIMAL NOT NULL,
  risk_factors JSONB,
  model_version VARCHAR,
  calculated_at TIMESTAMP DEFAULT NOW()
)

clinical_insights (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES users(id),
  insight_type VARCHAR,  -- 'treatment_suggestion', 'drug_interaction', 'missing_test'
  content TEXT,
  confidence DECIMAL,
  generated_at TIMESTAMP DEFAULT NOW(),
  dismissed BOOLEAN DEFAULT FALSE
)
```

### Indexing Strategy
```sql
-- Performance indexes
CREATE INDEX idx_appointments_patient ON appointments(patient_id, scheduled_at DESC);
CREATE INDEX idx_appointments_provider ON appointments(provider_id, scheduled_at DESC);
CREATE INDEX idx_vitals_patient_time ON vitals(patient_id, recorded_at DESC);
CREATE INDEX idx_documents_patient ON documents(patient_id, created_at DESC);
CREATE INDEX idx_risk_scores_patient ON risk_scores(patient_id, calculated_at DESC);

-- Full-text search
CREATE INDEX idx_documents_filename ON documents USING GIN(to_tsvector('english', original_filename));
```

---

## Build Sequence (Staged Implementation)

### Stage 1: Foundation (Week 1)

**Backend**
- Initialize FastAPI with domain structure
- Environment config (dev/staging/prod)
- Health/readiness endpoints
- CORS middleware (allow both frontend origins)
- Logging infrastructure
- Supabase connection

**Frontend-Patient**
- Next.js App Router setup
- Tailwind config (mobile-first breakpoints)
- Auth routes (login, register)
- Basic layout with navigation

**Frontend-Doctor**
- Next.js App Router setup
- Tailwind config (desktop-optimized)
- Auth routes (login only - no public registration)
- Workspace layout with sidebar

**Deliverable**: Three deployable skeletons with clean architecture

**Test**: Visit `localhost:3000` (patient), `localhost:3001` (doctor), `localhost:8000/health` (backend)

---

### Stage 2: Authentication & Authorization (Week 1-2)

**Backend**
- Supabase Auth integration
- JWT token generation/validation
- Role-based middleware
- Protected route decorators

```python
# backend/app/core/dependencies.py
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    # Validate JWT, return user
    pass

async def require_patient(user: User = Depends(get_current_user)) -> User:
    if user.role != "patient":
        raise HTTPException(status_code=403)
    return user

async def require_provider(user: User = Depends(get_current_user)) -> User:
    if user.role != "provider":
        raise HTTPException(status_code=403)
    return user
```

**Frontend-Patient**
- Login/Register forms
- Auth state management (Zustand)
- Protected routes (middleware)
- Session persistence

**Frontend-Doctor**
- Login form (provider credentials only)
- Auth state management (Zustand)
- Protected routes (middleware)
- Session persistence

**Deliverable**: Role-based authentication working in both apps

**Test**: 
- Patient can't access `localhost:3001`
- Provider can't access `localhost:3000`
- Logout clears session in both apps

---

### Stage 3: Core Patient Features (Week 2-3)

**Backend**
- Patient profile CRUD
- Appointment booking logic (availability checking)
- Vitals storage endpoints

**Frontend-Patient**
- Dashboard (Server Component - fetch appointments, recent vitals)
- Profile management
- Appointment booking (Client Component - interactive calendar)
- Vitals entry form (Client Component)
- Medical history view (Server Component)

**Design Focus**: Simple, clear, mobile-friendly

**Deliverable**: Functional patient portal

---

### Stage 4: Core Provider Features (Week 2-3)

**Backend**
- Provider profile endpoints
- Patient search (full-text + filters)
- Appointment management (reschedule, cancel)
- Bulk vitals retrieval

**Frontend-Doctor**
- Today's schedule (Server Component)
- Patient search (Client Component with autocomplete)
- Patient overview page (Server Component - vitals trends, recent docs)
- Appointment queue management

**Design Focus**: Information-dense, fast scanning, desktop-optimized

**Deliverable**: Functional provider workspace

---

### Stage 5: Document Intelligence Pipeline (Week 3-4)

**Critical for MedIntel's value proposition**

**Backend Flow:**
```
Upload → Validation → Storage → Parsing → Extraction → Vectorization → Indexing
```

**Implementation:**

1. **Upload Handler**
   - File type validation (PDF, DICOM, HL7)
   - Size limits (patient: 10MB, provider: 50MB)
   - Supabase Storage upload
   - Queue parsing job

2. **NLP Parser** (intelligence layer)
   - Text extraction (PyMuPDF, pytesseract)
   - Clinical entity recognition (spaCy medical models)
   - ICD-10/SNOMED code mapping
   - Structured JSON output

3. **Vectorization** (intelligence layer)
   - Intelligent chunking (by section headers)
   - Generate embeddings (OpenAI text-embedding-3-small)
   - Store in Qdrant with metadata

**Frontend-Patient**
- Document upload (Client Component - drag-and-drop)
- Upload progress indicator
- Document list (Server Component)
- Simple document viewer

**Frontend-Doctor**
- Document timeline (Server Component - chronological view)
- Extracted entities display (medications, conditions, procedures)
- Semantic search (Client Component)
- Advanced document viewer with annotations

**Quality Bar**: Discharge summary should extract diagnoses, meds, procedures with >85% accuracy

---

### Stage 6: AI-Powered Retrieval (Week 4-5)

**Backend**
```python
# intelligence/retrieval/rag_engine.py
class MedicalRAGEngine:
    async def retrieve_context(
        self,
        query: str,
        patient_id: str,
        filters: dict,
        top_k: int = 5
    ) -> List[DocumentChunk]:
        # 1. Generate query embedding
        # 2. Semantic search in Qdrant (filter by patient_id)
        # 3. Rerank by clinical relevance
        # 4. Return with source citations
```

**Frontend-Patient**
- Simple search: "Find my cardiology notes"
- Results with document links

**Frontend-Doctor**
- Advanced search: "Show diabetic patients with A1C >8 and recent hospitalizations"
- Natural language queries
- Source citations with confidence scores
- "Ask about this patient" feature

**Test**: "Show all notes mentioning arrhythmia" returns ranked chunks with sources

---

### Stage 7: Predictive Analytics (Week 5-6)

**Backend (intelligence layer)**

**Models:**
1. **Readmission Risk Scorer**
   - Input: vitals trends, diagnosis codes, demographics
   - Output: 7-day/30-day probability
   - Algorithm: Gradient Boosting

2. **Deterioration Detector**
   - Input: real-time vitals
   - Output: early warning score
   - Algorithm: Random Forest

```python
# intelligence/ml/predictive.py
class ReadmissionScorer:
    async def score(self, patient_id: str) -> RiskAssessment:
        # Feature engineering
        # Model inference
        # SHAP explainability
        return RiskAssessment(
            score=0.78,
            risk_level="high",
            factors=["Recent hospitalization", "Missed appointments"]
        )
```

**Frontend-Patient**
- Risk score widget (if applicable)
- Simple "Your Health Score" visualization
- Recommendations (e.g., "Schedule follow-up")

**Frontend-Doctor**
- Risk score cards on patient overview
- Top risk factors (SHAP values)
- Trend charts (risk over time)
- Cohort analytics (high-risk patient list)

**Quality Bar**: Models must be explainable (show top 3 contributing factors)

---

### Stage 8: Production Hardening (Week 7-8)

**Security Audit**
- [ ] HIPAA compliance review (PHI encryption at rest/transit)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (Content Security Policy in both frontends)
- [ ] Rate limiting (per-user API quotas)
- [ ] Audit logging (who accessed what patient data, when)
- [ ] Role enforcement at API level
- [ ] Secure session handling

**Performance Optimization**
- [ ] Database connection pooling
- [ ] Qdrant index optimization
- [ ] Next.js image optimization (both apps)
- [ ] API response caching (Redis)
- [ ] Bundle size analysis (both frontends)

**Monitoring**
- [ ] Error tracking (Sentry for both frontends + backend)
- [ ] Performance monitoring (Web Vitals)
- [ ] API latency tracking

**Performance Targets:**
- Patient dashboard load: <2s (LCP)
- Doctor patient overview: <1.5s (LCP)
- Document upload → parsing: <10s for 10MB PDF
- Search results: <1s (p99)

---

## Deployment Strategy

### Local Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=...
      - QDRANT_URL=...
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --reload --host 0.0.0.0

  frontend-patient:
    build: ./frontend-patient
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
    volumes:
      - ./frontend-patient:/app
      - /app/node_modules

  frontend-doctor:
    build: ./frontend-doctor
    ports:
      - "3001:3001"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
    volumes:
      - ./frontend-doctor:/app
      - /app/node_modules

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
```

### Production Deployment

**Backend**: Railway, Render, or AWS ECS
**Frontend-Patient**: Vercel (deployment 1)
**Frontend-Doctor**: Vercel (deployment 2)
**Database**: Supabase (managed Postgres)
**Vector DB**: Qdrant Cloud

**Environment Variables:**
```bash
# Backend (.env)
DATABASE_URL=postgresql://...
QDRANT_URL=https://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
OPENAI_API_KEY=...

# Frontend-Patient (.env.local)
NEXT_PUBLIC_API_URL=https://api.medintel.com
NEXT_PUBLIC_APP_NAME=MedIntel Patient Portal

# Frontend-Doctor (.env.local)
NEXT_PUBLIC_API_URL=https://api.medintel.com
NEXT_PUBLIC_APP_NAME=MedIntel Provider Workspace
```

---

## Anti-Pattern Detection

### ❌ Avoid (Screams "Student Project")
- Duplicating backend logic in frontends
- Storing patient data in Zustand
- 1000-line page components
- Mixing patient and doctor code in one frontend
- No role enforcement at API level
- Console.log in production
- Hardcoded API URLs
- No error boundaries
- Generic component names (`Component1.tsx`)

### ✅ Embrace (Signals "Production Engineer")
- Backend as single source of truth
- Server Components for data display
- Clear separation between patient/doctor experiences
- Strict role-based API access
- Structured error handling
- Environment-based configuration
- Feature-based organization
- Typed API contracts
- Comprehensive loading/error states

---

## Intelligence Layer Quality Standards

**For MedIntel to succeed:**

1. **Explainable** → Every prediction includes reasoning
2. **Auditable** → Log all inferences with timestamps
3. **Configurable** → Confidence thresholds per use case
4. **Fail-safe** → Graceful degradation when AI unavailable
5. **Versioned** → Track which model generated which insight

**Example: Risk Display in Doctor App**
```tsx
<RiskScoreCard>
  <Score className="text-red-600">78% High Risk</Score>
  <FactorsList>
    <Factor weight={0.35}>Recent hospitalization (3 days ago)</Factor>
    <Factor weight={0.28}>Uncontrolled diabetes (HbA1c 9.2%)</Factor>
    <Factor weight={0.15}>Missed last 2 appointments</Factor>
  </FactorsList>
  <ModelInfo>
    Model v2.1.0 • Trained on 50k patients • 89% accuracy
  </ModelInfo>
</RiskScoreCard>
```

---

## Demonstration Strategy

### Live Demo Flow (10 minutes)

**Part 1: Patient Experience (3 min)**
- Login as patient
- Upload discharge summary
- Watch real-time parsing progress
- View extracted medications/conditions
- Book follow-up appointment

**Part 2: Intelligence Layer (4 min)**
- Switch to doctor app
- Show patient overview with risk scores
- Demonstrate semantic search ("diabetic patients with recent A1C >8")
- Display AI-generated patient summary
- Show drug interaction warnings

**Part 3: Architecture (3 min)**
- Show project structure (monorepo)
- Explain domain-driven backend
- Highlight separated frontends
- Demonstrate role-based access control

### Questions to Anticipate

**"Why separate frontends instead of role-based routing?"**
→ Security isolation, optimized builds, independent deployment, clear boundaries, better performance (no unused code)

**"How do you ensure patient privacy?"**
→ Row-level security (Supabase), PHI encryption, audit logging, role-based API access, HIPAA-compliant storage

**"What if the AI makes wrong predictions?"**
→ Confidence thresholds, human-in-the-loop design, explainability (SHAP), version tracking, audit trail

**"Can this scale to 100k patients?"**
→ Async backend (FastAPI), connection pooling, indexed Postgres, Qdrant for vector search, server components (reduced client load)

**"How is this different from existing EMRs?"**
→ **Proactive intelligence layer** (not just storage), predictive analytics, semantic search, AI-generated insights, dual-optimized experiences

---

## Critical Success Factor

**Most capstone projects are reactive: data in → data out**

**MedIntel must be proactive: data in → intelligence out → action triggered**

### Examples of Proactive Intelligence

**Patient App:**
- Auto-suggest appointment based on vitals trends
- Remind to upload recent lab results
- Alert when vitals exceed thresholds
- Suggest questions to ask doctor based on conditions

**Doctor App:**
- Flag patients at high risk before appointments
- Surface relevant history during encounter
- Suggest diagnostic tests based on symptoms
- Alert to drug interactions when prescribing
- Auto-generate encounter summary from visit notes

---

## Next Steps

**When ready, I can provide:**

1. ✅ **Complete API specification** (OpenAPI/Swagger for backend)
2. ✅ **Shared types package setup** (if using monorepo approach)
3. ✅ **Docker Compose configuration** for local development
4. ✅ **NLP pipeline implementation** with medical entity recognition
5. ✅ **RAG architecture code** with Qdrant integration
6. ✅ **Zustand store templates** for both frontends
7. ✅ **Testing strategy** (Pytest backend, Playwright both frontends)
8. ✅ **CI/CD pipeline** (GitHub Actions)

**Just say which piece you need first.**

---

**Build MedIntel like it's launching in 3 months. With separated frontends, you're building like a real product team.**
