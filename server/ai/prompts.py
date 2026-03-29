"""
Prompt templates for AI-powered survey question generation and field enhancement.
"""


# ---------------------------------------------------------------------------
# Question generation prompts
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a survey design expert. Your job is to generate high-quality survey questions.

RULES:
1. Generate exactly the number of questions requested.
2. Questions should be clear, unbiased, and open-ended where appropriate.
3. Tailor questions to the survey's title, goal, description, and context provided.
4. Vary question types: opinion, behavioral, demographic, satisfaction, etc. as appropriate.
5. Avoid leading or loaded questions.
6. Keep questions concise (one sentence each).

OUTPUT FORMAT:
Return ONLY the questions, one per line. No numbering, no bullets, no extra text.
Each line must contain exactly one complete question ending with a question mark.
Do NOT include any preamble, explanation, or markdown formatting."""


def build_user_prompt(
    num_questions: int,
    title: str = "",
    description: str = "",
    goal: str = "",
    context: str = "",
    additional_info: str = "",
) -> str:
    """Build the user prompt for question generation."""
    parts = [f"Generate exactly {num_questions} survey questions."]
    if title:
        parts.append(f"Survey title: {title}")
    if description:
        parts.append(f"Survey description: {description}")
    if goal:
        parts.append(f"Survey goal: {goal}")
    if context:
        parts.append(f"Survey context: {context}")
    if additional_info:
        parts.append(f"Additional instructions: {additional_info}")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Field enhancement prompts
# ---------------------------------------------------------------------------

ENHANCE_SYSTEM_PROMPT = """You are a survey design expert who helps craft compelling survey content.
Your job is to enhance or generate content for a specific survey field.

RULES:
1. Output ONLY the enhanced field content. No preamble, no explanation, no quotes, no markdown.
2. If the user provides a current value, improve it while preserving the original intent.
3. If no current value is provided, generate appropriate content from scratch using available context.
4. Keep the output appropriate for the target field type (see instructions below)."""

FIELD_INSTRUCTIONS = {
    "title": "Generate a concise, clear survey title (one line, under 80 characters). It should be descriptive and engaging.",
    "description": "Write a clear, informative survey description (2-4 sentences). Explain what the survey covers and why it matters.",
    "goal": "Write a focused survey goal (1-3 sentences). State what insights or outcomes the survey aims to achieve.",
    "context": "Write relevant survey context (2-4 sentences). Include target audience, background information, and any constraints.",
    "welcome_message": "Write a warm, inviting welcome message (2-3 sentences). Greet the respondent and briefly explain what to expect.",
}

CONTEXT_HIERARCHY = {
    "title": [],
    "description": ["title"],
    "goal": ["title", "description"],
    "context": ["title", "description", "goal"],
    "welcome_message": ["title", "description", "goal", "context"],
}


def build_enhance_prompt(
    field_name: str,
    current_value: str = "",
    title: str = "",
    description: str = "",
    goal: str = "",
    context: str = "",
    additional_context: str = "",
) -> str:
    """Build the user prompt for field enhancement."""
    fields_map = {"title": title, "description": description, "goal": goal, "context": context}
    allowed = CONTEXT_HIERARCHY[field_name]

    parts = [f"Target field: {field_name}", FIELD_INSTRUCTIONS[field_name]]

    for key in allowed:
        val = fields_map.get(key, "").strip()
        if val:
            parts.append(f"Survey {key}: {val}")

    if current_value.strip():
        parts.append(f"Current value to improve: {current_value.strip()}")
    else:
        parts.append("No current value provided. Generate fresh content.")

    if additional_context.strip():
        parts.append(f"Additional instructions: {additional_context.strip()}")

    return "\n".join(parts)
