# CLAUDE.md — SurveyAgent

## What is this project?

SurveyAgent is an open-source AI survey platform that replaces static forms with dynamic conversations. It conducts interviews via text chat, voice, or video avatar. It's self-hostable, LLM-agnostic, and keeps survey data under the user's control.

**Status:** Early development. Auth system, landing page, survey CRUD, AI question generation, AI field enhancement, interviewer foundation, interviewer engine + routes, interview chat UI (text + speech-to-text dictation), analytics, data export, webhooks, multi-tenant org support (orgs, roles, teams, email OTP verification, invite system, survey visibility), email notifications on interview completion, custom analytics instructions, public feedback collection (with speech-to-text dictation), and Docker containerization are built. Voice and video are not yet implemented.

## Tech Stack

- **Backend:** Python 3.12+, FastAPI, Motor (async MongoDB), python-jose (JWT), bcrypt, OpenAI SDK, httpx (webhooks), Resend (email)
- **Frontend:** React 19, Vite, Tailwind CSS v3, Framer Motion, Lucide React, React Router v7, Axios, assistant-ui (chat primitives), jsPDF + jspdf-autotable (PDF export)
- **Database:** MongoDB (Atlas or self-hosted)
- **AI:** OpenAI Responses API (gpt-5.4-mini), streaming via SSE
- **Deployment:** Docker (multi-stage: Node 22 Alpine + Python 3.12 slim), Gunicorn + Uvicorn workers
- **Package Manager:** `uv` (backend), `npm` (frontend)

## Project Structure

