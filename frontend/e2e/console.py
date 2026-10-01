"""The console the browser tests open: a real `ticket-runner serve`, on a board of files.

Real rather than a page with its API stubbed, because what these tests guard is
what the page does once the server has answered — how tall it is, whether it
scrolls — and a stub would be a second copy of every route to keep true. The
board is Markdown in a temporary directory (`files.py`), so nothing reaches
Notion, and `XDG_STATE_HOME` points there too, so nothing reads the state of the
console you run for yourself.

    python3 e2e/console.py 8790

One ticket is written long on purpose: a brief several screens tall, which is
the page that stopped scrolling. Two projects, for the list that opens one in a
drawer. And a check that found a newer version than this checkout, for the
version at the top right to offer it — a commit that exists nowhere, so that a
click on "Update now" could only ever fail.

And a `claude` of its own, first in the PATH, for the conversation with the
workspace: it reads a file, runs a command that fails, and answers — or, told
to take its time, starts a command that would run for ten minutes, for Stop to
end. It files its session where Claude Code would, under a HOME of its own, so
a stopped conversation is one that can be resumed.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from ticket_runner import files  # noqa: E402

# The token the tests open the console with: a board of fixtures has nothing to guard.
TOKEN = "e2e"
LONG = "000000000000000000000000000abcde"
NEWER = "f" * 40
PROJECTS = {"0000000000000000000000000000cafe": "Website", "0000000000000000000000000000beef": "Newsletter"}


def board(root: Path) -> None:
    tickets = root / "tickets"
    tickets.mkdir(parents=True)
    brief = "\n\n".join(
        f"## Part {part}\n\n" + " ".join(["A line of the brief, long enough to wrap."] * 12)
        for part in range(1, 41)
    )
    long = {"id": LONG, "title": "A long ticket", "Status": "Ready"}
    (tickets / f"a-long-ticket-{LONG[-8:]}.md").write_text(files.render(long, brief), encoding="utf-8")
    for number in range(1, 13):
        page = {"id": f"{number:032d}", "title": f"Ticket {number}", "Status": "Backlog"}
        (tickets / f"ticket-{number}-{page['id'][-8:]}.md").write_text(
            files.render(page, "A short brief."), encoding="utf-8"
        )
    projects = root / "projects"
    projects.mkdir()
    for id, name in PROJECTS.items():
        page = {"id": id, "title": name, "Repository": f"example/{name.lower()}"}
        (projects / f"{name.lower()}-{id[-8:]}.md").write_text(
            files.render(page, f"The brief of {name}."), encoding="utf-8"
        )


# The session a message to the workspace starts: what it does, said the way
# Claude Code's stream-json says it.
CLAUDE = """#!{python}
import json, os, pathlib, sys, time

args = sys.argv[1:]
resumed = "--resume" in args
session = args[args.index("--resume" if resumed else "--session-id") + 1]
filed = pathlib.Path.home() / ".claude" / "projects" / "-e2e" / f"{{session}}.jsonl"
filed.parent.mkdir(parents=True, exist_ok=True)
filed.touch()
prompt = sys.stdin.read()

def say(event):
    print(json.dumps(event), flush=True)
    time.sleep(0.6)

def use(name, **given):
    say({{"type": "assistant", "message": {{"content": [{{"type": "tool_use", "name": name, "input": given}}]}}}})

say({{"type": "assistant", "message": {{"content": [{{"type": "text", "text": "Let me look."}}]}}}})
use("Read", file_path="/home/me/app/src/api.py")
use("Bash", command="python3 -m app.check")
say({{"type": "user", "message": {{"content": [{{"type": "tool_result", "is_error": True,
    "content": "Exit code 1\\nTraceback (most recent call last): boom"}}]}}}})
if "slowly" in prompt:
    use("Bash", command="sleep 600")
    time.sleep(600)
answer = ("Resumed, and done." if resumed else "Done.") + " The board has 13 tickets."
say({{"type": "result", "result": answer, "session_id": session, "total_cost_usd": 0.0123, "num_turns": 3}})
"""


def main() -> None:
    port = sys.argv[1] if len(sys.argv) > 1 else "8790"
    here = Path(tempfile.mkdtemp(prefix="ticket-runner-e2e-"))
    board(here / "board")
    config = here / "config.toml"
    config.write_text(
        f'[storage]\nmode = "markdown"\npath = "{here / "board"}"\n\n[web]\ntoken = "{TOKEN}"\n',
        encoding="utf-8",
    )
    head = subprocess.run(
        ["git", "-C", str(ROOT), "rev-parse", "HEAD"], capture_output=True, text=True
    ).stdout.strip()
    stamp = here / "state" / "ticket-runner" / "update.json"
    stamp.parent.mkdir(parents=True)
    stamp.write_text(json.dumps({"checked_at": 0, "current": head, "latest": NEWER, "tag": ""}))
    bin = here / "bin"
    bin.mkdir()
    (bin / "claude").write_text(CLAUDE.format(python=sys.executable), encoding="utf-8")
    (bin / "claude").chmod(0o755)
    (here / "home").mkdir()
    os.environ.update(
        PATH=f"{bin}{os.pathsep}{os.environ.get('PATH', '')}",
        HOME=str(here / "home"),
        TICKET_RUNNER_CONFIG=str(config),
        XDG_STATE_HOME=str(here / "state"),
        PYTHONPATH=str(ROOT / "src"),
    )
    os.execvp(sys.executable, [sys.executable, "-m", "ticket_runner", "serve", "--port", port])


if __name__ == "__main__":
    main()
