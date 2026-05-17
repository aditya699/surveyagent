# SurveyAgent Floating Chatbot

A floating AI assistant built into the SurveyAgent platform. Answers questions about the platform and the user's live data.

---

## What You Can Ask

**Survey management**
- How do I add AI-generated questions to my survey?
- What is personality tone and how does it affect interviews?
- How do I set a welcome message?
- What does survey visibility (private / team / org) mean?

**Interviews**
- What is the difference between text, voice, and live mode?
- How does respondent language selection work?
- How do I test my survey before publishing?

**Analytics**
- How do I run AI analysis on an interview?
- What does the sentiment score mean?
- How do I export data as PDF or CSV?
- What are custom analytics instructions?

**Org & teams**
- How do I invite someone to my org?
- What is the difference between owner, admin, and member roles?
- How do I share a survey with a specific team?

**Integrations**
- How do I set up a webhook for interview completions?
- How do I enable email notifications?
- Can I use Anthropic or Gemini instead of OpenAI?

**Page-aware answers**
When you are on a specific page (dashboard, analytics, survey detail), the chatbot knows the real data on your screen and can answer questions about it directly — e.g. "why is my completion rate low?" while on the analytics page will reference your actual numbers.

---

## Architecture — Full Pipeline

```
User types a message
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Layer 1 — Rate Limit Guard (Frontend)              │
│  useChatRateLimit checks localStorage:              │
│  - 20 messages per rolling hour                     │
│  - If blocked → show countdown UI, block send       │
│  - Warning shown at 3 or fewer messages remaining   │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Layer 2 — Sliding Window (Frontend)                │
│  Full conversation stored in localStorage           │
│  (up to 100 messages visible in UI)                 │
│  Only last 20 messages sent to backend per request  │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Layer 3 — User Message Injection (Frontend)        │
│  useChatbotPage() hook on key pages pushes          │
│  a live plain-text summary into ChatbotPageContext. │
│                                                     │
│  Wired pages:                                       │
│  - Dashboard      → survey titles + statuses        │
│  - AnalyticsOverview → overall stats per survey     │
│  - SurveyAnalytics   → interview count, score, rate │
│  - SurveyDetail      → survey title, questions, goal│
│                                                     │
│  This summary is prepended to the user's message:   │
│  "[Current page data] ..."                          │
│  + actual question                                  │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Layer 4 — System Prompt Injection (Backend)        │
│  build_chatbot_prompt() prepends stable user        │
│  identity to the system prompt:                     │
│  - User name, org name, current page label          │
│  + full platform knowledge base                     │
│                                                     │
│  System prompt = stable  → LLM can cache it         │
│  User message  = dynamic → contains live data       │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Layer 5 — Rate Limit Guard (Backend)               │
│  check_and_increment() in chatbot_rate_limits       │
│  MongoDB collection:                                │
│  - 20 requests per 1-hour window per user           │
│  - On breach: blocked_until = now + 2 hours         │
│  - Returns 429 with retry_after Unix timestamp      │
│  - Server-side enforcement (cannot be bypassed)     │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Layer 6 — LLM Streaming (Backend)                  │
│  Provider (OpenAI / Anthropic / Gemini) streams     │
│  response via SSE:  data: {"token": "..."}\n\n      │
│  Final event:       data: [DONE]\n\n                │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Layer 7 — Streaming UI (Frontend)                  │
│  Tokens appended character-by-character into        │
│  assistant bubble. Typing dots shown until          │
│  first token arrives.                               │
│  429 response → onRateLimit → blocked UI with       │
│  live countdown timer.                              │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Layer 8 — Persistence (Frontend)                   │
│  Full conversation saved to localStorage on every   │
│  message. Next session loads it on mount —          │
│  continuous context across page refreshes (Chat B   │
│  picks up where Chat A left off).                   │
└─────────────────────────────────────────────────────┘
```

---

## Rate Limiting

| Setting | Value |
|---|---|
| Messages per hour | 20 |
| Block duration | 2 hours |
| Warning shown at | 3 or fewer remaining |
| Enforcement | Backend (MongoDB) + Frontend (localStorage) |
| Block persists across | Page refreshes, tab close/reopen |

The frontend tracks counts locally for early warning UI.
The backend enforces the hard limit — it cannot be bypassed from the client.

---

## Key Files

| File | Purpose |
|---|---|
| `server/chatbot/routes.py` | POST `/api/v1/chatbot/message` — rate check + stream |
| `server/chatbot/rate_limit.py` | MongoDB rate limit logic |
| `server/chatbot/prompts.py` | System prompt + `build_chatbot_prompt()` |
| `server/chatbot/schemas.py` | `ChatRequest`, `UserContext` Pydantic models |
| `client/src/components/shared/FloatingChatbot.jsx` | Full chatbot UI |
| `client/src/hooks/useChatRateLimit.js` | Rate limit state, countdown, auto-unblock |
| `client/src/hooks/useChatbotPage.js` | Page data registration hook |
| `client/src/context/ChatbotPageContext.jsx` | Shared page context store |
| `client/src/api/chatbot.js` | SSE streaming fetch function |

---

## Limitations

- No access to actual survey response data or interview transcripts (page summaries only)
- Cannot take actions (create surveys, delete data, etc.) — read-only assistant
- Scoped to SurveyAgent platform questions only
