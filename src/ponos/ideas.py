"""Ideas Ponos proposes, and what was decided about each of them.

A board only ever holds what somebody already thought of. Ideas are the other
direction: Ponos reads what a project is and what has been done in it, and
proposes what could come next — for one project, from its page, or for the
whole workspace, from the dashboard, where an idea may also be a project of its
own. Somebody keeps it or throws it away, one at a time; a kept idea becomes a
draft on the board, and the board is where it is worked on from then on.

**Ten at once, in one call, on a light model.** Ideas are cheap to propose and
dear to read: one session writing ten costs barely more than one writing a
single idea, and the choice is the person's, not the model's — so the lightest
model there is (`runner.ideas_model`) is enough. What a batch cost is written
down with it, failed ones included, since a session that answered nothing usable
was still paid for.

**Never twice.** Everything already proposed for the same scope — kept, thrown
away or still waiting — goes into the prompt, so the model knows what not to
say again, and whatever it says anyway is filtered here: a title too close to
one already known, or to a ticket of the board, is dropped before it is stored.
A model told not to repeat itself still does; a comparison of two strings does
not forget.

**An idea is ours, a ticket is the board's.** Ideas live in the local database
rather than as Notion pages, because nine out of ten are thrown away and a board
is not where a discarded thought belongs. Keeping one is the moment it crosses
over — and the ticket it became is remembered on it, so that taking the decision
back and keeping it again finds that ticket rather than writing a second one.

Nothing here touches the network: building the prompt, reading the answer and
remembering the decisions are testable alone. Running the session and writing
the board is `web/ideas.py`'s.
"""

from __future__ import annotations

import difflib
import json
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timezone

from . import db

SCOPES = ("global", "project")
KINDS = ("ticket", "project")
STATUSES = ("proposed", "kept", "discarded")

# One batch. Enough to swipe through in a minute, few enough that the model
# still has something to say by the tenth.
BATCH = 10

# Ten short objects. A session still writing after three minutes is a session
# that started doing the work instead of proposing it.
TIMEOUT_MINUTES = 3

# What a card has room for: the title says it, the description says why.
TITLE_LIMIT = 90
DESCRIPTION_LINES = 3
DESCRIPTION_LIMIT = 320

# How alike two titles may be before the second is the first said again —
# measured twice, accents and case aside. Character by character, high, since
# ideas share their openings: "Add a dark mode" and "Add dark mode" are one idea,
# "Export to CSV" and "Export to PDF" are two. And word by word, for the same
# words said in another order.
SIMILAR = 0.9
SAME_WORDS = 0.8

# What the prompt carries at most of each source — a README is read for what
# the project is, not for its installation steps.
README_LIMIT = 4000
BRIEF_LIMIT = 4000
CONTEXT_LIMIT = 2000
TICKETS_SHOWN = 40
KNOWN_SHOWN = 200

PROMPT = """\
You are proposing ideas to somebody who will read them one at a time and keep \
or throw away each one. Do not carry any of them out, do not open anything: \
read what is below and propose.

{scope}

Propose exactly {count} ideas, each of them new: none of them may repeat, \
reword or narrow an idea listed under "Already proposed", nor a ticket listed \
under "Tickets". Prefer ideas that are concrete, useful and small enough to be \
one piece of work.

Answer with a JSON array and nothing else — no preamble, no fence. One object \
per idea:

- "title": what to do, in one line of {title_limit} characters at most;
- "description": why it is worth doing, in {lines} short lines at most;
- "kind": {kinds};
- "where": where the work happens — the part of the project, the files, the \
service — in one sentence;
- "done": a list of two to four checks that say the work is finished;
- "out": a list of one to three things this idea does not include.

{language}
{sections}"""

_GLOBAL = """\
The scope is the whole workspace: ideas of new projects worth starting, or of \
improvements that cut across the existing projects."""

_PROJECT = """\
The scope is one project, {name}: ideas for this project only."""

_KINDS_GLOBAL = (
    '"project" for a new project worth starting, "ticket" for an improvement '
    "to the existing work"
)
_KINDS_PROJECT = '"ticket", always'


