# CLAUDE.md — SurveyAgent

## What is this project?

SurveyAgent is an open-source AI survey platform that replaces static forms with dynamic conversations. It conducts interviews via text chat, voice, or video avatar. It's self-hostable, LLM-agnostic, and keeps survey data under the user's control.

**Status:** Early development. Auth system, landing page, survey CRUD, and AI question generation are built. AI interviewer and response collection are not yet implemented.

## Tech Stack

- **Backend:** Python 3.12+, FastAPI, Motor (async MongoDB), python-jose (JWT), bcrypt, OpenAI SDK
- **Frontend:** React 19, Vite, Tailwind CSS v3, Framer Motion, Lucide React, React Router v7, Axios
- **Database:** MongoDB (Atlas or self-hosted)
- **AI:** OpenAI Responses API (gpt-5.4-mini), streaming via SSE
- **Package Manager:** `uv` (backend), `npm` (frontend)

## Project Structure

```
surveyagent/
├── server/                    # FastAPI backend
│   ├── main.py                # App factory, CORS, lifespan, router mount
│   ├── core/
│   │   ├── config.py          # Pydantic Settings (reads .env)
│   │   ├── logging_config.py  # setup_logging() + get_logger()
│   │   └── llm.py             # Singleton AsyncOpenAI client
│   ├── db/
│   │   └── mongo.py           # get_db() singleton + log_error() helper
│   ├── auth/
│   │   ├── routes.py          # register, login, refresh, /me, update-profile
│   │   ├── schemas.py         # Pydantic models (AdminInDB, TokenResponse, etc.)
│   │   └── utils.py           # JWT create/verify, bcrypt hash/verify, get_current_user
│   ├── surveys/
│   │   ├── routes.py          # CRUD + publish (all Bearer-auth protected)
│   │   ├── schemas.py         # Pydantic models (SurveyCreate, SurveyResponse, etc.)
│   │   └── utils.py           # generate_survey_token() via uuid4
│   └── ai/
│       ├── __init__.py        # Package marker
│       ├── prompts.py         # SYSTEM_PROMPT + build_user_prompt()
│       └── routes.py          # SSE streaming question generation endpoint
├── client/                    # React frontend
│   ├── index.html             # Entry HTML with Google Fonts
│   ├── tailwind.config.js     # Design system (colors, fonts, animations)
│   ├── vite.config.js         # Vite config, port 5174
│   ├── src/
│   │   ├── main.jsx           # BrowserRouter > AuthProvider > App
│   │   ├── App.jsx            # Routes: /, /login, /register, /dashboard, /settings, /surveys/*
│   │   ├── index.css          # Tailwind directives + custom component classes
│   │   ├── api/
│   │   │   ├── index.js       # Barrel export for entire API layer
│   │   │   ├── client.js      # Axios instance (baseURL from env)
│   │   │   ├── constants.js   # ENDPOINTS map (AUTH, SURVEYS, AI)
│   │   │   ├── helpers.js     # toFormParams, sendFormData, sendFormPut
│   │   │   ├── interceptors.js # Bearer token + 401 refresh queue pattern
│   │   │   ├── surveys.js     # Survey CRUD + publish API functions
│   │   │   └── ai.js          # streamGenerateQuestions() via fetch SSE
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state, login/register/updateProfile/logout
│   │   ├── hooks/
│   │   │   └── useAuth.js     # useContext(AuthContext) wrapper
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── ProtectedRoute.jsx  # Auth guard with Outlet
│   │   │   └── landing/
│   │   │       ├── Navbar.jsx       # Fixed floating pill navbar
│   │   │       ├── Hero.jsx         # Headline + CTAs + Coming Soon badge
│   │   │       ├── Problem.jsx      # 4 pain-point cards
│   │   │       ├── Solution.jsx     # Platform description
│   │   │       ├── ThreeModes.jsx   # Text / Voice / Video cards
│   │   │       ├── HowItWorks.jsx   # 4-step flow
│   │   │       ├── TwoPaths.jsx     # Cloud vs Self-Host
│   │   │       ├── BringYourLLM.jsx # LLM provider pills
│   │   │       ├── Security.jsx     # 6 security feature cards (dark bg)
│   │   │       ├── Comparison.jsx   # Feature comparison table
│   │   │       ├── OpenSource.jsx   # MIT / Community / No Telemetry
│   │   │       ├── FinalCTA.jsx     # Final call-to-action (dark bg)
│   │   │       └── Footer.jsx       # 4-column footer
│   │   └── pages/
│   │       ├── Landing.jsx      # Composes all 13 landing sections
│   │       ├── Login.jsx        # Glassmorphism login form
│   │       ├── Register.jsx     # Glassmorphism register form
│   │       ├── Dashboard.jsx    # Survey list grid with CRUD actions
│   │       ├── Settings.jsx     # Profile edit (name, org_name)
│   │       ├── SurveyForm.jsx   # Create/Edit survey + AI question generation
│   │       └── SurveyDetail.jsx # Read-only survey view with share link
├── .env                       # Secrets (gitignored)
├── .env.example               # Template for .env
├── pyproject.toml             # Python deps (uv)
├── requirements.txt           # Python deps (pip)
└── uv.lock                    # Lockfile
```

