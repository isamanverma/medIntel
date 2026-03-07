"""
Gemini AI Service — Medical tag extraction from patient condition descriptions.

Uses Google's Gemini API to extract concise, clinically-relevant tags
from free-text patient condition descriptions. The prompt is engineered
to be strict and deterministic, returning only a JSON array of tags.

Model fallback chain
────────────────────
Free-tier API keys have per-model quotas that can be exhausted independently.
The service tries models in order of preference:

  1. gemini-2.5-flash       — best balance of reasoning + speed
  2. gemini-2.5-flash-lite  — fastest and cheapest for high-volume tagging
  3. gemini-2.0-flash       — older but still reliable fallback

On a 429 RESOURCE_EXHAUSTED response the current model is skipped and the
next candidate is tried immediately.  If all models are exhausted a
RuntimeError is raised with clear guidance.

Per-model generation config notes
──────────────────────────────────
gemini-2.5-flash is a thinking model that produces a short prose preamble
before the JSON array even when instructed not to (e.g. "Here is the...").
Setting response_mime_type="application/json" does NOT suppress this and
combined with max_output_tokens=128 causes a MAX_TOKENS truncation before
the array is emitted.  Fix: give it 512 tokens and omit response_mime_type
so the full markdown-fenced array is returned — _parse_tags() already strips
fences.

gemini-2.5-flash-lite and gemini-2.0-flash are well-behaved with the JSON
mime type and 256 tokens is more than sufficient.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Optional

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────
#  Model fallback chain
#  Each entry is tried in order; on 429 the next one is used.
# ──────────────────────────────────────────────────────────────────

_MODEL_FALLBACK_CHAIN: list[str] = [
    "gemini-2.5-flash",       # best balance of reasoning + speed
    "gemini-2.5-flash-lite",  # fastest and cheapest for high-volume tagging
    "gemini-2.0-flash",       # older but still reliable fallback
]


# ──────────────────────────────────────────────────────────────────
#  Prompt Engineering
#
#  Strict, deterministic prompt that produces ONLY a JSON array of
#  1–3 word medical tags. No explanations, no markdown, no prose.
# ──────────────────────────────────────────────────────────────────

_SYSTEM_INSTRUCTION = """\
You are a clinical NLP system that extracts medical tags from patient-provided symptom descriptions.

Patients often describe symptoms in informal, non-clinical language.
Translate informal wording into standard medical terms where possible.

Normalisation examples:
  "loose motions"        → diarrhea
  "throwing up"          → vomiting
  "stomach pain"         → abdominal pain
  "light hurting my eyes"→ photophobia
  "head is spinning"     → vertigo

OUTPUT RULES — follow them exactly, no exceptions:
1. Return ONLY a valid JSON array of strings. Example: ["migraine", "blurred vision", "photophobia"]
2. Each tag must be 1–3 words, lowercase.
3. Include only medical conditions, symptoms, or clinically relevant descriptors.
4. Exclude: patient names, dates, durations, frequencies, pronouns, filler words.
5. Return between 3 and 7 tags. Never fewer than 3, never more than 7.
6. Do NOT include markdown fences, explanations, or any text outside the JSON array.
7. If the input contains no medical information, return: ["unspecified condition"]
"""

_USER_TEMPLATE = """\
Extract medical tags from the following patient description:

\"\"\"{description}\"\"\"

