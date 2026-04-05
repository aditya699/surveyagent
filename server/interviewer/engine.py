"""
Interviewer engine — builds prompt, calls LLM with streaming, parses coverage tags.
"""

import json
import re
from typing import AsyncGenerator

from server.core.llm import get_provider
from server.core.logging_config import get_logger
from server.interviewer.prompts import build_interviewer_prompt, build_question_test_prompt

logger = get_logger(__name__)

# Regex for the coverage metadata tag: [COVERED: 1, 3, 5] or [COVERED: ]
COVERAGE_RE = re.compile(r"\[COVERED:\s*([\d,\s]*)\]")

# Regex for the abuse detection tag: [ABUSE: true]
ABUSE_RE = re.compile(r"\[ABUSE:\s*true\s*\]", re.IGNORECASE)


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


def parse_abuse_tag(text: str) -> tuple[str, bool]:
    """
    Extract and strip the [ABUSE: true] tag from the LLM response.
    Returns (clean_text, is_abusive).
    """
    match = ABUSE_RE.search(text)
    if not match:
        return text, False
    clean = text[:match.start()] + text[match.end():]
    return clean.strip(), True


async def run_question_test_turn(
    question_text: str,
    conversation: list[dict],
    ai_instructions: str | None = None,
    personality_tone: str = "friendly",
    survey_title: str | None = None,
    survey_goal: str | None = None,
    survey_context: str | None = None,
    llm_provider: str | None = None,
    llm_model: str | None = None,
    language: str = "English",
) -> AsyncGenerator[str, None]:
    """
    Stream one question-test turn via SSE. Stateless — no DB reads/writes.

    Yields SSE-formatted strings: data: {"token": "..."}\n\n
    Final event: data: {"done": true, "clean_text": "..."}\n\n
    """
    system_prompt = build_question_test_prompt(
        question_text=question_text,
        ai_instructions=ai_instructions,
        personality_tone=personality_tone,
        survey_title=survey_title,
        survey_goal=survey_goal,
        survey_context=survey_context,
        language=language,
    )

    messages = [{"role": msg["role"], "content": msg["content"]} for msg in conversation]

    provider_name = llm_provider or "openai"
    provider = await get_provider(provider_name)
    model = llm_model or provider.default_model

    try:
        full_response = ""

        async for delta in provider.stream_text(
            model=model,
            system_prompt=system_prompt,
            messages=messages,
        ):
            full_response += delta
            yield f"data: {json.dumps({'token': delta})}\n\n"

        yield f"data: {json.dumps({'done': True, 'clean_text': full_response.strip()})}\n\n"

    except Exception as e:
        logger.error(f"Question test engine error: {e}", exc_info=True)
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield f"data: {json.dumps({'done': True, 'clean_text': ''})}\n\n"


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
        language=survey.get("language", "English"),
    )

    # If time is up, add urgency instruction
    if remaining_minutes <= 0:
        system_prompt += "\n\nURGENT: Time is up. Wrap up immediately — thank the respondent and end the interview. Do not ask any new questions."

    # Build messages for the provider (system prompt is passed separately)
    messages = [{"role": msg["role"], "content": msg["content"]} for msg in conversation]

    provider_name = survey.get("llm_provider") or "openai"
    provider = await get_provider(provider_name)
    model = survey.get("llm_model") or provider.default_model

    try:
        full_response = ""

        async for delta in provider.stream_text(
            model=model,
            system_prompt=system_prompt,
            messages=messages,
        ):
            full_response += delta
            yield f"data: {json.dumps({'token': delta})}\n\n"

        # Parse abuse tag first, then coverage tag from the cleaned text
        text_after_abuse, abuse_detected = parse_abuse_tag(full_response)
        clean_text, questions_covered = parse_coverage_tag(text_after_abuse)

        # Send final event with parsed data
        yield f"data: {json.dumps({'done': True, 'clean_text': clean_text, 'questions_covered': questions_covered, 'abuse_detected': abuse_detected})}\n\n"

    except Exception as e:
        logger.error(f"Interview engine error: {e}", exc_info=True)
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield f"data: {json.dumps({'done': True, 'clean_text': '', 'questions_covered': [], 'abuse_detected': False})}\n\n"
