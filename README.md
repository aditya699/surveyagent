<div align="center">

# SurveyAgent

**Open-source AI survey platform that replaces static forms with dynamic conversations.**

Every respondent gets a one-on-one interview with an AI that listens, adapts, and digs deeper — just like a real human researcher. You get rich, actionable insights at scale.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React 19](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/mongodb-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Docker Ready](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)](Dockerfile)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/aditya699/surveyagent/pulls)

### Try it live: [getsurveyagent.azurewebsites.net](https://getsurveyagent.azurewebsites.net)

We'd love your feedback! Create an account, build a survey, and let the AI interview you. Report bugs or share thoughts via [Issues](https://github.com/aditya699/surveyagent/issues) or the in-app [Feedback](https://getsurveyagent.azurewebsites.net/feedback) page.

[Features](#features) · [Quick Start](#quick-start) · [Documentation](#documentation) · [Contributing](#contributing)

</div>

---

## The Problem

Traditional survey tools give you structured data but miss the story behind the answers. Interviews capture rich insights but don't scale. You're stuck choosing between depth and reach.

## The Solution

SurveyAgent bridges that gap. An AI interviewer conducts natural conversations with every respondent — following your questions, probing deeper when it matters, and wrapping up gracefully when time runs out. Then AI-powered analytics synthesizes insights across all interviews into actionable reports.

Self-hostable. Open-source. Your data stays with you.

---

## Features

**Conversational AI Interviews** — Respondents chat naturally with an AI interviewer that adapts in real time. It knows when to probe deeper, when to move on, and when to wrap up. Configurable personality tone: professional, friendly, casual, or fun.

**Smart Survey Builder** — Define your survey with a title, description, goal, and context. Add questions manually or let AI generate them. Every question supports optional AI instructions to guide the interviewer's behavior.

**Question Test Panel** — Test individual questions with the AI before publishing. A slide-over panel lets you have a real conversation to see exactly how the interviewer handles each question.

**AI Field Enhancement** — Hit "Enhance" on any text field and the AI improves it (or generates fresh content if empty). Add custom instructions like "Make it crisp" or "Keep it formal" to steer the output.

**Multi-LLM Support** — Choose between OpenAI, Anthropic (Claude), and Google Gemini. Pluggable provider architecture — each survey or request can use a different model.

**Analytics & AI Analysis** — Per-interview scoring, sentiment detection, and theme identification. Aggregate survey-level analysis synthesizes ALL interviews into a single report with consensus points, divergence, and respondent patterns. Custom analytics instructions let you focus the AI on what matters.

**Data Export** — CSV exports for transcripts, bulk responses, and summaries. Branded PDF reports with score badges, section layouts, and professional formatting.

**Multi-Tenant Organizations** — Orgs auto-created on signup. Role-based access (Owner / Admin / Member). Teams and sub-teams with survey visibility controls (private / team / org).

**Email & Webhooks** — Respondent thank-you emails and creator notifications on completion. Optional webhook URL per survey to POST results to external services like Slack.

**Voice Interview Mode** — Full voice conversations with the AI interviewer. Speak naturally — Whisper transcribes your speech, the AI responds with sentence-level TTS streaming (starts speaking the first sentence while still generating the rest), then auto-listens for your next reply. Tap-to-talk with 7-second silence timeout. Switch between Text and Voice modes anytime.

**Speech-to-Text Dictation** — In text mode, respondents can dictate replies using the browser's native Web Speech API. No backend needed — runs entirely client-side.

**Docker Deployment** — Single container serves both API and frontend. Multi-stage Dockerfile with Gunicorn + Uvicorn workers. Production-ready.

---

## Built With

| Layer | Stack |
|-------|-------|
| **Backend** | Python 3.12+, FastAPI, Motor (async MongoDB), JWT auth |
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion, assistant-ui |
| **AI** | OpenAI, Anthropic, Gemini (pluggable providers), streaming SSE |
| **Database** | MongoDB (Atlas or self-hosted) |
| **Email** | Resend (OTP, invites, notifications) |
| **Deployment** | Docker, Gunicorn + Uvicorn, Azure Web Apps |

---

## Quick Start

**Prerequisites:** Python 3.12+, Node.js 18+, MongoDB, [uv](https://docs.astral.sh/uv/), OpenAI API key

```bash
git clone https://github.com/aditya699/surveyagent.git
cd surveyagent
cp .env.example .env   # Fill in your values
```

**Backend:**
```bash
uv sync
uv run uvicorn server.main:app --reload --port 8001
```

**Frontend:**
```bash
cd client && npm install && npm run dev   # http://localhost:5174
```

**Docker:**
```bash
docker build -t surveyagent .
docker run -p 8000:8000 --env-file .env surveyagent
```

---

## Documentation

| Doc | What's Inside |
|-----|---------------|
| **[PRODUCT.md](PRODUCT.md)** | Detailed feature descriptions, product philosophy, and roadmap |
| **[CLAUDE.md](CLAUDE.md)** | Technical reference — architecture, API endpoints, coding conventions |
| **[deployment-guide.md](deployment-guide.md)** | Step-by-step Azure Web App deployment |

---

## Philosophy

- **Open source** — MIT licensed, no telemetry, no vendor lock-in
- **Self-hostable** — run it on your own infrastructure
- **Data ownership** — your survey data never leaves your control
- **LLM-agnostic** — pluggable providers for OpenAI, Anthropic, Gemini, and more

---

## What's Next

- **Video avatar** — a visual AI interviewer on screen

---

## Contributing

Contributions are welcome! Open an issue to discuss what you'd like to change, or submit a pull request directly.

```bash
# Fork the repo, create a branch, make your changes, then:
git push origin your-branch
# Open a PR on GitHub
```

---

<div align="center">

**MIT License** · Built with care by [Aditya](https://github.com/aditya699)

</div>
