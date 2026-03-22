"""
Eval runner for interviewer security tests.

Requires:
  - A running server: uvicorn server.main:app --reload
  - Valid .env with OPENAI_API_KEY and MONGO_URI

Usage:
  python evals/run_evals.py
  python evals/run_evals.py --base-url http://localhost:8000
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

from evals.cases import EVAL_CASES

DEFAULT_BASE = "http://localhost:8001"
API = "/api/v1"

SURVEY_PAYLOAD = {
    "title": "Eval Test Survey",
    "description": "Automated security eval",
    "goal": "Test interviewer safety",
    "context": "This is a security evaluation run.",
    "questions": [
        "What is your favorite color?",
        "How do you spend your weekends?",
        "What motivates you at work?",
        "Describe a recent challenge you faced.",
        "What would you change about your daily routine?",
    ],
    "estimated_duration": 10,
    "personality_tone": "friendly",
}

TEST_ADMIN = {
    "name": "Eval Runner",
    "email": f"eval_{int(datetime.now(timezone.utc).timestamp())}@test.local",
    "password": "EvalPass123!",
}


async def register_and_login(client: httpx.AsyncClient) -> str:
    """Register a throwaway admin and return the access token."""
    resp = await client.post(
        f"{API}/auth/register",
        data={"name": TEST_ADMIN["name"], "email": TEST_ADMIN["email"], "password": TEST_ADMIN["password"], "org_name": "Eval Org"},
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


async def create_test_survey(client: httpx.AsyncClient, token: str) -> str:
    """Create and publish a survey, return the survey token."""
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(f"{API}/surveys/", json=SURVEY_PAYLOAD, headers=headers)
    resp.raise_for_status()
    survey_id = resp.json()["survey"]["id"]

    resp = await client.post(f"{API}/surveys/{survey_id}/publish", headers=headers)
    resp.raise_for_status()
    return resp.json()["survey"]["token"]


async def start_session(client: httpx.AsyncClient, survey_token: str) -> str:
    """Start an interview session and return session_id."""
    resp = await client.post(f"{API}/interview/start/{survey_token}", json={})
    resp.raise_for_status()
    return resp.json()["session_id"]


async def send_message(client: httpx.AsyncClient, session_id: str, message: str) -> str:
    """Send a message and collect the full streamed response (raw, before tag stripping)."""
    full = ""
    async with client.stream(
        "POST",
        f"{API}/interview/{session_id}/message",
        json={"message": message},
        timeout=60.0,
    ) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
            if not line.startswith("data: "):
                continue
            payload_str = line[6:].strip()
            try:
                payload = json.loads(payload_str)
            except (json.JSONDecodeError, ValueError):
                continue
            if "token" in payload:
                full += payload["token"]
            elif payload.get("done"):
                break
    return full


def check_case(case: dict, raw_response: str) -> tuple[bool, str]:
    """Return (passed, reason)."""
    if "must_contain" in case:
        if case["must_contain"] not in raw_response:
            return False, f"Expected '{case['must_contain']}' in response but not found"
    if "must_not_contain" in case:
        if case["must_not_contain"] in raw_response:
            return False, f"Found forbidden '{case['must_not_contain']}' in response"
    return True, "OK"


async def run_case(client: httpx.AsyncClient, survey_token: str, case: dict) -> dict:
    """Run a single eval case and return the result dict."""
    session_id = await start_session(client, survey_token)

    # For multi-turn cases, send the prior message first
    if "prev_message" in case:
        await send_message(client, session_id, case["prev_message"])

    raw_response = await send_message(client, session_id, case["input"])
    passed, reason = check_case(case, raw_response)

    return {
        "id": case["id"],
        "input": case["input"],
        "raw_response": raw_response[:500],
        "passed": passed,
        "reason": reason,
    }


async def main(base_url: str):
    async with httpx.AsyncClient(base_url=base_url, timeout=120.0) as client:
        print("Registering eval admin...")
        token = await register_and_login(client)

        print("Creating + publishing eval survey...")
        survey_token = await create_test_survey(client, token)

        results = []
        passed_count = 0

        for case in EVAL_CASES:
            print(f"  Running: {case['id']}...", end=" ", flush=True)
            try:
                result = await run_case(client, survey_token, case)
            except Exception as e:
                result = {"id": case["id"], "passed": False, "reason": str(e), "raw_response": ""}
            results.append(result)
            status = "PASS" if result["passed"] else "FAIL"
            if result["passed"]:
                passed_count += 1
            print(f"{status} — {result['reason']}")

        # Save results
        out_dir = Path(__file__).parent / "results"
        out_dir.mkdir(exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        out_file = out_dir / f"eval_{ts}.json"
        out_file.write_text(json.dumps(results, indent=2))

        total = len(EVAL_CASES)
        print(f"\n{'='*40}")
        print(f"Results: {passed_count}/{total} passed")
        print(f"Saved to: {out_file}")

        if passed_count < total:
            sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run interviewer security evals")
    parser.add_argument("--base-url", default=DEFAULT_BASE, help="Server base URL")
    args = parser.parse_args()
    asyncio.run(main(args.base_url))
