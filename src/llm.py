"""
AI Resume Tailor — OpenRouter LLM Client

Single module that initializes the OpenAI SDK pointed at OpenRouter.
The model is configurable via OPENROUTER_MODEL env var — no code change needed to swap models.
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

_api_key = os.getenv("OPENROUTER_API_KEY")
_model = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-chat")

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
    Simple wrapper around chat completions. Returns the text of the first choice.

    Args:
        messages: OpenAI-format message list.
        temperature: Sampling temperature.
        **kwargs: Any additional args forwarded to the API (e.g. response_format).

    Returns:
        The content string of the first completion choice.
    """
    response = client.chat.completions.create(
        model=_model,
        messages=messages,
        temperature=temperature,
        **kwargs,
    )
    return response.choices[0].message.content