## Running Locally

```bash
# Backend
cd surveyagent
uv sync
uvicorn server.main:app --reload    # http://localhost:8000

# Frontend
cd client
npm install
npm run dev                          # http://localhost:5174
```

Requires a `.env` file at the project root (copy `.env.example`).

## Features Built

### Authentication (complete)
- Admin registration and login with JWT tokens
- Token versioning for server-side revocation (no blacklist needed)
- Token refresh with automatic version increment
- Profile viewing and editing (name, org_name)
- Frontend auth guard (ProtectedRoute) with loading state
- Axios interceptor: 401 → queue pattern → single refresh → retry all

### Survey Management (complete)
- Full CRUD: create, list, view, edit, delete surveys
- Survey fields: title, description, goal, context, questions (string array)
- Draft → Published workflow with uuid4 token generation
- Ownership isolation: admins only see their own surveys
- Dashboard with survey cards (status badge, dates, share link, actions)
- Delete confirmation dialog
- Published survey share link with copy-to-clipboard

### AI Question Generation (complete)
- Streaming question generation via OpenAI Responses API (gpt-5.4-mini)
- Server-Sent Events (SSE) — questions appear one by one as they stream in
- User controls: number of questions (1-20) + additional context for AI
- Inline panel in SurveyForm with Generate/Cancel buttons
- Abort support (cancel mid-stream)
- Generated questions are fully editable (same textarea list as manual questions)
- Prompts separated into `server/ai/prompts.py`

### Landing Page (complete)
- 13-section marketing page with scroll animations (Framer Motion)
- Responsive navbar with mobile hamburger menu
- Sections: Hero, Problem, Solution, Three Modes, How It Works, Two Paths, BringYourLLM, Security, Comparison, Open Source, Final CTA, Footer

