"""
Interviewer engine — builds prompt, calls LLM with streaming, parses coverage tags.
"""

import json
import re
from typing import AsyncGenerator

from server.core.config import settings
from server.core.llm import get_openai_client
from server.core.logging_config import get_logger
from server.interviewer.prompts import build_interviewer_prompt

logger = get_logger(__name__)

# Regex for the coverage metadata tag: [COVERED: 1, 3, 5] or [COVERED: ]
COVERAGE_RE = re.compile(r"\[COVERED:\s*([\d,\s]*)\]")


def parse_coverage_tag(text: str) -> tuple[str, list[int]]:
    """
    Extract and strip the [COVERED: ...] tag from the LLM response.
    Returns (clean_text, covered_indices) where covered_indices are 1-based ints.
    """
    match = COVERAGE_RE.search(text)
    if not match:
        return text.strip(), []

    raw = match.group(1).strip()
    covered = []
    if raw:
        for part in raw.split(","):
            part = part.strip()
            if part.isdigit():
                covered.append(int(part))

    clean = text[:match.start()] + text[match.end():]
    return clean.strip(), covered


async def run_interview_turn(
    survey: dict,
    conversation: list[dict],
    remaining_minutes: int,
    personality_tone: str = "friendly",
) -> AsyncGenerator[str, None]:
    """
    Stream one interviewer turn via SSE.

    Yields SSE-formatted strings: data: {"token": "..."}\n\n
    Final event: data: {"done": true, "clean_text": "...", "questions_covered": [...]}\n\n

    Args:
        survey: full survey document from MongoDB
        conversation: full message history [{"role": ..., "content": ...}, ...]
        remaining_minutes: estimated_duration minus elapsed time
        personality_tone: one of professional/friendly/casual/fun
    """
    # Build system prompt
    system_prompt = build_interviewer_prompt(
        survey_title=survey.get("title", ""),
        survey_goal=survey.get("goal", ""),
        survey_context=survey.get("context", ""),
        questions=survey.get("questions", []),
        remaining_minutes=remaining_minutes,
        personality_tone=personality_tone,
    )

    # If time is up, add urgency instruction
    if remaining_minutes <= 0:
        system_prompt += "\n\nURGENT: Time is up. Wrap up immediately — thank the respondent and end the interview. Do not ask any new questions."

    # Build messages array for OpenAI Responses API
    messages = [{"role": "developer", "content": system_prompt}]
    for msg in conversation:
        messages.append({"role": msg["role"], "content": msg["content"]})

    client = await get_openai_client()

    try:
        stream = await client.responses.create(
            model=settings.OPENAI_MODEL,
            input=messages,
            stream=True,
        )

        full_response = ""

        async for event in stream:
            if hasattr(event, "type") and event.type == "response.output_text.delta":
                full_response += event.delta
                yield f"data: {json.dumps({'token': event.delta})}\n\n"

        # Parse coverage tag from the complete response
        clean_text, questions_covered = parse_coverage_tag(full_response)

        # Send final event with parsed data
        yield f"data: {json.dumps({'done': True, 'clean_text': clean_text, 'questions_covered': questions_covered})}\n\n"

    except Exception as e:
        logger.error(f"Interview engine error: {e}", exc_info=True)
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield f"data: {json.dumps({'done': True, 'clean_text': '', 'questions_covered': []})}\n\n"
