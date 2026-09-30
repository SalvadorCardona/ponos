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
drawer.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from ticket_runner import files  # noqa: E402

# The token the tests open the console with: a board of fixtures has nothing to guard.
TOKEN = "e2e"
LONG = "000000000000000000000000000abcde"
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


def main() -> None:
    port = sys.argv[1] if len(sys.argv) > 1 else "8790"
    here = Path(tempfile.mkdtemp(prefix="ticket-runner-e2e-"))
    board(here / "board")
    config = here / "config.toml"
    config.write_text(
        f'[storage]\nmode = "markdown"\npath = "{here / "board"}"\n\n[web]\ntoken = "{TOKEN}"\n',
        encoding="utf-8",
    )
    os.environ.update(
        TICKET_RUNNER_CONFIG=str(config),
        XDG_STATE_HOME=str(here / "state"),
        PYTHONPATH=str(ROOT / "src"),
    )
    os.execvp(sys.executable, [sys.executable, "-m", "ticket_runner", "serve", "--port", port])


if __name__ == "__main__":
    main()
