# CLAUDE.md — SurveyAgent

## What is this project?

SurveyAgent is an open-source AI survey platform that replaces static forms with dynamic conversations. It conducts interviews via text chat, voice, or video avatar. It's self-hostable, LLM-agnostic, and keeps survey data under the user's control.

**Status:** Early development. Auth system and landing page are built. Core survey features are not yet implemented.

## Tech Stack

- **Backend:** Python 3.12+, FastAPI, Motor (async MongoDB), python-jose (JWT), bcrypt, OpenAI SDK
- **Frontend:** React 19, Vite, Tailwind CSS v3, Framer Motion, Lucide React, React Router v7, Axios
- **Database:** MongoDB (Atlas or self-hosted)
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
│   └── auth/
│       ├── routes.py          # register, login, refresh, /me, update-profile
│       ├── schemas.py         # Pydantic models (AdminInDB, TokenResponse, etc.)
│       └── utils.py           # JWT create/verify, bcrypt hash/verify, get_current_user
├── client/                    # React frontend
│   ├── index.html             # Entry HTML with Google Fonts
│   ├── tailwind.config.js     # Design system (colors, fonts, animations)
│   ├── vite.config.js         # Vite config, port 5173
│   ├── src/
│   │   ├── main.jsx           # BrowserRouter > AuthProvider > App
│   │   ├── App.jsx            # Routes: /, /login, /register, /dashboard, /settings
│   │   ├── index.css          # Tailwind directives + custom component classes
│   │   ├── api/
│   │   │   └── axios.js       # Axios instance, form-data helpers, token refresh interceptor
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
│   │       ├── Landing.jsx    # Composes all 13 landing sections
│   │       ├── Login.jsx      # Glassmorphism login form
│   │       ├── Register.jsx   # Glassmorphism register form
│   │       ├── Dashboard.jsx  # Placeholder with 3 "Coming soon" cards
│   │       └── Settings.jsx   # Profile edit (name, org_name)
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
npm run dev                          # http://localhost:5173
```

Requires a `.env` file at the project root (copy `.env.example`).

## Key Architecture Decisions

### Authentication
- All auth endpoints use **Form data** (`application/x-www-form-urlencoded`), NOT JSON. This is because FastAPI uses `Form(...)` parameters.
- Frontend uses `sendFormData()` and `sendFormPut()` helpers in `axios.js` that convert JS objects to `URLSearchParams`.
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

### MongoDB
- Database name: `surveyagent` (configurable via `MONGO_DB_NAME`)
- Collections: `admins` (user accounts), `error_logs` (error tracking)
- Admin document fields: `name`, `email`, `password`, `org_name`, `token_version`, `is_active`, `created_at`, `updated_at`, `last_login`

## API Endpoints

All under `/api/v1/auth`:

| Method | Path             | Auth     | Description                        |
|--------|------------------|----------|------------------------------------|
| POST   | /register        | None     | Create admin account, return tokens|
| POST   | /login           | None     | Authenticate, return tokens        |
| POST   | /refresh         | None     | Rotate tokens (increments version) |
| GET    | /me              | Bearer   | Get current admin profile          |
| PUT    | /update-profile  | Bearer   | Update name and/or org_name        |

## Conventions

- Backend follows the pattern from the AI-Prescription-Writer reference project (same error handling, same JWT structure, same MongoDB patterns).
- Every backend route uses the pattern: `try / except HTTPException: raise / except Exception: log + log_error + raise 500`.
- Frontend components use functional components with hooks. No class components.
- Landing page sections alternate between light (`bg-background`) and dark (`bg-dark`) backgrounds.
- Framer Motion: never use `left-1/2 -translate-x-1/2` on `motion.*` elements — framer-motion overrides CSS `transform`. Use `inset-x-0 mx-auto` instead.

## What's NOT Built Yet

- Survey creation / editing
- Survey response collection (text chat, voice, video)
- AI interviewer logic (LLM integration for dynamic questions)
- Analytics / reporting
- Admin dashboard with real data
- Email verification
- Multi-tenant access control
