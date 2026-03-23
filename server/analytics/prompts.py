"""
Prompt templates for AI-powered interview analysis.
"""


ANALYSIS_SYSTEM_PROMPT = """You are a qualitative research analyst specializing in survey interview analysis.
Your job is to analyze an interview transcript and produce structured insights.

RULES:
1. Output ONLY a single valid JSON object. No markdown code fences, no commentary, no preamble.
2. Assess the quality and depth of respondent answers relative to the survey's goals and questions.
3. Be specific — cite concrete observations from the conversation, not generic feedback.
4. Be balanced — acknowledge both strengths and weaknesses honestly.
5. For question_analysis, evaluate EVERY question in the survey, even if it wasn't covered.

OUTPUT FORMAT (JSON):
{
  "overall_score": <integer 1-10>,
  "sentiment": "<positive|neutral|negative|mixed>",
  "summary": "<2-3 sentence executive summary>",
  "key_themes": ["<theme1>", "<theme2>", ...],
  "strengths": [{"title": "<short title>", "detail": "<1-2 sentence explanation>"}],
  "concerns": [{"title": "<short title>", "detail": "<1-2 sentence explanation>"}],
  "improvements": [{"title": "<short title>", "detail": "<1-2 sentence explanation>"}],
  "question_analysis": [
    {
      "question_index": <1-based>,
      "question_text": "<the question>",
      "status": "<well_answered|partially_answered|not_covered|skipped>",
      "notes": "<brief observation about the answer quality or why it wasn't covered>"
    }
  ]
}

SCORING GUIDE:
- 9-10: Exceptional depth, rich insights, all questions thoroughly addressed
- 7-8: Good quality, most questions well-covered, useful insights
- 5-6: Adequate but shallow, some questions missed or poorly answered
- 3-4: Below average, many gaps, vague or off-topic responses
- 1-2: Very poor, minimal engagement, mostly unhelpful responses"""


def build_analysis_prompt(
    survey: dict,
    conversation: list[dict],
    respondent: dict | None = None,
    questions_covered: list[int] | None = None,
) -> str:
    """Build the user prompt for interview analysis."""
    parts = ["Analyze the following interview transcript.\n"]

    # Survey context
    parts.append(f"SURVEY TITLE: {survey.get('title', 'Untitled')}")
    if survey.get("goal"):
        parts.append(f"SURVEY GOAL: {survey['goal']}")
    if survey.get("description"):
        parts.append(f"SURVEY DESCRIPTION: {survey['description']}")
    if survey.get("context"):
        parts.append(f"SURVEY CONTEXT: {survey['context']}")

    # Questions
    questions = survey.get("questions", [])
    if questions:
        parts.append("\nSURVEY QUESTIONS:")
        for i, q in enumerate(questions):
            text = q.get("text", q) if isinstance(q, dict) else str(q)
            parts.append(f"  {i + 1}. {text}")

    # Questions covered
    if questions_covered:
        parts.append(f"\nQUESTIONS COVERED BY INTERVIEWER: {questions_covered}")

    # Respondent info
    if respondent:
        details = []
        for key in ["name", "age", "gender", "occupation"]:
            if respondent.get(key):
                details.append(f"{key}: {respondent[key]}")
        if details:
            parts.append(f"\nRESPONDENT: {', '.join(details)}")

    # Conversation transcript
    parts.append("\nTRANSCRIPT:")
    for msg in conversation:
        role = "INTERVIEWER" if msg.get("role") == "assistant" else "RESPONDENT"
        parts.append(f"  [{role}]: {msg.get('content', '')}")

    return "\n".join(parts)
