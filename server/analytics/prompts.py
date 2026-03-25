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


# ---------------------------------------------------------------------------
# Aggregate survey-level analysis
# ---------------------------------------------------------------------------

SURVEY_ANALYSIS_SYSTEM_PROMPT = """You are a qualitative research analyst specializing in synthesizing insights across multiple survey interviews.
Your job is to analyze ALL interview data for a survey and produce an aggregate analysis.

RULES:
1. Output ONLY a single valid JSON object. No markdown code fences, no commentary, no preamble.
2. Synthesize patterns across ALL respondents — don't just average individual scores.
3. Identify consensus (what most respondents agree on) and divergence (where they disagree).
4. Be specific — cite concrete patterns from the data, not generic feedback.
5. For question_analysis, evaluate EVERY question in the survey across all interviews.

OUTPUT FORMAT (JSON):
{
  "overall_score": <integer 1-10>,
  "dominant_sentiment": "<positive|neutral|negative|mixed>",
  "summary": "<2-3 sentence executive summary synthesizing all responses>",
  "total_interviews_analyzed": <integer>,
  "key_themes": ["<theme1>", "<theme2>", ...],
  "consensus_points": [{"title": "<short title>", "detail": "<1-2 sentence explanation of what most respondents agreed on>"}],
  "divergence_points": [{"title": "<short title>", "detail": "<1-2 sentence explanation of where respondents disagreed>"}],
  "strengths": [{"title": "<short title>", "detail": "<1-2 sentence explanation>"}],
  "concerns": [{"title": "<short title>", "detail": "<1-2 sentence explanation>"}],
  "improvements": [{"title": "<short title>", "detail": "<actionable recommendation>"}],
  "question_analysis": [
    {
      "question_index": <1-based>,
      "question_text": "<the question>",
      "avg_quality": "<well_answered|partially_answered|poorly_answered>",
      "coverage_rate": <float 0-100>,
      "key_findings": "<aggregate observation across all respondents>",
      "common_responses": "<patterns in how people answered this question>"
    }
  ],
  "respondent_patterns": {
    "engagement_distribution": "<brief description of overall respondent engagement levels>",
    "notable_outliers": "<any standout responses worth highlighting>"
  }
}

SCORING GUIDE (aggregate):
- 9-10: Exceptional quality across most interviews, rich collective insights
- 7-8: Good overall quality, strong patterns emerging, useful data
- 5-6: Adequate but uneven — some good interviews, some shallow
- 3-4: Below average across the board, limited actionable insights
- 1-2: Very poor collective quality, minimal useful data"""


def build_survey_analysis_prompt(
    survey: dict,
    analyzed_interviews: list[dict],
    raw_interviews: list[dict],
) -> str:
    """
    Build the user prompt for aggregate survey analysis.

    analyzed_interviews: interviews that have a cached `analysis` dict
    raw_interviews: interviews without cached analysis (include conversation)
    """
    total = len(analyzed_interviews) + len(raw_interviews)
    parts = [f"Synthesize findings across {total} completed interview(s) for this survey.\n"]

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

    # Tier 1: interviews with cached analysis (compact)
    if analyzed_interviews:
        parts.append(f"\n--- PRE-ANALYZED INTERVIEWS ({len(analyzed_interviews)}) ---")
        for idx, iv in enumerate(analyzed_interviews, 1):
            a = iv["analysis"]
            resp = iv.get("respondent") or {}
            resp_label = resp.get("name") or resp.get("email") or f"Respondent {idx}"
            parts.append(f"\n[Interview {idx} — {resp_label}]")
            parts.append(f"  Score: {a.get('overall_score', '?')}/10 | Sentiment: {a.get('sentiment', '?')}")
            parts.append(f"  Summary: {a.get('summary', 'N/A')}")
            if a.get("key_themes"):
                parts.append(f"  Themes: {', '.join(a['key_themes'])}")
            if a.get("question_analysis"):
                covered = [
                    f"Q{qa['question_index']}({qa.get('status', '?')})"
                    for qa in a["question_analysis"]
                ]
                parts.append(f"  Questions: {', '.join(covered)}")

    # Tier 2: raw transcripts for un-analyzed interviews
    if raw_interviews:
        parts.append(f"\n--- RAW TRANSCRIPTS ({len(raw_interviews)}) ---")
        offset = len(analyzed_interviews)
        for idx, iv in enumerate(raw_interviews, 1):
            num = offset + idx
            resp = iv.get("respondent") or {}
            resp_label = resp.get("name") or resp.get("email") or f"Respondent {num}"
            parts.append(f"\n[Interview {num} — {resp_label}]")
            if iv.get("questions_covered"):
                parts.append(f"  Questions covered: {iv['questions_covered']}")
            parts.append("  Transcript:")
            for msg in iv.get("conversation", []):
                role = "INTERVIEWER" if msg.get("role") == "assistant" else "RESPONDENT"
                parts.append(f"    [{role}]: {msg.get('content', '')}")

    return "\n".join(parts)
