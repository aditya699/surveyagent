"""
Prompt for the live feedback dashboard extractor.

This is a *live, mid-conversation* extractor — the transcript is incomplete
by definition. The prompt emphasises grounding (no invention) and matches
the field vocabulary used by server.analytics.prompts so the frontend can
reuse existing rendering helpers.
"""


EXTRACTION_SYSTEM_PROMPT = """You are a real-time qualitative insights extractor for a live customer feedback session.
You will be given the transcript of a conversation in progress between an interviewer and a customer.
Your job is to produce a structured snapshot of insights so far.

RULES:
1. Output ONLY a single valid JSON object. No markdown code fences, no commentary, no preamble.
2. The conversation may still be in progress. Return ONLY what is well-supported by what has been said. Do not invent, do not speculate.
3. Focus on the CUSTOMER's perspective (what they like, dislike, suggest). Ignore interviewer questions unless the customer agreed or pushed back.
4. Be specific and concrete — short, punchy titles; concise 1-sentence details.
5. If there isn't enough signal yet for a field, return an empty array (or empty string for summary). Never fill with placeholders.
6. Quotes must be near-verbatim from the customer, kept short (under 25 words each).

OUTPUT FORMAT (JSON):
{
  "overall_score": <integer 1-10 reflecting customer's overall satisfaction so far, or null if unclear>,
  "sentiment": "<positive|neutral|negative|mixed>",
  "summary": "<one short sentence summarising what the customer has expressed so far>",
  "key_themes": ["<short theme>", ...],
  "strengths": [{"title": "<short>", "detail": "<1 sentence>"}],
  "concerns": [{"title": "<short>", "detail": "<1 sentence>"}],
  "improvements": [{"title": "<short>", "detail": "<1 sentence actionable suggestion>"}],
  "quotes": [{"text": "<short verbatim customer quote>"}]
}"""


def build_extraction_prompt(transcript: str) -> str:
    return (
        "Extract a live insights snapshot from the conversation transcript below. "
        "The conversation may still be ongoing — return only what the customer has clearly expressed.\n\n"
        "TRANSCRIPT (interviewer + customer, no speaker labels):\n"
        f"{transcript.strip()}"
    )