Return the JSON array now:\
"""


# ──────────────────────────────────────────────────────────────────
#  Per-model generation configs
#
#  gemini-2.5-flash  — thinking model; needs more tokens and does NOT
#                      respect response_mime_type cleanly (emits a prose
#                      preamble that causes MAX_TOKENS truncation at 128).
#                      Give it 512 tokens and let _parse_tags() strip fences.
#
#  *-lite / 2.0-flash — well-behaved; JSON mime type locks the output
#                       format and 256 tokens is ample.
# ──────────────────────────────────────────────────────────────────

_CONFIG_THINKING = types.GenerateContentConfig(
    system_instruction=_SYSTEM_INSTRUCTION,
    temperature=0.1,
    top_p=0.9,
    top_k=20,
    # No response_mime_type — avoids prose preamble truncation on thinking models.
    # The model will return a markdown-fenced JSON array which _parse_tags() handles.
    max_output_tokens=512,
)

_CONFIG_STANDARD = types.GenerateContentConfig(
    system_instruction=_SYSTEM_INSTRUCTION,
    temperature=0.1,
    top_p=0.9,
    top_k=20,
    max_output_tokens=256,
    # Force structured JSON output at the API level for non-thinking models.
    response_mime_type="application/json",
)

# Map each model to its appropriate config.
# Any model not listed here falls back to _CONFIG_STANDARD.
_MODEL_CONFIGS: dict[str, types.GenerateContentConfig] = {
    "gemini-2.5-flash": _CONFIG_THINKING,
}


def _config_for(model_name: str) -> types.GenerateContentConfig:
    """Return the correct GenerateContentConfig for the given model name."""
    return _MODEL_CONFIGS.get(model_name, _CONFIG_STANDARD)


# ──────────────────────────────────────────────────────────────────
#  Quota detection helpers
# ──────────────────────────────────────────────────────────────────

def _is_quota_error(exc: Exception) -> bool:
    """Return True if *exc* represents a 429 / RESOURCE_EXHAUSTED quota error."""
    msg = str(exc)
    return (
        "429" in msg
        or "RESOURCE_EXHAUSTED" in msg
        or "quota" in msg.lower()
        or "rate limit" in msg.lower()
        or "rate_limit" in msg.lower()
    )


# ──────────────────────────────────────────────────────────────────
#  Service
# ──────────────────────────────────────────────────────────────────

class GeminiService:
    """Wrapper around the Gemini generative model for medical tag extraction.

    Implements a model fallback chain so that free-tier quota exhaustion on
    one model automatically retries with the next lighter model variant.
    """

    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set in the environment. "
                "Add it to your .env file: GEMINI_API_KEY=your_key_here"
            )
        self._client = genai.Client(api_key=api_key)

    async def extract_tags(self, description: str) -> list[str]:
        """Extract medical tags from a free-text patient condition description.

        Tries each model in the fallback chain in order.  On a 429 quota
        error the next model is attempted.  All other errors are surfaced
        immediately without retrying.

        Args:
            description: Free-text entered by the patient describing their
                         current medical condition or symptoms.

        Returns:
            A list of 3–7 lowercase, 1–3 word medical tags.

        Raises:
            ValueError: If the description is empty or blank.
            RuntimeError: If all models are quota-exhausted, or a non-quota
                          API error occurs.
        """
        description = description.strip()
        if not description:
            raise ValueError("Condition description must not be empty.")

        prompt = _USER_TEMPLATE.format(description=description)
        quota_exhausted: list[str] = []

        for model_name in _MODEL_FALLBACK_CHAIN:
            config = _config_for(model_name)

            try:
                logger.debug("GeminiService: trying model %r", model_name)
                response = await self._client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                )
            except Exception as exc:
                if _is_quota_error(exc):
                    logger.warning(
                        "GeminiService: quota exhausted for model %r, "
                        "falling back to next model. Error: %s",
                        model_name,
                        str(exc)[:200],
                    )
                    quota_exhausted.append(model_name)
                    continue
                # Non-quota error — surface it immediately, no retry.
                logger.error(
                    "GeminiService: non-quota error on model %r: %s",
                    model_name,
                    exc,
                )
                raise RuntimeError(
                    f"Gemini API call failed on model '{model_name}': {exc}"
                ) from exc

            raw = response.text.strip() if response.text else ""

            # Detect MAX_TOKENS truncation — the model ran out of tokens before
            # finishing the JSON array.  Treat this the same as an empty response
            # and try the next model in the chain rather than returning garbage.
            finish_reason = None
            if response.candidates:
                finish_reason = response.candidates[0].finish_reason
                finish_str = str(finish_reason)
                if "MAX_TOKENS" in finish_str and not _looks_like_complete_json(raw):
                    logger.warning(
                        "GeminiService: model %r hit MAX_TOKENS before completing "
                        "the JSON array (raw=%r). Falling back to next model.",
                        model_name,
                        raw[:120],
                    )
                    # Do NOT append to quota_exhausted — this is a config issue,
                    # not a quota issue — but still try the next model.
                    continue

            tags = _parse_tags(raw)

            logger.info(
                "GeminiService.extract_tags | model=%r | finish=%r | "
                "input=%r | tags=%r",
                model_name,
                str(finish_reason),
                description[:80],
                tags,
            )
            return tags

        # All models either quota-exhausted or truncated.
        exhausted_list = ", ".join(quota_exhausted) if quota_exhausted else "all models"
        logger.error(
            "GeminiService: could not get a valid response from any model "
            "(quota_exhausted=%s)",
            exhausted_list,
        )
        raise RuntimeError(
            f"All Gemini models are currently unavailable "
            f"({exhausted_list}). "
            "This typically means the free-tier daily/minute limits have been "
            "reached for this API key. Options: "
            "(1) wait a few minutes and retry, "
            "(2) enable billing on your Google AI Studio project, or "
            "(3) use a different API key."
        )


# ──────────────────────────────────────────────────────────────────
#  Tag parsing & sanitisation
# ──────────────────────────────────────────────────────────────────

def _looks_like_complete_json(raw: str) -> bool:
    """Return True if *raw* appears to contain a complete, parseable JSON array."""
    stripped = raw.strip()
    # Must start with '[' and end with ']' after stripping fences.
    cleaned = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    if not (cleaned.startswith("[") and cleaned.endswith("]")):
        return False
    try:
        json.loads(cleaned)
        return True
    except json.JSONDecodeError:
        return False


def _parse_tags(raw: str) -> list[str]:
    """Parse and sanitise the raw LLM output into a clean list of tag strings.

    Handles edge-cases where the model wraps the output in markdown fences
    or adds trailing prose despite the strict prompt.
    """
    if not raw:
        logger.warning(
            "GeminiService._parse_tags: empty response from model, returning fallback."
        )
        return ["unspecified condition"]

    # Strip markdown code fences if present (defensive)
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    # Extract the first JSON array found in the text
    array_match = re.search(r"\[.*?\]", cleaned, flags=re.DOTALL)
    if not array_match:
        logger.warning(
            "GeminiService._parse_tags: no JSON array in response %r, returning fallback.",
            raw[:200],
        )
        return ["unspecified condition"]

    try:
        tags: list = json.loads(array_match.group())
    except json.JSONDecodeError as exc:
        logger.warning(
            "GeminiService._parse_tags: JSON parse error (%s) for response %r, "
            "returning fallback.",
            exc,
            raw[:200],
        )
        return ["unspecified condition"]

    # Sanitise: keep only non-empty strings, lowercase, trimmed, max 3 words each
    sanitised: list[str] = []
    for item in tags:
        if not isinstance(item, str):
            continue
        tag = item.strip().lower()
        if not tag:
            continue
        # Enforce 1–3 word limit by truncating excess words
        words = tag.split()
        if len(words) > 3:
            tag = " ".join(words[:3])
        sanitised.append(tag)

    if not sanitised:
        return ["unspecified condition"]

    # Enforce 3–7 tag count (cap at 7; floor is handled by the prompt)
    return sanitised[:7]


# ──────────────────────────────────────────────────────────────────
#  Module-level singleton
#  Lazily initialised on first call to get_gemini_service().
#  Raises RuntimeError immediately if GEMINI_API_KEY is absent.
# ──────────────────────────────────────────────────────────────────

_instance: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Return (or create) the module-level GeminiService singleton.

    Raises:
        RuntimeError: if GEMINI_API_KEY is not set in the environment.
    """
    global _instance
    if _instance is None:
        _instance = GeminiService()
    return _instance
