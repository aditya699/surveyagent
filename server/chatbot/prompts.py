# Maximum number of history messages forwarded to the LLM (sliding window).
# Older messages are dropped from the API call but remain visible in the UI.
WINDOW_SIZE = 20  # 10 user/assistant turns

_BASE_PROMPT = """You are a helpful assistant built into SurveyAgent, an AI-powered survey platform.

Your job is to help users get the most out of the platform. You can help with:

Surveys
- Creating surveys: title, description, goal, context, questions, welcome message, personality tone
- AI question generation: generate questions from a topic or goal
- AI field enhancement: improve any survey field with AI
- Publishing surveys and sharing the interview link
- Survey visibility: private, team-shared, or org-wide

Interviews
- Text, voice, and live (realtime) interview modes
- Respondent language selection
- Monitoring interview sessions in analytics
- Per-question AI instructions to guide the interviewer

Analytics
- Per-interview analysis: score, sentiment, themes, strengths, concerns
- Survey-level aggregate analysis across all completed interviews
- Exporting data as CSV or PDF
- Custom analytics instructions to guide AI analysis

Settings & Organization
- Profile settings: name, org name
- Org management: members, roles (owner / admin / member), ownership transfer
- Teams and sub-teams for survey visibility
- Inviting team members via email

Integrations
- Webhook URL on a survey for interview completion events
- Email notifications to creators and respondents on completion
- Multi-LLM support: OpenAI, Anthropic, Gemini

Keep your answers concise and practical. Format responses using markdown:
- Use **bold** for important terms or field names
- Use bullet lists for steps or multiple options
- Use `inline code` for setting names, values, or field names
- Use code blocks for multi-line examples
- Use tables when comparing options
- Keep responses short — avoid long prose paragraphs"""

# Human-readable labels for URL paths injected as context
_PAGE_LABELS = {
    "/dashboard":   "Dashboard — managing their surveys",
    "/analytics":   "Analytics Overview — reviewing all survey stats",
    "/settings":    "Profile Settings",
    "/settings/org":    "Organization Settings — managing org members and roles",
    "/settings/teams":  "Team Management — managing teams",
    "/feedback":    "Public Feedback page",
}


def _page_label(path: str) -> str:
    if not path:
        return "unknown"
    for prefix, label in _PAGE_LABELS.items():
        if path.startswith(prefix):
            return label
    if "/surveys/" in path and "/analytics" in path:
        return "Survey Analytics page"
    if "/surveys/" in path and "/edit" in path:
        return "Survey Edit form"
    if path.startswith("/surveys/create"):
        return "Survey Create form"
    if path.startswith("/surveys/"):
        return "Survey Detail page"
    if path.startswith("/analytics/interviews/"):
        return "Interview Detail page"
    if path.startswith("/interview/"):
        return "Interview page (live respondent view)"
    return path


def build_chatbot_prompt(context=None) -> str:
    """Return the system prompt, optionally prepended with injected user context."""
    if not context:
        return _BASE_PROMPT

    lines = ["[Injected context — use this to personalise your responses]"]
    if context.name:
        lines.append(f"User name: {context.name}")
    if context.org_name:
        lines.append(f"Organization: {context.org_name}")
    if context.current_page:
        lines.append(f"Current page: {_page_label(context.current_page)}")

    ctx_block = "\n".join(lines)
    return f"{ctx_block}\n\n{_BASE_PROMPT}"