### Frontend Infrastructure (complete)
- API layer: Axios client, endpoint constants, form helpers, interceptors, barrel exports
- AI streaming via native `fetch()` (Axios doesn't support ReadableStream)
- Auth context with login/register/logout/updateProfile
- Protected routes with auth guard
- Design system: warm palette, glassmorphism auth forms, Tailwind component classes

## Key Architecture Decisions

### Authentication
- All auth endpoints use **Form data** (`application/x-www-form-urlencoded`), NOT JSON. This is because FastAPI uses `Form(...)` parameters.
- Frontend uses `sendFormData()` and `sendFormPut()` helpers that convert JS objects to `URLSearchParams`.
- JWT **token versioning**: each admin has a `token_version` field in MongoDB. On token refresh, version is incremented via `$inc`, invalidating all old tokens without a blacklist.
- Access tokens expire in 1 day, refresh tokens in 14 days.
- Frontend stores tokens in `localStorage` (not cookies).
- Axios response interceptor handles 401s with a **queue pattern** — concurrent failed requests wait for a single refresh, then retry.

### Password Hashing
- Uses `bcrypt` directly (`from bcrypt._bcrypt import hashpw, checkpw, gensalt`), NOT `passlib`. The `passlib` library is incompatible with `bcrypt>=4.1`.

### Frontend Design System
- **Colors:** warm off-white `#FAF7F2` (background), dark `#1A1210`, gold accent `#C4956A`
- **Fonts:** Instrument Serif (headings), DM Sans (body) — loaded via Google Fonts in `index.html`
- **Animations:** Framer Motion with `initial/whileInView/viewport once` pattern for scroll animations
- **Component classes:** Defined in `index.css` (`btn-primary`, `btn-secondary`, `glass-card`, `card`, `section-padding`, `container-max`)

### CORS
- Currently `allow_origins=["*"]` for development. Tighten for production.

### Surveys
- Survey endpoints accept **JSON** bodies (not form data like auth).
- All survey routes require Bearer auth via `Depends(get_current_user)`.
- Ownership isolation: every query filters by `created_by` so admins only see their own surveys.
- Publish generates a `uuid4` token stored in the survey document.

### AI Question Generation
- Uses OpenAI **Responses API** with `stream=True` (not Chat Completions).
- Model: `gpt-5.4-mini` (configurable via `OPENAI_MODEL` in `.env`).
- Backend streams SSE events: `data: {"question": "..."}\n\n` per question, `data: [DONE]\n\n` at end.
- Frontend uses native `fetch()` + `ReadableStream` (not Axios) because Axios doesn't support streaming.
- Prompt asks LLM to output one question per line (no JSON, no numbering) for easy newline-based parsing.
- `onQuestion` callback uses pure state updater (filters empties + appends) — safe under React StrictMode double-invocation.

### MongoDB
- Database name: `surveyagent` (configurable via `MONGO_DB_NAME`)
- Collections: `admins` (user accounts), `surveys` (survey definitions), `error_logs` (error tracking)
- Admin document fields: `name`, `email`, `password`, `org_name`, `token_version`, `is_active`, `created_at`, `updated_at`, `last_login`
- Survey document fields: `title`, `description`, `goal`, `context`, `questions`, `status`, `token`, `created_by`, `created_at`, `updated_at`

## API Endpoints

### Auth — `/api/v1/auth`

| Method | Path             | Auth     | Description                        |
|--------|------------------|----------|------------------------------------|
| POST   | /register        | None     | Create admin account, return tokens|
| POST   | /login           | None     | Authenticate, return tokens        |
| POST   | /refresh         | None     | Rotate tokens (increments version) |
| GET    | /me              | Bearer   | Get current admin profile          |
| PUT    | /update-profile  | Bearer   | Update name and/or org_name        |

### Surveys — `/api/v1/surveys`

| Method | Path             | Auth     | Description                        |
|--------|------------------|----------|------------------------------------|
| POST   | /                | Bearer   | Create survey (draft)              |
| GET    | /                | Bearer   | List all surveys for current admin |
| GET    | /{id}            | Bearer   | Get single survey                  |
| PUT    | /{id}            | Bearer   | Update survey fields               |
| DELETE | /{id}            | Bearer   | Delete survey                      |
| POST   | /{id}/publish    | Bearer   | Publish survey + generate token    |

### AI — `/api/v1/ai`

| Method | Path                | Auth     | Description                                  |
|--------|---------------------|----------|----------------------------------------------|
| POST   | /generate-questions | Bearer   | Stream AI-generated questions via SSE         |

## Conventions

- Backend follows the pattern from the OB-Reporter reference project (same error handling, same JWT structure, same MongoDB patterns, same OpenAI streaming).
- Every backend route uses the pattern: `try / except HTTPException: raise / except Exception: log + log_error + raise 500`.
- Frontend components use functional components with hooks. No class components.
- Landing page sections alternate between light (`bg-background`) and dark (`bg-dark`) backgrounds.
- Framer Motion: never use `left-1/2 -translate-x-1/2` on `motion.*` elements — framer-motion overrides CSS `transform`. Use `inset-x-0 mx-auto` instead.
- AI prompts live in dedicated `prompts.py` files, separate from route handlers.
- SSE streaming pattern: backend yields `data: {json}\n\n` events, frontend consumes via `fetch()` + `ReadableStream`.
- React state updaters inside streaming callbacks must be **pure functions** (no mutable closure variables) to survive StrictMode double-invocation.

## What's NOT Built Yet

- Public survey page (the token URL respondents visit to take a survey)
- Survey response collection (text chat, voice, video)
- AI interviewer logic (LLM integration for dynamic follow-up questions)
- Analytics / reporting
- Email verification
- Multi-tenant access control
