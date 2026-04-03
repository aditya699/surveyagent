<div align="center">

# SurveyAgent

### Why are you still sending static forms?

**SurveyAgent interviews your users for you.** Every respondent gets a 1-on-1 conversation with an AI that listens, adapts, and digs deeper — like a real researcher, but at infinite scale.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React 19](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/mongodb-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Docker Ready](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)](Dockerfile)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/aditya699/surveyagent/pulls)

[![Try it live](https://img.shields.io/badge/Try_it_live-getsurveyagent.com-C4956A?style=for-the-badge&logo=googlechrome&logoColor=white)](https://getsurveyagent.com)

[Features](#-what-you-get) · [Quick Start](#-quick-start) · [Self-Host](#-self-host-in-2-minutes) · [Contributing](#-contributing)

</div>

---

<div align="center">

### See it in action

[![SurveyAgent Demo](https://img.youtube.com/vi/Z_Xl8a2la2E/maxresdefault.jpg)](https://www.youtube.com/watch?v=Z_Xl8a2la2E)

*Click to watch the demo*

</div>

---

> Google Forms gives you checkboxes. SurveyAgent gives you conversations.
>
> A static form asks "Rate your experience 1-5." SurveyAgent asks "What was your experience like?" — then follows up with "That's interesting, tell me more about the onboarding issues you mentioned." That's the difference between data and insight.

---

## The gap nobody talks about

Surveys scale but miss nuance. Interviews capture depth but don't scale. Pick one.

**SurveyAgent picks both.** An AI interviewer conducts natural conversations with every respondent — following your questions, probing deeper when it matters, wrapping up on time. Then AI analytics synthesizes all interviews into one actionable report.

Open source. Self-hostable. Your data never leaves your infrastructure.

---

## What you get

### Talk, not click

Respondents have a real conversation instead of picking radio buttons. The AI knows when to probe deeper, when to move on, and when to wrap up. Set the personality — professional, friendly, casual, or fun.

### Three ways to respond

**Text** — Chat naturally in the browser. Speech-to-text dictation built in.

**Voice** — Speak to the AI. Whisper transcribes, the AI responds with sentence-level TTS streaming (speaks the first sentence while still thinking about the rest), then auto-listens for your reply.

**Video avatar** — Coming soon. A face on the other side of the conversation.

### Smart survey builder

Define your survey with a title, goal, and context. Add questions manually or let AI generate them. Every question supports optional AI instructions ("drill down on pricing", "don't probe further", "ask for examples").

**AI field enhancement** — Hit enhance on any field. The AI improves your text or generates fresh content. Add custom instructions like "Make it crisp" or "Keep it formal."

**Question test panel** — Test individual questions before publishing. Have a real conversation with the AI to see exactly how it handles each question.

### Bring your own LLM

OpenAI, Anthropic, or Gemini. Pluggable provider architecture — each survey can use a different model. Your API keys, your choice.

### Analytics that write themselves

Per-interview scoring, sentiment detection, theme identification. Aggregate analysis synthesizes ALL interviews into a single report — consensus points, divergence, respondent patterns. Custom analytics instructions focus the AI on what matters to you.

**Export anything** — CSV for transcripts and bulk data. Branded PDF reports with score badges and professional formatting.

### Built for teams

Organizations auto-created on signup. Role-based access: Owner, Admin, Member. Teams and sub-teams with survey visibility controls (private, team, org). Email invites with OTP verification.

### Never miss a response

Respondent thank-you emails and creator notifications on completion. Webhook any survey to POST results to Slack, Zapier, or wherever you need them. Abandoned interviews auto-detected after configurable timeout.

---

## Quick start

**Prerequisites:** Python 3.12+, Node.js 18+, MongoDB, [uv](https://docs.astral.sh/uv/), an LLM API key (OpenAI, Anthropic, or Gemini)

```bash
git clone https://github.com/aditya699/surveyagent.git
cd surveyagent
cp .env.example .env   # Add your API keys and MongoDB URI
```

**Backend:**
```bash
uv sync
uv run uvicorn server.main:app --reload --port 8001
```

**Frontend:**
```bash
cd client && npm install && npm run dev
```

Open `http://localhost:5174` and create your first survey.

---

## Self-host in 2 minutes

```bash
docker compose up -d
```

Or build manually:

```bash
docker build -t surveyagent .
docker run -p 8000:8000 --env-file .env surveyagent
```

Single container. Backend API + frontend SPA + Gunicorn workers. Production-ready.

See [deployment-guide.md](deployment-guide.md) for Azure Web Apps deployment.

---

## Tech stack

| Layer | Stack |
|-------|-------|
| **Backend** | Python 3.12+, FastAPI, Motor (async MongoDB), JWT auth |
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion, assistant-ui |
| **AI** | OpenAI, Anthropic, Gemini — pluggable providers, streaming SSE |
| **Database** | MongoDB (Atlas or self-hosted) |
| **Email** | Resend (OTP verification, invites, notifications) |
| **Deployment** | Docker, Gunicorn + Uvicorn |

---

## Documentation

| Doc | What's inside |
|-----|---------------|
| [**PRODUCT.md**](PRODUCT.md) | Feature deep-dives, product philosophy, roadmap |
| [**CLAUDE.md**](CLAUDE.md) | Architecture, API endpoints, coding conventions |
| [**deployment-guide.md**](deployment-guide.md) | Step-by-step cloud deployment |

---

## Philosophy

**Open source** — MIT licensed. No telemetry. No vendor lock-in. No "open core" bait-and-switch.

**Self-hostable** — Run it on your infrastructure. MongoDB, one Docker container, done.

**Data ownership** — Your survey data never touches our servers (unless you choose the hosted version).

**LLM-agnostic** — Swap providers without changing a line of survey config.

---

## Roadmap

- **Video avatar interviews** — a visual AI interviewer on screen

---

## Contributing

We'd love contributions. Open an issue to discuss what you'd like to change, or submit a PR directly.

```bash
# Fork the repo, create a branch, make changes
git push origin your-branch
# Open a PR on GitHub
```

Feedback welcome via [Issues](https://github.com/aditya699/surveyagent/issues) or the in-app [Feedback page](https://getsurveyagent.com/feedback).

---

<div align="center">

**MIT License** · Built by [Aditya](https://github.com/aditya699)

Star the repo if this is the future of surveys.

</div>