```
surveyagent/
├── server/                    # FastAPI backend
│   ├── main.py                # App factory, CORS, lifespan, router mount
│   ├── core/
│   │   ├── config.py          # Pydantic Settings (reads .env)
│   │   ├── logging_config.py  # setup_logging() + get_logger()
│   │   ├── llm.py             # Singleton AsyncOpenAI client
│   │   └── providers/         # Multi-LLM provider support
│   │       ├── __init__.py    # Provider registry
│   │       ├── openai.py      # OpenAI provider
│   │       ├── anthropic.py   # Anthropic provider
│   │       └── gemini.py      # Google Gemini provider
│   ├── db/
│   │   └── mongo.py           # get_db() singleton + log_error() helper
│   ├── auth/
│   │   ├── routes.py          # register, login, refresh, /me, update-profile, OTP, invites
│   │   ├── schemas.py         # Pydantic models (AdminInDB, TokenResponse, OTP, Invite, etc.)
│   │   └── utils.py           # JWT create/verify, bcrypt hash/verify, get_current_user
│   ├── surveys/
│   │   ├── routes.py          # CRUD + publish (all Bearer-auth protected)
│   │   ├── schemas.py         # Pydantic models (SurveyCreate, SurveyResponse, etc.)
│   │   └── utils.py           # generate_survey_token(), survey_doc_to_response(), build_visibility_query()
│   ├── interviewer/
│   │   ├── __init__.py        # Package marker
│   │   ├── prompts.py         # Interviewer system prompt + build_interviewer_prompt()
│   │   ├── schemas.py         # Pydantic models (Interview, Message, Respondent, request models)
│   │   ├── db.py              # Interview session CRUD utilities
│   │   ├── engine.py          # LLM streaming engine + coverage tag parsing
│   │   ├── utils.py           # build_welcome(), calc_remaining_minutes(), process_stream_result(), fire_completion_emails()
│   │   └── routes.py          # Interview API: start, message, test
│   ├── ai/
│   │   ├── __init__.py        # Package marker
│   │   ├── prompts.py         # Question generation + field enhancement prompts & builders
│   │   ├── schemas.py         # GenerateQuestionsRequest, EnhanceFieldRequest
│   │   └── routes.py          # SSE streaming: question generation + field enhancement
│   ├── analytics/
│   │   ├── __init__.py        # Package marker
│   │   ├── routes.py          # Overview, survey detail, interview list/detail, analysis SSE, export
│   │   ├── schemas.py         # Analytics response models (incl. export models)
│   │   ├── db.py              # Aggregation queries + bulk export query
│   │   ├── prompts.py         # Interview + survey analysis LLM prompts
│   │   └── utils.py           # verify_survey_access()
│   ├── email/                 # Email service (Resend)
│   │   ├── __init__.py        # Package marker
│   │   ├── service.py         # send_otp_email(), send_invite_email(), send_completion_email(), send_creator_notification() via Resend API
│   │   └── templates.py       # Branded HTML email templates (OTP, invite, completion, creator notification)
│   ├── orgs/                  # Organization management
│   │   ├── __init__.py        # Package marker
│   │   ├── routes.py          # Org CRUD, member management, role changes, ownership transfer
│   │   ├── schemas.py         # Org request/response models
│   │   ├── db.py              # Org + member DB operations
│   │   └── utils.py           # Org helper functions
│   ├── feedback/              # Public feedback collection
│   │   ├── __init__.py        # Package marker
│   │   ├── schemas.py         # FeedbackCreate, FeedbackResponse models
│   │   └── routes.py          # POST feedback (public, no auth)
│   └── teams/                 # Team management
│       ├── __init__.py        # Package marker
│       ├── routes.py          # Team CRUD, member add/remove
│       ├── schemas.py         # Team request/response models
│       └── db.py              # Team DB operations, get_user_team_ids()
├── client/                    # React frontend
│   ├── index.html             # Entry HTML with Google Fonts
│   ├── tailwind.config.js     # Design system (colors, fonts, animations)
│   ├── vite.config.js         # Vite config, port 5174
│   ├── .env.production        # Production env (VITE_API_URL)
│   ├── src/
│   │   ├── main.jsx           # BrowserRouter > AuthProvider > App
│   │   ├── App.jsx            # Routes: /, /login, /register, /verify-email, /invite/:token, /feedback, /dashboard, /settings, /settings/org, /settings/teams, /surveys/*, /interview/*
│   │   ├── index.css          # Tailwind directives + custom component classes
│   │   ├── api/
│   │   │   ├── index.js       # Barrel export for entire API layer
│   │   │   ├── client.js      # Axios instance (baseURL from env)
│   │   │   ├── constants.js   # ENDPOINTS map (AUTH, SURVEYS, AI, INTERVIEW, ORG, TEAMS, FEEDBACK)
│   │   │   ├── helpers.js     # toFormParams, sendFormData, sendFormPut
│   │   │   ├── interceptors.js # Bearer token + 401 refresh queue pattern
│   │   │   ├── surveys.js     # Survey CRUD + publish API functions
│   │   │   ├── ai.js          # streamGenerateQuestions() via fetch SSE
│   │   │   ├── analytics.js   # Analytics + export API functions
│   │   │   ├── interview.js   # Interview API: info, start, test, streamMessage
│   │   │   ├── org.js         # Org management API (members, roles, invites)
│   │   │   ├── feedback.js    # submitFeedback() API function
│   │   │   └── teams.js       # Team management API (CRUD, members)
│   │   ├── utils/
│   │   │   ├── index.js       # Barrel export
│   │   │   ├── formatters.js  # formatDate, formatDuration, formatTimer, etc.
│   │   │   ├── export.js      # CSV export utilities (transcript, responses, summary)
│   │   │   └── pdf.js         # Branded PDF export (jsPDF + autoTable) for analysis & survey reports
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state, login/register/updateProfile/logout, email verification
│   │   ├── hooks/
│   │   │   ├── index.js       # Barrel export
│   │   │   ├── useAuth.js     # useContext(AuthContext) wrapper
│   │   │   ├── useClipboard.js # Copy-to-clipboard hook
│   │   │   ├── useSurveyForm.js # Survey form state + CRUD
│   │   │   ├── useQuestionManager.js # Question list CRUD
│   │   │   ├── useAiGeneration.js # AI question generation state
│   │   │   ├── useFieldEnhance.js # AI field enhancement streaming state
│   │   │   ├── useInterviewAnalysis.js # Interview analysis streaming state
│   │   │   ├── useSurveyAnalysis.js   # Survey aggregate analysis streaming state
│   │   │   ├── useTts.js         # Text-to-speech playback via OpenAI TTS API
│   │   │   └── useSpeechToText.js # Browser Speech Recognition API wrapper for dictation
│   │   ├── components/
│   │   │   ├── shared/
│   │   │   │   ├── index.js           # Barrel export
│   │   │   │   ├── StatusBadge.jsx    # Survey draft/published badge
│   │   │   │   ├── InterviewStatusBadge.jsx # Interview status badge
│   │   │   │   ├── ExportButton.jsx   # Reusable export dropdown (CSV/PDF)
│   │   │   │   ├── RoleBadge.jsx      # User role badge (owner/admin/member)
│   │   │   │   └── VisibilityBadge.jsx # Survey visibility badge (private/team/org)
│   │   │   ├── auth/
│   │   │   │   └── ProtectedRoute.jsx  # Auth guard with Outlet + email verification check
│   │   │   ├── analytics/
│   │   │   │   ├── index.js             # Barrel export
│   │   │   │   ├── helpers.js           # scoreColor, scoreBg, sentimentBadge, questionStatusBadge
│   │   │   │   ├── InterviewHeader.jsx  # Compact header: back link + respondent + status + actions
│   │   │   │   ├── TabBar.jsx           # Horizontal tab bar (Overview/Themes/Questions/Transcript)
│   │   │   │   ├── OverviewTab.jsx      # Score/sentiment/coverage metrics + summary + session info
│   │   │   │   ├── ThemesTab.jsx        # Key themes + strengths/concerns/improvements grid
│   │   │   │   ├── QuestionsTab.jsx     # Per-question analysis cards
│   │   │   │   ├── TranscriptTab.jsx    # Conversation chat bubbles
│   │   │   │   ├── AnalysisEmptyState.jsx  # Prompt to run analysis
│   │   │   │   ├── AnalysisStreaming.jsx   # Streaming preview with spinner
│   │   │   │   ├── SurveyOverviewTab.jsx   # Survey-level score/sentiment/summary
│   │   │   │   ├── SurveyQuestionsTab.jsx  # Per-question aggregate findings
│   │   │   │   └── SurveyPatternsTab.jsx   # Respondent engagement patterns
│   │   │   ├── interview/
│   │   │   │   ├── ChatThread.jsx      # Chat UI with assistant-ui primitives
│   │   │   │   ├── InterviewChat.jsx   # Runtime adapter + AssistantRuntimeProvider
│   │   │   │   ├── RespondentForm.jsx  # Optional respondent details form
│   │   │   │   ├── CompletionScreen.jsx # Thank-you screen after interview
│   │   │   │   └── TerminationScreen.jsx # Abuse termination screen
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
│   │       ├── Landing.jsx          # Composes all 13 landing sections
│   │       ├── Login.jsx            # Glassmorphism login form
│   │       ├── Register.jsx         # Glassmorphism register form
│   │       ├── VerifyEmail.jsx      # OTP email verification page
│   │       ├── InviteAccept.jsx     # Invite acceptance + registration page
│   │       ├── Dashboard.jsx        # Survey list grid with CRUD actions
│   │       ├── Settings.jsx         # Profile edit (name, org_name) + links to org/team settings
│   │       ├── OrgSettings.jsx      # Organization management (members, roles, invites)
│   │       ├── TeamManagement.jsx   # Team/sub-team management (CRUD, members)
│   │       ├── SurveyForm.jsx       # Create/Edit survey (uses useSurveyForm + useQuestionManager + useAiGeneration + useFieldEnhance hooks)
│   │       ├── SurveyDetail.jsx     # Read-only survey view with share link + test button
│   │       ├── InterviewPage.jsx    # Interview orchestrator (respondent + test modes)
│   │       ├── AnalyticsOverview.jsx # Global analytics dashboard
│   │       ├── SurveyAnalytics.jsx  # Per-survey analytics + interview sessions table
│   │       ├── InterviewDetail.jsx  # Tabbed interview dashboard (orchestrator for analytics/ components)
│   │       └── Feedback.jsx         # Public feedback form with star rating + speech-to-text dictation
├── scripts/
│   └── migrate_multi_tenant.py # Migration script: creates orgs, sets visibility, creates indexes
├── evals/                     # Evaluation suite
│   ├── cases.py               # Test cases
│   └── run_evals.py           # Eval runner
├── Dockerfile                 # Multi-stage build (Node 22 Alpine + Python 3.12 slim)
├── .dockerignore              # Docker build exclusions
├── deployment-guide.md        # Azure Web Apps deployment guide
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
- Survey fields: title, description, goal, context, questions (array of QuestionItem: {text, ai_instructions}), estimated_duration (int, minutes, default 5), welcome_message (optional string), personality_tone (professional/friendly/casual/fun, default "friendly"), webhook_url (optional string, max 2000 chars), notify_on_completion (bool, default false), analytics_instructions (optional string, max 2000 chars). Response includes `created_by_name` and `created_by_email` for shared survey context.
- Draft → Published workflow with uuid4 token generation
- Visibility-based access: admins see their own surveys + org/team-shared surveys
- Owner/Admin can update and publish any survey in their org (not just their own)
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

### AI Field Enhancement (complete)
- "Enhance with AI" button on each text field (title, description, goal, context, welcome_message) in the survey form
- Context flows top-to-bottom: enhancing a field sends all filled fields above it as context
- Streaming SSE — tokens appear character-by-character via `data: {"token": "..."}\n\n`
- If field has existing content, AI improves it; if empty, AI generates fresh content
- Single-field-at-a-time constraint — other enhance buttons disabled during streaming
- Cancel mid-stream support via AbortController
- `useFieldEnhance` hook manages streaming state, field setters, and abort
- Mutual exclusion with AI question generation (both disable each other's buttons)

### Landing Page (complete)
- 13-section marketing page with scroll animations (Framer Motion)
- Responsive navbar with mobile hamburger menu
- Sections: Hero, Problem, Solution, Three Modes, How It Works, Two Paths, BringYourLLM, Security, Comparison, Open Source, Final CTA, Footer

### Interviewer Foundation (complete)
- Conversational interviewer system prompt with time-awareness, coverage tracking, and personality tone
- Builder function: `build_interviewer_prompt()` takes survey config + remaining time + personality tone, returns formatted prompt
- Interview session schemas: `RespondentDetails`, `Message`, `InterviewCreate`, `InterviewInDB`, `InterviewResponse`, wrapper models
- MongoDB utilities for interview CRUD: create, get, add message, update status, update questions covered
- Coverage tag format: `[COVERED: 1, 3, 5]` — parsed by backend, stripped before sending to respondent

### Interviewer Engine & Routes (complete)
- Engine (`server/interviewer/engine.py`): builds prompt from survey config + full conversation history + remaining time, streams LLM response via SSE, parses coverage tag
- `parse_coverage_tag()`: regex extraction + stripping of `[COVERED: ...]` metadata from LLM output
- `run_interview_turn()`: async generator yielding SSE chunks (`data: {"token": "..."}\n\n`), final event includes clean text + questions covered
- Three API endpoints at `/api/v1/interview`:
  - `POST /start/{survey_token}` — public, creates session from published survey token, returns welcome message
  - `POST /{session_id}/message` — public, sends respondent message, streams AI response via SSE
  - `POST /test/{survey_id}` — Bearer auth, admin test mode for draft surveys
- Welcome message: admin's custom message or default template with survey title
- Auto-completion: session marked completed when all questions covered or time expires

### Interview Chat UI (complete)
- Public interview page at `/interview/:token` with phase-based flow: loading → info → details → chatting → completed
- Admin test mode at `/interview/test/:surveyId` — requires auth, skips details form, goes straight to chat
- Chat UI built with `@assistant-ui/react` primitives (`ThreadPrimitive`, `ComposerPrimitive`, `MessagePrimitive`)
- `ChatModelAdapter` bridges assistant-ui's `useLocalRuntime` to our SSE backend (`/interview/{session_id}/message`)
- Streaming: adapter yields cumulative text on each SSE token event, assistant-ui handles incremental rendering
- Welcome message injected as `initialMessages` to `useLocalRuntime`
- Completion detection: adapter catches HTTP 400 ("session no longer active") from backend auto-completion, triggers onComplete callback
- Optional respondent details form (name, email, age, gender, occupation, phone — all optional)
- "Test Survey" button on both SurveyForm (create/edit) and SurveyDetail pages opens test mode in new tab
- SurveyForm "Test Survey" saves the survey first (creates if new, updates if existing), then opens `/interview/test/{surveyId}` in a new tab
- Shareable survey link format: `/interview/{token}` (used in both Dashboard and SurveyDetail)
- **Speech-to-text dictation:** Microphone button in the composer lets respondents dictate replies using the browser's native Web Speech API (`SpeechRecognition`). No backend needed — runs entirely client-side. `useSpeechToText` hook wraps the API with auto-restart on silence, error handling, and cleanup. `DictateButton` component uses `useComposerRuntime().setText()` to inject transcribed text into the assistant-ui composer. Visual states: muted mic (idle), red pulsing mic (listening). Hides on unsupported browsers.

### Analytics (complete)
- Analytics overview page showing all surveys with aggregate stats (total interviews, completion rate, avg duration)
- Per-survey analytics page with stat cards, question coverage bars, and paginated interview sessions table
- Per-interview detail page with tabbed dashboard: Overview, Themes & Insights, Questions, Transcript
- AI-powered interview analysis via streaming SSE — scores quality (1-10), detects sentiment, identifies themes/strengths/concerns/improvements, evaluates each question
- Analysis cached in interview document's `analysis` field, loadable on page revisit
- **Aggregate survey-level LLM analysis**: synthesizes ALL completed interviews for a survey into a single analysis
  - Two-tier prompt: uses cached per-interview analyses (compact) when available, falls back to raw transcripts
  - Produces overall score, dominant sentiment, executive summary, consensus/divergence points, per-question aggregate findings, respondent patterns
  - Cached in survey document's `analysis` field
  - Tabbed dashboard on SurveyAnalytics page: Overview, Themes & Insights, Questions, Patterns
  - Reuses `ThemesTab`, `AnalysisEmptyState`, `AnalysisStreaming` from interview analysis; new `SurveyOverviewTab`, `SurveyQuestionsTab`, `SurveyPatternsTab`
- Text-to-speech for executive summaries via OpenAI TTS API
- `TabBar` component accepts optional `tabs` prop for different tab configurations (interview vs survey analysis)

### Data Export (complete)
- Export buttons on 4 pages: Interview Detail, Survey Analytics, Survey Detail, Analytics Overview
- **CSV exports**: interview transcripts, bulk interview responses (via dedicated backend endpoint), analytics summary
- **PDF exports**: branded reports with accent color headers, score badges, section layouts, autoTable tables, page footers
- Uses `jsPDF` + `jspdf-autotable` (imported as `autoTable(doc, {...})` function form, NOT `doc.autoTable()`)
- Reusable `ExportButton` dropdown component: single option renders as button, multiple options renders dropdown with click-outside-to-close
- Backend `GET /surveys/{id}/interviews/export` endpoint returns all non-test interviews without pagination for bulk CSV export
- Export utilities split into `utils/export.js` (CSV) and `utils/pdf.js` (PDF) — both are pure functions, no React dependencies
- PDF design: accent bar header, score circle badges (green/gold/red), bullet lists, key-value pairs, autoTable for question analysis + transcripts

### Webhooks (complete)
- Optional `webhook_url` field on surveys — POST interview results to external URLs (e.g., Slack) on interview completion
- Fire-and-forget via `asyncio.create_task()` — doesn't block SSE response to respondent
- Payload: event type, timestamp, survey id/title, interview id/status/questions covered/timestamps, respondent name/email
- Skips test runs (admin test sessions don't trigger webhooks)
- Uses `httpx.AsyncClient` with 10s timeout; failures logged but never break interview flow
- Frontend: URL input field in survey form between Welcome Message and Questions

### Email Notifications (complete)
- Respondent thank-you email sent after interview completion via `send_completion_email()`
- Creator notification email sent when an interview completes via `send_creator_notification()`
- Controlled by `notify_on_completion` boolean on the survey document
- Fire-and-forget via `fire_completion_emails()` in `server/interviewer/utils.py` using `asyncio.create_task()`
- Branded HTML templates in `server/email/templates.py`: `completion_email_html()` and `creator_notification_email_html()`
- Skips test runs — only real respondent interviews trigger emails
- Frontend: toggle checkbox in survey form, only visible to survey creator

### Custom Analytics Instructions (complete)
- Optional `analytics_instructions` field on surveys (max 2000 chars)
- Allows survey creators to guide AI analysis (e.g., "focus on pricing feedback", "ignore off-topic responses")
- Injected into both interview-level and survey-level LLM analysis prompts
- Frontend: "How should we evaluate responses?" textarea in survey form

### Public Feedback (complete)
- Public feedback page at `/feedback` — no auth required, anyone can submit
- Form fields: name (optional), email (optional), rating (optional, 1-5 stars), message (required, max 5000 chars)
- Speech-to-text dictation on the message textarea — reuses existing `useSpeechToText` hook
- Stored in a separate `feedback` MongoDB collection — completely independent of app logic
- Backend: single `POST /api/v1/feedback` endpoint, no auth
- Frontend: glassmorphism card matching auth pages design, star rating component, success state with thank-you screen
- Links in landing page navbar and footer

### Docker & Deployment (complete)
- Multi-stage `Dockerfile`: Node 22 Alpine builds React frontend, Python 3.12 slim runs FastAPI with Gunicorn + Uvicorn workers
- Single container serves both backend API and built frontend SPA on port 8000
- `.dockerignore` excludes node_modules, __pycache__, .env, .git, evals
- `deployment-guide.md` provides Azure Web App for Containers deployment steps
- Production SPA serving: root route serves `index.html`, custom 404 handler returns JSON for API routes and `index.html` for SPA client-side routes
- `client/.env.production` with `VITE_API_URL=` (empty for same-origin deployment)

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
- Visibility-based access: `build_visibility_query()` builds a `$or` query combining created_by, org+org visibility, and org+team+team_ids visibility. Owner/Admin roles bypass visibility filters and see all surveys in their org. Members see surveys they created, surveys shared with their org, or surveys shared with their teams.
- Owner/Admin role escalation: Owner/Admin can update and publish any survey in their org, not just surveys they created.
- Publish generates a `uuid4` token stored in the survey document.
- Route paths use empty string (`""`) instead of `"/"` to avoid double-slash issues with `redirect_slashes=False`.

### AI Question Generation
- Uses OpenAI **Responses API** with `stream=True` (not Chat Completions).
- Model: `gpt-5.4-mini` (configurable via `OPENAI_MODEL` in `.env`).
- Backend streams SSE events: `data: {"question": "..."}\n\n` per question, `data: [DONE]\n\n` at end.
- Frontend uses native `fetch()` + `ReadableStream` (not Axios) because Axios doesn't support streaming.
- Prompt asks LLM to output one question per line (no JSON, no numbering) for easy newline-based parsing.
- `onQuestion` callback uses pure state updater (filters empties + appends) — safe under React StrictMode double-invocation.

### AI Field Enhancement
- Uses the same OpenAI Responses API streaming pattern as question generation, but emits raw text tokens instead of complete questions.
- SSE format: `data: {"token": "..."}\n\n` per chunk (not per question). Frontend accumulates tokens character-by-character into the field via `setter(prev => prev + token)`.
- Context hierarchy is top-to-bottom: title has no context, description gets title, goal gets title+description, etc. Defined in `CONTEXT_HIERARCHY` dict in both `server/ai/prompts.py` and `client/src/hooks/useFieldEnhance.js`.
- `build_enhance_prompt()` selects context fields based on hierarchy, includes per-field instructions from `FIELD_INSTRUCTIONS` dict.
- `current_value` is captured before the field is cleared, so the AI knows what to improve (or generates fresh if empty).
- `useFieldEnhance` hook: one field at a time (`enhancingField` state is null or a field name string). Other enhance buttons and AI question generation are disabled via `enhanceBusy` flag.

### Interviewer
- System prompt uses `{remaining_minutes}` and `{personality_tone}` placeholders, formatted at runtime.
- `personality_tone` controls the LLM's conversational style: professional, friendly, casual, or fun. Stored on the survey, injected into prompt on every turn.
- Per-question `ai_instructions` (optional) let survey creators control interviewer behavior per question (e.g., "drill down", "don't probe", "ask for examples"). Injected as `[Instructions: ...]` below each question in the prompt. Prompt builder handles both legacy string and new dict question formats via `isinstance` check.
- `welcome_message` is an optional custom greeting. If blank, default template inserts survey title. Saved as the first assistant message in the session.
- Coverage tag `[COVERED: 1, 3, 5]` uses 1-based indices matching the numbered question list in the prompt. Backend parses via regex (`parse_coverage_tag()` in `engine.py`) and strips before saving.
- Conversation history is embedded in the interview document (bounded at ~40 messages), not a separate collection.
- `Message.content` stores text with coverage tag already stripped (stripping happens after stream completes, before saving).
- DB utility functions in `server/interviewer/db.py` return typed `InterviewResponse` models directly.
- Engine builds messages array as: system prompt (developer role) + full conversation history. LLM sees everything to decide what to ask next.
- If `remaining_minutes <= 0`, engine appends an urgent wrap-up instruction to the system prompt.
- After stream completes, route saves clean message, updates questions_covered, and auto-completes session if all questions covered or time expired.

### Interview Chat UI
- Uses `@assistant-ui/react` v0.12.x with headless primitives (not pre-styled components) for full Tailwind control.
- `InterviewChat` component mounts only during chatting phase so `useLocalRuntime` hook is called unconditionally (React hooks rules).
- `ChatModelAdapter.run` is an async generator: extracts latest user message text, POSTs to `/interview/{sessionId}/message`, parses SSE stream, yields cumulative `{ content: [{ type: 'text', text }] }` on each token.
- Completion flow: backend auto-completes session → next message POST returns 400 → adapter calls `onComplete()` callback → page transitions to completed phase.
- Two routes resolve to one component: `/interview/:token` (respondent) and `/interview/test/:surveyId` (admin). Component uses `useParams()` to detect which route matched.
- Test route listed before token route in App.jsx so `/interview/test/xxx` matches the static `test` segment first.
- **Speech-to-text dictation:** `DictateButton` component inside the composer uses `useSpeechToText` hook + `useComposerRuntime()` from assistant-ui. The hook wraps `window.SpeechRecognition` (or `webkitSpeechRecognition`) with `continuous=true`, `interimResults=true`. On each final transcript result, `composerRuntime.setText()` appends text to the composer. Auto-restarts recognition on silence (browser stops after ~5s silence). Button hidden via `isSupported` check on browsers without Web Speech API. No backend involved.

### Webhooks
- `webhook_url` is stored on the survey document. When an interview completes, `fire_webhook()` in `server/interviewer/utils.py` is called via `asyncio.create_task()`.
- Webhook fetches the interview + survey docs from MongoDB, builds the payload, and POSTs via `httpx.AsyncClient` with a 10s timeout.
- Test runs (`is_test_run=True`) are skipped — only real respondent interviews trigger webhooks.
- Errors are caught and logged (`logger.warning`) but never propagate — webhook failures must not break the interview flow.
- No retry logic in v1. Payload is metadata-only (no transcript).

### Email Notifications
- On interview completion, `fire_completion_emails()` in `server/interviewer/utils.py` is called via `asyncio.create_task()`.
- Sends two emails: respondent thank-you (`send_completion_email`) and creator notification (`send_creator_notification`).
- Only fires if `notify_on_completion` is true on the survey and respondent provided an email.
- Test runs (`is_test_run=True`) are skipped.
- Errors are caught and logged — email failures never break the interview flow.

### Custom Analytics Instructions
- `analytics_instructions` is stored on the survey document.
- Both `build_interview_analysis_prompt()` and `build_survey_analysis_prompt()` in `server/analytics/prompts.py` append these instructions.
- Instructions are prefixed with a note that they must still follow the JSON output format.

### Production SPA Serving
- `server/main.py` uses `redirect_slashes=False` on FastAPI initialization.
- Root route (`GET /`) explicitly serves `index.html` from the built frontend.
- Custom 404 exception handler: returns JSON `{"detail": "Not found"}` for API routes (`/api/*`, `/docs`, `/redoc`, `/openapi.json`, `/health`), returns `index.html` for all other routes (SPA client-side routing).
- Static assets mounted at `/assets`.

### MongoDB
- Database name: `surveyagent` (configurable via `MONGO_DB_NAME`)
- Collections: `admins` (user accounts), `surveys` (survey definitions), `interviews` (chat sessions), `error_logs` (error tracking), `orgs` (organizations), `teams` (teams/sub-teams), `invites` (pending invitations, TTL-indexed), `otp_codes` (email verification codes, TTL-indexed), `feedback` (public feedback submissions, independent of app logic)
- Admin document fields: `name`, `email`, `password`, `org_name`, `org_id`, `role` (owner/admin/member), `email_verified`, `token_version`, `is_active`, `created_at`, `updated_at`, `last_login`
- Survey document fields: `title`, `description`, `goal`, `context`, `questions` (array of {text, ai_instructions}), `estimated_duration`, `welcome_message`, `personality_tone`, `webhook_url` (optional), `notify_on_completion` (bool), `analytics_instructions` (optional), `status`, `token`, `created_by`, `org_id`, `visibility` (private/team/org), `team_ids` (array of team ObjectIds), `created_at`, `updated_at`, `analysis` (cached aggregate AI analysis, optional)
- Interview document fields: `survey_id`, `respondent` (embedded: name, age, gender, occupation, phone_number, email — all optional), `conversation` (list of {role, content, timestamp}), `status` (in_progress/completed/abandoned), `is_test_run`, `questions_covered` (list of ints), `started_at`, `completed_at`, `analysis` (cached AI analysis, optional)
- Org document fields: `name`, `slug`, `owner_id`, `created_at`, `updated_at`
- Team document fields: `name`, `org_id`, `parent_id` (null for top-level), `members` (array of {user_id, name, email}), `created_at`, `updated_at`
- Invite document fields: `email`, `org_id`, `role`, `token`, `invited_by`, `expires_at`, `used`, `created_at`
- Feedback document fields: `name` (optional), `email` (optional), `message`, `rating` (optional, 1-5), `created_at`

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
| POST   | /enhance-field      | Bearer   | Stream AI-enhanced content for a single field  |
| POST   | /synthesize-speech  | Bearer   | Generate TTS audio via OpenAI TTS API          |

### Interview — `/api/v1/interview`

| Method | Path                    | Auth     | Description                                         |
|--------|-------------------------|----------|-----------------------------------------------------|
| GET    | /{survey_token}/info    | None     | Get survey title, description, duration for landing  |
| POST   | /start/{survey_token}   | None     | Start interview session for published survey         |
| POST   | /{session_id}/message   | None     | Send respondent message, stream AI response via SSE  |
| POST   | /test/{survey_id}       | Bearer   | Start admin test session (works with draft surveys)  |

### Analytics — `/api/v1/analytics`

| Method | Path                              | Auth     | Description                                            |
|--------|-----------------------------------|----------|--------------------------------------------------------|
| GET    | /surveys                          | Bearer   | Overview stats across all admin's surveys              |
| GET    | /surveys/{id}                     | Bearer   | Detailed stats for a single survey (includes analysis) |
| GET    | /surveys/{id}/interviews          | Bearer   | Paginated interview list for a survey                  |
| GET    | /surveys/{id}/interviews/export   | Bearer   | All interviews for bulk export (no pagination)         |
| POST   | /surveys/{id}/analyze             | Bearer   | Stream aggregate AI analysis of all interviews via SSE |
| GET    | /interviews/{id}                  | Bearer   | Full interview detail with conversation                |
| POST   | /interviews/{id}/analyze          | Bearer   | Stream AI analysis of single interview via SSE         |

### Feedback — `/api/v1/feedback`

| Method | Path | Auth     | Description                    |
|--------|------|----------|--------------------------------|
| POST   |      | None     | Submit public feedback         |

## Conventions

- Backend follows the pattern from the OB-Reporter reference project (same error handling, same JWT structure, same MongoDB patterns, same OpenAI streaming).
- Every backend route uses the pattern: `try / except HTTPException: raise / except Exception: log + log_error + raise 500`.
- Frontend components use functional components with hooks. No class components.
- Landing page sections alternate between light (`bg-background`) and dark (`bg-dark`) backgrounds.
- Framer Motion: never use `left-1/2 -translate-x-1/2` on `motion.*` elements — framer-motion overrides CSS `transform`. Use `inset-x-0 mx-auto` instead.
- AI prompts live in dedicated `prompts.py` files, separate from route handlers.
- SSE streaming pattern: backend yields `data: {json}\n\n` events, frontend consumes via `fetch()` + `ReadableStream`.
- React state updaters inside streaming callbacks must be **pure functions** (no mutable closure variables) to survive StrictMode double-invocation.

## Coding Style & File Organization

### Python Backend Module Pattern

Every backend module must follow this structure. Only include files that the module needs.

```
server/<module>/
├── __init__.py        # Package marker
├── schemas.py         # All Pydantic models (request/response/DB) — NEVER inline in routes
├── routes.py          # Thin route handlers — validate input, call utils/db/engine, return response
├── utils.py           # Helper functions, constants, doc-to-response converters
├── db.py              # Database CRUD operations (only if module does direct DB access)
├── prompts.py         # LLM prompt templates (only if module uses AI)
└── engine.py          # Core business logic / orchestration (only if complex processing)
```

**Python rules:**
- **Routes are thin:** No inline Pydantic models, no inline helper functions, no business logic. Delegate to utils/db/engine.
- **Public function names:** Functions in utils.py use public names (no underscore prefix) — they are module-level exports.
- **Schema naming:** Use descriptive names: `XxxRequest`, `XxxResponse`, `XxxInDB`, `XxxCreate`, `XxxUpdate`.
- **Error handling:** Every route uses `try / except HTTPException: raise / except Exception: log + log_error + raise 500`.
- **Post-stream processing:** Complex post-stream logic (message saving, coverage updates, auto-completion) belongs in utils, not inline in route generators.

### React Frontend Pattern

```
client/src/
├── api/               # API layer — one file per backend module, barrel export via index.js
├── components/
│   ├── shared/        # Reusable UI components (badges, modals) with barrel index.js
│   ├── <feature>/     # Feature-scoped components (interview/, auth/)
│   └── landing/       # Landing page sections
├── hooks/             # Custom hooks with barrel index.js
├── utils/             # Pure utility functions (formatters, validators) with barrel index.js
├── context/           # React contexts
└── pages/             # Page components — compose hooks + render JSX, minimal logic
```

**React rules:**
- **Pages are thin:** Pages compose hooks and render JSX. Extract state + logic into custom hooks when a page exceeds ~200 lines or has >5 useState calls.
- **No duplication:** If a function/component is used in 2+ files, extract to `utils/` or `components/shared/`.
- **Custom hooks:** One hook per file in `hooks/`, `use` prefix, export from `hooks/index.js`.
- **Shared components:** Reusable UI components go in `components/shared/` with barrel export.
- **Shared utilities:** Pure functions (formatters, validators, constants) go in `utils/` with barrel export.
- **Barrel exports:** Each shared directory has an `index.js` for clean imports.
- **Streaming callbacks:** State updaters inside streaming callbacks must be pure functions (no mutable closure variables) to survive StrictMode double-invocation.

### Multi-Tenant Org Support (complete)
- **Organizations**: Auto-created on signup, users become Owner. Org name, slug, member list.
- **Roles**: Owner (full control), Admin (invite + team management), Member (create surveys). All roles can create surveys.
- **Email Verification (OTP)**: 6-digit OTP sent via Resend after signup. Must verify before accessing protected routes. 10-min expiry, rate-limited resend (3 per 10 min).
- **Invite System**: Owner/Admin can invite via email (Resend). Invitee gets link → registers with name+password → lands in org as assigned role. 7-day invite expiry.
- **Teams & Sub-Teams**: Teams inside orgs, sub-teams one level deep. Members can belong to multiple teams. Only Owner/Admin can manage.
- **Survey Visibility**: Private (creator only, plus Owner/Admin), Team (team + sub-teams), Org (everyone in org). Owner/Admin can see all surveys in their org regardless of visibility. Chosen at survey creation.
- **Access Control**: Org isolation — users never see another org's data. Visibility query uses `$or` with created_by, org+visibility, and team membership.
- **Migration Script**: `scripts/migrate_multi_tenant.py` — creates orgs for existing admins, sets visibility=private on existing surveys, creates all indexes.

### Multi-Tenant Architecture Decisions
- **New collections**: `orgs`, `teams`, `invites`, `otp_codes` — all with appropriate indexes and TTL where needed
- **Admin doc extended**: `org_id`, `role`, `email_verified` fields added
- **Survey doc extended**: `org_id`, `visibility`, `team_ids` fields added
- **Email via Resend**: `server/email/service.py` uses httpx to POST to Resend API. Branded HTML templates in `templates.py`. From: `noreply@getsurveyagent.com`
- **`get_current_user` enforces email verification**: Returns 403 `email_not_verified` for unverified users on all protected routes
- **Survey visibility query**: `build_visibility_query()` in `server/surveys/utils.py` builds `$or` query. Owner/Admin get a simplified query (created_by + org_id) since they can see all org surveys. Members get the full visibility filter (created_by + org+org visibility + org+team+team_ids)
- **Team inheritance**: `get_user_team_ids()` returns user's direct teams PLUS parent teams of any sub-teams they belong to
- **Analytics updated**: `verify_survey_ownership` → `verify_survey_access`, `get_overview_stats` accepts full `current_user` dict
- **Frontend pages**: VerifyEmail, InviteAccept, OrgSettings, TeamManagement. Settings page links to org/team management.
- **Survey form**: Visibility selector (Private/Team/Org) with team multi-select when Team is chosen

### Multi-Tenant API Endpoints

#### Organization — `/api/v1/org`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Bearer | Get current org |
| PUT | / | Bearer (Owner) | Update org name |
| GET | /members | Bearer | List org members |
| PUT | /members/{user_id}/role | Bearer (Owner) | Change role |
| DELETE | /members/{user_id} | Bearer (Owner/Admin) | Remove member |
| POST | /transfer-ownership | Bearer (Owner) | Transfer ownership |

#### Teams — `/api/v1/teams`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | / | Bearer (Owner/Admin) | Create team |
| GET | / | Bearer | List teams (nested) |
| GET | /{team_id} | Bearer | Get team detail |
| PUT | /{team_id} | Bearer (Owner/Admin) | Update team |
| DELETE | /{team_id} | Bearer (Owner/Admin) | Delete team + sub-teams |
| POST | /{team_id}/members | Bearer (Owner/Admin) | Add member |
| DELETE | /{team_id}/members/{user_id} | Bearer (Owner/Admin) | Remove member |

#### Auth (new endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/verify-otp | None | Verify 6-digit OTP |
| POST | /auth/resend-otp | None | Resend OTP |
| POST | /auth/register-invite | None | Register via invite |
| POST | /auth/invite | Bearer (Owner/Admin) | Send invite email |
| GET | /auth/invite/{token} | None | Get invite info |

#### Feedback — `/api/v1/feedback`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | / | None | Submit public feedback |

## What's NOT Built Yet

- Voice interview mode
- Video avatar interview mode