@dataclass
class Idea:
    """One idea, as the local database keeps it.

    `project` is the page of the project it was proposed for — "" for the
    workspace. `ticket` is the draft it became once kept, and `created` the
    project it created when it was the idea of one: both stay after the
    decision is taken back, so that keeping it again does not write them twice.
    """

    id: int
    batch: int | None
    scope: str
    project: str
    kind: str
    title: str
    description: str
    detail: dict = field(default_factory=dict)
    status: str = "proposed"
    ticket: str = ""
    created: str = ""
    cost_usd: float | None = None
    created_at: str = ""
    decided_at: str | None = None

    def shown(self) -> dict:
        """The idea as the console reads it."""
        return {
            "id": self.id,
            "batch": self.batch,
            "scope": self.scope,
            "project": self.project,
            "kind": self.kind,
            "title": self.title,
            "description": self.description,
            "where": str(self.detail.get("where") or ""),
            "done": list(self.detail.get("done") or []),
            "out": list(self.detail.get("out") or []),
            "status": self.status,
            "ticket": self.ticket,
            "created": self.created,
            "cost_usd": self.cost_usd,
            "created_at": self.created_at,
            "decided_at": self.decided_at,
        }


def scope_of(project: str) -> str:
    return "project" if project else "global"


def bare(page_id: str) -> str:
    """A page id the way ideas are filed under it: no dashes."""
    return page_id.replace("-", "").strip()


# -- the prompt ----------------------------------------------------------------


def prompt(
    *,
    project: str = "",
    brief: str = "",
    readme: str = "",
    tickets: list[tuple[str, str]] | None = None,
    projects: list[str] | None = None,
    context: str = "",
    known: list[str] | None = None,
    language: str = "English",
    count: int = BATCH,
) -> str:
    """What the session is asked, with everything it is given to read.

    `project` is the project's name, "" for the whole workspace. `tickets` are
    (title, column) pairs, latest first; `projects` the names of every project,
    for the workspace; `known` every title already proposed for this scope.
    A section with nothing in it is left out rather than shown empty: an empty
    heading reads as a claim that there is nothing there.
    """
    sections: list[str] = []
    if context.strip():
        sections.append(_section("Who the ideas are for", context.strip()[:CONTEXT_LIMIT]))
    if projects:
        sections.append(_section("Projects", "\n".join(f"- {name}" for name in projects)))
    if brief.strip():
        sections.append(_section("The project's brief", brief.strip()[:BRIEF_LIMIT]))
    if readme.strip():
        sections.append(_section("The project's README", readme.strip()[:README_LIMIT]))
    if tickets:
        lines = [f"- {title} ({column})" if column else f"- {title}" for title, column in tickets]
        sections.append(_section("Tickets", "\n".join(lines[:TICKETS_SHOWN])))
    if known:
        sections.append(
            _section("Already proposed", "\n".join(f"- {title}" for title in known[:KNOWN_SHOWN]))
        )
    return PROMPT.format(
        scope=_PROJECT.format(name=project) if project else _GLOBAL,
        count=count,
        title_limit=TITLE_LIMIT,
        lines=DESCRIPTION_LINES,
        kinds=_KINDS_PROJECT if project else _KINDS_GLOBAL,
        language=f"Write every title and description in {language}.",
        sections="".join(f"\n{section}" for section in sections),
    )


def _section(heading: str, body: str) -> str:
    return f"# {heading}\n\n{body}\n"


# -- the answer ----------------------------------------------------------------


def parse(answer: str, scope: str) -> list[dict]:
    """The ideas, out of whatever the session actually said.

    The widest array that reads as one, so that a fence or a sentence around it
    costs nothing. An entry with no title is dropped; a kind that is not one of
    the two is a ticket, and in a project's scope everything is — a project
    cannot propose a new project inside itself.
    """
    raw = _array(answer or "")
    found: list[dict] = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        title = _line(entry.get("title"))[:TITLE_LIMIT].strip()
        if not title:
            continue
        kind = _line(entry.get("kind")).lower()
        if scope != "global" or kind not in KINDS:
            kind = "ticket"
        found.append(
            {
                "title": title,
                "description": _description(entry.get("description")),
                "kind": kind,
                "detail": {
                    "where": _line(entry.get("where")),
                    "done": _list(entry.get("done")),
                    "out": _list(entry.get("out")),
                },
            }
        )
    return found


