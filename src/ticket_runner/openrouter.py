"""One key, and every model behind it.

What the runner drives is Claude Code, and Claude Code talks to Anthropic. That
is one family of models on one subscription — so a ticket that wants GPT to
write the copy, a transcription of an audio file, or a video made from a prompt,
has nowhere to go and no way of paying for it.

OpenRouter is one key in front of every provider there is. Configured here, it
reaches a session in two ways, and they are not the same gesture.

**The key, in the session's environment.** `OPENROUTER_API_KEY` is the name
every library and every snippet already looks for, so the work can call whatever
model it needs — a GPT, an image, a video — without anything in the runner
having to know what a video model is. Nothing else changes: the agent doing the
work is the one you have always had, it simply now has an account.

**The sessions themselves, run on it.** Off by default, and it is the switch to
think about: Claude Code then speaks to OpenRouter's Anthropic-compatible
endpoint instead of to Anthropic, and every model named anywhere — a ticket's
Model column, an agent's, `runner.model` — becomes an OpenRouter slug,
`openai/gpt-5` or `anthropic/claude-sonnet-4.5`. Two things travel with that,
and neither is a detail. The CLI is no longer signed in as you but as a bearer
token, so Claude in Chrome does not load (session.py says why). And the bill is
OpenRouter's rather than the subscription's, so there is no window to wait for
and `runner.wait_for_credits` has nothing left to hold (credits.py says why).

An empty key is the whole of the old behaviour: nothing here is added to
anything, and a session starts exactly as it used to.

**And one thing the runner does with it itself: listening.** Claude Code reads
text, images and PDFs, and not a word of audio — so a message dictated in the
console is turned into text here, before it ever reaches a session, and handed
back to the page to be read over. Without a key there is no one to transcribe
it, and `Unavailable` says so in a sentence rather than as a failed request.
"""

from __future__ import annotations

import base64
import json
import urllib.error
import urllib.request

from .config import OPENROUTER_URL, OpenRouter

# What the browser records in, as the transcription endpoint names it. Chrome
# and Firefox write WebM/Opus, Safari MP4; anything else is sent as it came and
# left to the provider to recognise.
FORMATS = {
    "audio/webm": "webm",
    "video/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
}

# A dictated sentence is seconds of audio; a minute is already a long one.
TRANSCRIPTION_TIMEOUT = 90


class Unavailable(RuntimeError):
    """Nothing to transcribe with — said as the reason, not as an error code."""


class TranscriptionError(RuntimeError):
    """OpenRouter was asked and did not answer with text."""


def environment(settings: OpenRouter) -> dict[str, str]:
    """What a session is started with, on top of the environment it inherits."""
    if not settings.key:
        return {}
    base = settings.base_url.rstrip("/") or OPENROUTER_URL
    variables = {"OPENROUTER_API_KEY": settings.key, "OPENROUTER_BASE_URL": base}
    if settings.route_sessions:
        # `ANTHROPIC_AUTH_TOKEN` and not `ANTHROPIC_API_KEY`: the first is sent
        # as a bearer token, which is what a gateway in front of the Messages
        # API expects, and it is the one Claude Code documents for exactly this.
        variables["ANTHROPIC_BASE_URL"] = base
        variables["ANTHROPIC_AUTH_TOKEN"] = settings.key
    return variables


def audio_format(content_type: str) -> str:
    """The format a recording is announced as, from the type it was sent with."""
    kind = (content_type or "").split(";", 1)[0].strip().lower()
    return FORMATS.get(kind, kind.rsplit("/", 1)[-1] or "webm")


def transcribe(settings: OpenRouter, audio: bytes, content_type: str, language: str = "") -> str:
    """The words in a recording, as text — or `Unavailable` when there is no key.

    `language` is an ISO-639-1 code, or nothing at all: Whisper guesses well,
    and better than a guess of ours that was wrong.
    """
    if not settings.key:
        raise Unavailable(
            "no OpenRouter key — dictation is transcribed by OpenRouter: "
            "set openrouter.key in the settings"
        )
    if not audio:
        raise ValueError("the recording is empty")
    body: dict = {
        "model": settings.transcription_model,
        "input_audio": {
            "data": base64.b64encode(audio).decode("ascii"),
            "format": audio_format(content_type),
        },
    }
    if language:
        body["language"] = language
    base = settings.base_url.rstrip("/") or OPENROUTER_URL
    request = urllib.request.Request(
        f"{base}/audio/transcriptions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.key}",
            "Content-Type": "application/json",
            "X-Title": "ticket-runner",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TRANSCRIPTION_TIMEOUT) as response:
            answer = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        raise TranscriptionError(f"OpenRouter refused the recording: {_said(error)}") from error
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        raise TranscriptionError(f"OpenRouter could not be reached: {error}") from error
    except ValueError as error:
        raise TranscriptionError("OpenRouter answered something that is not JSON") from error
    text = answer.get("text") if isinstance(answer, dict) else None
    if not isinstance(text, str):
        raise TranscriptionError("OpenRouter answered without a transcription")
    return text.strip()


def _said(error: urllib.error.HTTPError) -> str:
    """The sentence an HTTP error came with, rather than only its number."""
    try:
        payload = json.loads(error.read().decode("utf-8"))
        message = payload.get("error", {}).get("message") if isinstance(payload, dict) else ""
    except (ValueError, OSError, AttributeError):
        message = ""
    return f"{error.code} {message}".strip() if message else f"{error.code} {error.reason}"
