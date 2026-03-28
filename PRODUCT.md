# SurveyAgent

**AI-powered conversational surveys that replace static forms with dynamic interviews.**

SurveyAgent is an open-source platform that turns traditional surveys into natural conversations. Instead of clicking through checkboxes and dropdowns, respondents talk to an AI interviewer that listens, adapts, and digs deeper — just like a real human researcher would.

Self-hostable. Open-source. Your data stays with you.

---

## Why SurveyAgent?

Traditional survey tools give you structured data but miss the story behind the answers. Interviews capture rich insights but don't scale. SurveyAgent bridges that gap — every respondent gets a one-on-one conversation, and you get actionable analysis across all of them.

---

## Features

### Conversational AI Interviews
- Respondents chat naturally with an AI interviewer instead of filling out forms
- The interviewer follows your questions but adapts the conversation in real time
- It knows when to probe deeper, when to move on, and when to wrap up
- Time-aware — respects your estimated duration and wraps up gracefully

### Smart Survey Creation
- Define your survey with a title, description, goal, and context
- Add questions manually or let AI generate them for you
- AI question generation streams questions one by one — pick and choose what you keep
- Every question supports optional AI instructions (e.g., "probe for specifics", "don't push if they're uncomfortable")

### AI Field Enhancement
- Hit "Enhance with AI" on any text field — title, description, goal, context, welcome message
- If the field has content, AI improves it; if it's empty, AI generates fresh content
- Context flows naturally: enhancing a description uses your title as context, enhancing a goal uses both title and description, and so on

### Interviewer Personality
- Choose a tone for your interviewer: professional, friendly, casual, or fun
- The personality shapes how the AI asks questions, responds to answers, and manages the conversation
- Custom welcome messages let you set the first impression

### Analytics & AI Analysis
- **Per-interview analysis:** AI scores interview quality, detects sentiment, identifies themes, strengths, concerns, and areas for improvement — all per question
- **Survey-level analysis:** Synthesizes insights across ALL completed interviews into a single report with consensus points, divergence, respondent patterns, and per-question aggregate findings
- Executive summaries with text-to-speech playback
- Question coverage tracking shows which questions were addressed
- Session stats: duration, completion rates, respondent counts

### Multi-Tenant Organizations
- Organizations are auto-created on signup — the first user becomes Owner
- **Role-based access:** Owner (full control), Admin (invite + team management), Member (create surveys)
- **Invite system:** Owner/Admin invite members via email — invitees register with a link and land in the org with their assigned role
- **Email verification:** 6-digit OTP sent via Resend after signup, required before accessing the platform

### Teams & Sub-Teams
- Create teams within your organization to group members
- Sub-teams nest one level deep under parent teams
- Members can belong to multiple teams
- Only Owner and Admin roles can manage teams

### Survey Visibility
- **Private** — only the creator can see the survey
- **Team** — visible to members of selected teams and their sub-teams
- **Org** — visible to everyone in the organization
- Choose visibility when creating or editing a survey

### Data Export
- CSV exports for interview transcripts, bulk responses, and analytics summaries
- Branded PDF reports with score badges, section layouts, and autoTable formatting
- Export available on Interview Detail, Survey Analytics, Survey Detail, and Analytics Overview pages

### Webhooks
- Optional webhook URL per survey
- POSTs interview results (respondent, coverage, timestamps) to external services on completion
- Fire-and-forget — never blocks the interview flow
- Test runs are skipped

### Admin Dashboard
- Create, edit, duplicate, and delete surveys
- Draft and published workflow — test before you go live
- Test mode lets you preview the full interview experience before publishing
- Publish and share via a simple link — no login required for respondents
- Organization settings: manage members, change roles, transfer ownership
- Team management: create teams/sub-teams, add/remove members

### Respondent Experience
- Clean, focused chat interface — no distractions
- Optional details form (name, email, age, etc.) — all fields optional
- Works on any device with a browser

---

## What's Coming Next

- **Voice interviews** — respondents speak instead of type
- **Video avatar** — a visual AI interviewer on screen

---

## Philosophy

- **Open source** — MIT licensed, no telemetry, no vendor lock-in
- **Self-hostable** — run it on your own infrastructure
- **Data ownership** — your survey data never leaves your control
- **LLM-agnostic** — designed to work with any language model provider
