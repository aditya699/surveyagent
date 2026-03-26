# SurveyAgent

Open-source AI survey platform that replaces static forms with dynamic conversations. An AI interviewer conducts interviews with respondents via text chat, adapting follow-up questions in real time. Self-hostable, LLM-agnostic, and keeps all survey data under your control.

## Features

- **AI Interviewer** — conversational interviews via text chat with configurable personality tone, per-question AI instructions, time-aware pacing, and automatic question coverage tracking
- **Survey Builder** — full CRUD with AI-powered question generation and field enhancement (title, description, goal, context, welcome message)
- **Analytics Dashboard** — per-interview and aggregate survey-level AI analysis with scores, sentiment detection, theme identification, and per-question evaluation
- **Data Export** — CSV exports (transcripts, bulk responses, summaries) and branded PDF reports (analysis, survey definitions) with one-click download
- **Webhooks** — optional webhook URL per survey; POSTs interview results (respondent, coverage, timestamps) to external services (e.g., Slack) on completion
- **Text-to-Speech** — listen to executive summaries via OpenAI TTS API (gpt-4o-mini-tts)
- **Landing Page** — 13-section marketing page with scroll animations, responsive navbar, and dark/light section alternation
- **Auth System** — JWT with token versioning for server-side revocation, auto-refresh with queue pattern, admin registration/login/profile

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python 3.12+, FastAPI, Motor (async MongoDB), python-jose (JWT), bcrypt, OpenAI SDK, httpx |
| **Frontend** | React 19, Vite, Tailwind CSS v3, Framer Motion, Lucide React, React Router v7, Axios, assistant-ui, jsPDF + jspdf-autotable |
| **Database** | MongoDB (Atlas or self-hosted) |
| **AI** | OpenAI Responses API (streaming via SSE) |
| **Package Managers** | uv (backend), npm (frontend) |

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- MongoDB (Atlas or local)
- [uv](https://docs.astral.sh/uv/) (recommended) or pip
- OpenAI API key

### Setup

```bash
# Clone the repo
git clone https://github.com/aditya699/surveyagent.git
cd surveyagent

# Copy .env.example and fill in your values
cp .env.example .env
```

### Run Backend

```bash
uv sync
uv run uvicorn server.main:app --reload --port 8001
```

### Run Frontend

```bash
cd client
npm install
npm run dev    # http://localhost:5174
```

## Project Structure

```
surveyagent/
├── server/                     # FastAPI backend
│   ├── main.py                 # App factory, CORS, lifespan, router mount
│   ├── core/                   # Config, logging, LLM client
│   ├── db/                     # MongoDB connection + error logging
│   ├── auth/                   # JWT auth (register, login, refresh, profile)
│   ├── surveys/                # Survey CRUD + publish
│   ├── interviewer/            # AI interviewer engine, prompts, session management
│   ├── ai/                     # Question generation, field enhancement, TTS
│   └── analytics/              # Stats, AI analysis (interview + survey), export
├── client/                     # React frontend
│   └── src/
│       ├── api/                # Axios client, endpoint constants, API functions
│       ├── components/         # Shared, analytics, interview, landing components
│       ├── hooks/              # Custom hooks (auth, forms, AI streaming, analysis)
│       ├── utils/              # Formatters, CSV export, PDF export
│       ├── context/            # Auth context
│       └── pages/              # Page components
├── .env.example                # Environment variable template
├── pyproject.toml              # Python dependencies
└── uv.lock                     # Lockfile
```

## API Endpoints

### Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | None | Create admin account |
| POST | /login | None | Authenticate, return tokens |
| POST | /refresh | None | Rotate JWT tokens |
| GET | /me | Bearer | Get current admin profile |
| PUT | /update-profile | Bearer | Update name / org_name |

### Surveys — `/api/v1/surveys`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | / | Bearer | Create survey (draft) |
| GET | / | Bearer | List all surveys |
| GET | /{id} | Bearer | Get single survey |
| PUT | /{id} | Bearer | Update survey |
| DELETE | /{id} | Bearer | Delete survey |
| POST | /{id}/publish | Bearer | Publish + generate share token |

### AI — `/api/v1/ai`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /generate-questions | Bearer | Stream AI-generated questions via SSE |
| POST | /enhance-field | Bearer | Stream AI-enhanced field content via SSE |
| POST | /synthesize-speech | Bearer | Generate TTS audio |

### Interview — `/api/v1/interview`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /{token}/info | None | Survey info for landing page |
| POST | /start/{token} | None | Start interview session |
| POST | /{session_id}/message | None | Send message, stream AI response via SSE |
| POST | /test/{survey_id} | Bearer | Start admin test session |

### Analytics — `/api/v1/analytics`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /surveys | Bearer | Overview stats across all surveys |
| GET | /surveys/{id} | Bearer | Detailed stats for a survey |
| GET | /surveys/{id}/interviews | Bearer | Paginated interview list |
| GET | /surveys/{id}/interviews/export | Bearer | Bulk interview export (no pagination) |
| POST | /surveys/{id}/analyze | Bearer | Stream aggregate AI analysis via SSE |
| GET | /interviews/{id} | Bearer | Full interview detail |
| POST | /interviews/{id}/analyze | Bearer | Stream AI analysis via SSE |

## What's Not Built Yet

- Voice interview mode
- Video avatar interview mode
- Email verification
- Multi-tenant access control

## License

MIT
