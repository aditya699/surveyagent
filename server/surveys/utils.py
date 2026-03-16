# surveys/utils.py
import uuid


def generate_survey_token() -> str:
    """
    Deep Technical Context:
    - Generates a unique token for a published survey using uuid4
    - This token is used as the public-facing identifier for survey respondents
    - Stored in the survey document's 'token' field on publish

    Returns:
        str: A unique UUID4 string
    """
    return str(uuid.uuid4())
