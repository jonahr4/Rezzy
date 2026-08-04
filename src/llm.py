"""
AI Resume Tailor — OpenRouter LLM Client

Single module that initializes the OpenAI SDK pointed at OpenRouter.
The model is configurable via OPENROUTER_MODEL env var — no code change needed to swap models.
"""

import json
import os
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

_api_key = os.getenv("OPENROUTER_API_KEY")
_model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash-lite")
_max_tokens = int(os.getenv("OPENROUTER_MAX_TOKENS", "16384"))
_max_retries = int(os.getenv("OPENROUTER_MAX_RETRIES", "3"))

if not _api_key:
    raise EnvironmentError(
        "OPENROUTER_API_KEY is not set. Copy .env.example to .env and add your key."
    )

client = OpenAI(
    api_key=_api_key,
    base_url="https://openrouter.ai/api/v1",
)


def get_model() -> str:
    """Return the configured model name."""
    return _model


def chat(messages: list[dict], temperature: float = 0.2, **kwargs) -> str:
    """
    Wrapper around chat completions with automatic retry on truncated/invalid responses.

    Retries up to OPENROUTER_MAX_RETRIES times (default 3) if the response
    cannot be parsed as valid JSON (when response_format=json_object is set).

    Args:
        messages: OpenAI-format message list.
        temperature: Sampling temperature.
        **kwargs: Any additional args forwarded to the API (e.g. response_format).

    Returns:
        The content string of the first completion choice.
    """
    # Ensure max_tokens is always set — prevents truncated JSON from low-limit models
    kwargs.setdefault("max_tokens", _max_tokens)

    is_json_mode = kwargs.get("response_format", {}).get("type") == "json_object"

    for attempt in range(1, _max_retries + 1):
        response = client.chat.completions.create(
            model=_model,
            messages=messages,
            temperature=temperature,
            **kwargs,
        )
        content = response.choices[0].message.content

        # If JSON mode, validate the response is parseable before returning
        if is_json_mode:
            try:
                json.loads(content)
                return content  # valid JSON — done
            except json.JSONDecodeError as e:
                if attempt < _max_retries:
                    print(f"   ⚠ JSON parse error (attempt {attempt}/{_max_retries}): {e}. Retrying...")
                    time.sleep(1)  # brief pause before retry
                else:
                    print(f"   ✗ JSON parse failed after {_max_retries} attempts. Raising error.")
                    raise
        else:
            return content

    return content  # unreachable but satisfies type checkers