def _array(answer: str) -> list:
    start = answer.find("[")
    while start != -1:
        end = answer.rfind("]")
        while end > start:
            try:
                value = json.loads(answer[start : end + 1])
            except ValueError:
                end = answer.rfind("]", start, end)
                continue
            if isinstance(value, list):
                return value
            break
        start = answer.find("[", start + 1)
    return []


def _line(value: object) -> str:
    return " ".join(str(value or "").split()) if isinstance(value, (str, int, float)) else ""


def _list(value: object) -> list[str]:
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    return [line for line in (_line(item) for item in value) if line][:6]


def _description(value: object) -> str:
    """At most three lines, each of them one line: a card, not a page."""
    text = str(value or "") if isinstance(value, str) else ""
    lines = [" ".join(line.split()) for line in text.splitlines()]
    kept = "\n".join([line for line in lines if line][:DESCRIPTION_LINES])
    return kept[:DESCRIPTION_LIMIT].strip()


# -- never twice ---------------------------------------------------------------


def _words(title: str) -> str:
    plain = unicodedata.normalize("NFKD", title.casefold())
    plain = "".join(char for char in plain if not unicodedata.combining(char))
    return " ".join(re.findall(r"\w+", plain))


def similar(first: str, second: str) -> bool:
    """Whether two titles are one idea said twice."""
    a, b = _words(first), _words(second)
    if not a or not b:
        return False
    if a == b or difflib.SequenceMatcher(None, a, b).ratio() >= SIMILAR:
        return True
    # Words of three letters or more: "a", "de", "un" say nothing of the idea.
    left = {word for word in a.split() if len(word) > 2}
    right = {word for word in b.split() if len(word) > 2}
    return bool(left and right) and len(left & right) / len(left | right) >= SAME_WORDS


def fresh(candidates: list[dict], known: list[str]) -> tuple[list[dict], list[dict]]:
    """The candidates worth keeping, and those that were already said.

    Compared with what is known and with each other: a batch that proposes the
    same idea twice proposes it once.
    """
    kept: list[dict] = []
    dropped: list[dict] = []
    seen = [title for title in known if title.strip()]
    for candidate in candidates:
        if any(similar(candidate["title"], title) for title in seen):
            dropped.append(candidate)
            continue
        kept.append(candidate)
        seen.append(candidate["title"])
    return kept, dropped


# -- the draft a kept idea becomes ---------------------------------------------


def body(idea: Idea, say) -> str:
    """The ticket a kept idea is written as: What / Where / Done when / Out of scope.

    `say` is the runner's voice, so the headings are in the board's language.
    The description opens the page, since it is the reason the idea was kept.
    """
    what = idea.description.strip() or idea.title
    return draft(
        say,
        what=what,
        where=str(idea.detail.get("where") or ""),
        done=list(idea.detail.get("done") or []),
        out=list(idea.detail.get("out") or []),
    )


def framing(idea: Idea, say) -> str:
    """The first ticket of a project an idea created: frame it."""
    what = say("idea-frame-what")
    if idea.description.strip():
        what = f"{idea.description.strip()}\n\n{what}"
    return draft(
        say,
        what=what,
        where=say("idea-frame-where"),
        done=[say("idea-frame-done")],
        out=[say("idea-frame-out")],
    )


def draft(say, *, what: str, where: str, done: list[str], out: list[str]) -> str:
    parts = [f"## {say('idea-what')}\n\n{what.strip()}"]
    if where.strip():
        parts.append(f"## {say('idea-where')}\n\n{where.strip()}")
    if done:
        parts.append(f"## {say('idea-done')}\n\n" + "\n".join(f"- [ ] {line}" for line in done))
    if out:
        parts.append(f"## {say('idea-out')}\n\n" + "\n".join(f"- {line}" for line in out))
    return "\n\n".join(parts) + "\n"


# -- the local database --------------------------------------------------------


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


_COLUMNS = (
    "id, batch, scope, project, kind, title, description, detail, status, ticket, created,"
    " cost_usd, created_at, decided_at"
)


def _idea(row: tuple) -> Idea:
    try:
        detail = json.loads(row[7] or "{}")
    except ValueError:
        detail = {}
    return Idea(
        id=row[0],
        batch=row[1],
        scope=row[2],
        project=row[3],
        kind=row[4],
        title=row[5],
        description=row[6],
        detail=detail if isinstance(detail, dict) else {},
        status=row[8],
        ticket=row[9],
        created=row[10],
        cost_usd=row[11],
        created_at=row[12],
        decided_at=row[13],
    )


def record(
    project: str,
    model: str,
    cost_usd: float | None,
    ideas: list[dict],
    error: str = "",
) -> tuple[int, list[Idea]]:
    """Write one batch and its ideas, and give them back as stored.

    Each idea carries its share of what the batch cost; the batch carries the
    whole of it — and is written even with no idea in it, since it was paid.
    """
    project = bare(project)
    scope = scope_of(project)
    now = _now()
    share = cost_usd / len(ideas) if cost_usd is not None and ideas else None
    with db.transaction() as connection:
        batch = connection.execute(
            "INSERT INTO idea_batches (scope, project, model, created_at, count, cost_usd, error)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (scope, project, model, now, len(ideas), cost_usd, error),
        ).lastrowid
        for idea in ideas:
            connection.execute(
                "INSERT INTO ideas (batch, scope, project, kind, title, description, detail,"
                " cost_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    batch,
                    scope,
                    project,
                    idea["kind"],
                    idea["title"],
                    idea.get("description", ""),
                    json.dumps(idea.get("detail") or {}, ensure_ascii=False),
                    share,
                    now,
                ),
            )
        rows = connection.execute(
            f"SELECT {_COLUMNS} FROM ideas WHERE batch = ? ORDER BY id", (batch,)
        ).fetchall()
    return int(batch), [_idea(row) for row in rows]


def listed(project: str, statuses: tuple[str, ...] = ("proposed",)) -> list[Idea]:
    """The ideas of one scope in these statuses, oldest first — the order they came in."""
    marks = ", ".join("?" for _ in statuses)
    with db.transaction(immediate=False) as connection:
        rows = connection.execute(
            f"SELECT {_COLUMNS} FROM ideas WHERE project = ? AND status IN ({marks}) ORDER BY id",
            (bare(project), *statuses),
        ).fetchall()
    return [_idea(row) for row in rows]


def known(project: str) -> list[str]:
    """Every title ever proposed for this scope, whatever was decided about it."""
    return [idea.title for idea in listed(project, STATUSES)]


def get(identifier: int) -> Idea:
    with db.transaction(immediate=False) as connection:
        row = connection.execute(
            f"SELECT {_COLUMNS} FROM ideas WHERE id = ?", (identifier,)
        ).fetchone()
    if row is None:
        raise LookupError(f"no idea {identifier}")
    return _idea(row)


def decide(identifier: int, status: str, *, ticket: str = "", created: str = "") -> Idea:
    """Write what was decided about an idea, and the board pages it became."""
    if status not in STATUSES:
        raise ValueError(f"an idea is {', '.join(STATUSES)} — not {status}")
    with db.transaction() as connection:
        connection.execute(
            "UPDATE ideas SET status = ?, decided_at = ?,"
            " ticket = CASE WHEN ? != '' THEN ? ELSE ticket END,"
            " created = CASE WHEN ? != '' THEN ? ELSE created END"
            " WHERE id = ?",
            (
                status,
                None if status == "proposed" else _now(),
                ticket,
                ticket,
                created,
                created,
                identifier,
            ),
        )
    return get(identifier)


def last_decided(project: str | None = None) -> Idea | None:
    """The idea decided most recently — in one scope, or in any when None."""
    query = f"SELECT {_COLUMNS} FROM ideas WHERE status != 'proposed' AND decided_at IS NOT NULL"
    values: tuple = ()
    if project is not None:
        query += " AND project = ?"
        values = (bare(project),)
    query += " ORDER BY decided_at DESC, id DESC LIMIT 1"
    with db.transaction(immediate=False) as connection:
        row = connection.execute(query, values).fetchone()
    return _idea(row) if row else None


def spent(project: str | None = None) -> tuple[int, float]:
    """How many batches were asked for, and what they cost together."""
    query = "SELECT COUNT(*), COALESCE(SUM(cost_usd), 0) FROM idea_batches"
    values: tuple = ()
    if project is not None:
        query += " WHERE project = ?"
        values = (bare(project),)
    with db.transaction(immediate=False) as connection:
        count, total = connection.execute(query, values).fetchone()
    return int(count), float(total)
