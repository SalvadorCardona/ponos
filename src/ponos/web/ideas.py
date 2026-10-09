"""Finding ideas from the console, and turning the kept ones into board pages.

`ideas.py` knows what an idea is and remembers it; this is the half that
reaches out — one session to propose a batch, the board to read what is
already there and to write a kept idea onto it. It holds no state of its own
beyond the lock that keeps two batches for the same scope from being asked
for at once: the second click of an impatient person would otherwise pay for
ten ideas the first one was already writing.

A kept idea goes through `Api.create_ticket`, the console's own "New ticket",
as a draft with no model: the same road as a ticket typed by hand, so that it
reads the same on the board and the runner treats it the same way — classified
and given a model when somebody moves it to ready, not before.
"""

from __future__ import annotations

import shutil
import threading
import uuid
from pathlib import Path
from typing import TYPE_CHECKING

from .. import ideas, provider, session, state, store
from ..config import state_dir

if TYPE_CHECKING:
    from .api import Api

# The README is read for what the project is; these are the names it goes by.
READMES = ("README.md", "README", "readme.md", "README.rst", "README.txt")

# How many decisions the history tab shows: enough to find the one you doubt.
HISTORY = 50

# Language names as the prompt says them — see `voice.understood`.
LANGUAGES = {"en": "English", "fr": "French"}


class Ideas:
    def __init__(self, api: "Api") -> None:
        self._api = api
        self._lock = threading.Lock()
        self._busy: set[str] = set()

    # -- reading --------------------------------------------------------------

    def proposed(self, project: str = "") -> dict:
        """The ideas still waiting for a decision in one scope, and what finding them cost."""
        project = ideas.bare(project)
        batches, cost = ideas.spent(project)
        last = ideas.last_decided(project)
        return {
            "scope": ideas.scope_of(project),
            "project": project,
            "ideas": [idea.shown() for idea in ideas.listed(project)],
            "decided": [idea.shown() for idea in self._decided(project)],
            "batches": batches,
            "cost_usd": round(cost, 6),
            "undo": last.shown() if last else None,
        }

    @staticmethod
    def _decided(project: str) -> list[ideas.Idea]:
        """The last ideas kept or thrown away, the most recent first: the history tab's."""
        decided = ideas.listed(project, ("kept", "discarded"))
        decided.sort(key=lambda idea: (idea.decided_at or "", idea.id), reverse=True)
        return decided[:HISTORY]

    # -- finding --------------------------------------------------------------

    def generate(self, project: str = "") -> dict:
        """Ask for one batch, store what is new in it, and say what it cost.

        Raises RuntimeError when a batch for the same scope is already being
        written, and when the subscription is out of credit — the server's 409.
        """
        project = ideas.bare(project)
        with self._lock:
            if project in self._busy:
                raise RuntimeError("ideas are already being found for this scope")
            self._busy.add(project)
        try:
            return self._generate(project)
        finally:
            with self._lock:
                self._busy.discard(project)

    def _generate(self, project: str) -> dict:
        api = self._api
        configuration = api.config
        name, brief, readme = "", "", ""
        names: list[str] = []
        context = ""
        if project:
            # The list's row rather than the board's: it carries the path the
            # configuration maps the project to, which is where its README is.
            row = next(
                (row for row in api.all_projects()["projects"] if row["id"] == project), None
            )
            if row is None:
                raise LookupError(f"no project with id {project}")
            name = row["name"]
            brief = api.runner.resolver.brief(api.runner.client, project)
            readme = _readme(
                api.runner.resolver.locate(
                    name, row.get("configured") or row.get("path") or "", row.get("repository") or ""
                )
            )
        else:
            names = sorted((row["name"] for row in api.projects().values()), key=str.lower)
            try:
                context = api.runner.workspace.context
            except store.StoreError:
                context = ""
        tickets = self._tickets(name if project else "")
        known = ideas.known(project)
        model = configuration.runner.allowed(configuration.runner.ideas_model)
        asked = ideas.prompt(
            project=name,
            brief=brief,
            readme=readme,
            tickets=tickets,
            projects=names,
            context=context,
            known=known,
            language=LANGUAGES.get(api.runner.voice.language, "English"),
        )

        short = (project or "global")[:8]
        workdir = state_dir() / "scratch" / f"ideas-{short}-{uuid.uuid4().hex[:6]}"
        try:
            workdir.mkdir(parents=True, exist_ok=True)
            outcome = session.run(
                asked,
                cwd=workdir,
                log=state.log_file(f"ideas-{short}"),
                model=model,
                # It reads what it is given and answers one array: the mode a
                # conversation runs in is more than it needs.
                permission_mode=configuration.runner.reply_permission_mode,
                timeout_minutes=ideas.TIMEOUT_MINUTES,
                environment=provider.environment(configuration),
            )
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

        if outcome.exhausted:
            ideas.record(project, model, outcome.cost_usd or None, [], "out of credit")
            raise RuntimeError("out of credit — try again once it is back")
        found = ideas.parse(outcome.answer, ideas.scope_of(project)) if outcome.ok else []
        kept, dropped = ideas.fresh(found, [*known, *(title for title, _ in tickets)])
        error = "" if kept else (outcome.error or "the session proposed nothing new")
        batch, stored = ideas.record(project, model, outcome.cost_usd, kept[: ideas.BATCH], error)
        api.hub.publish("ideas", project=project, batch=batch)
        return {
            "batch": batch,
            "ideas": [idea.shown() for idea in stored],
            "dropped": [candidate["title"] for candidate in dropped],
            "cost_usd": outcome.cost_usd,
            "model": model,
            "error": error,
        }

    def _tickets(self, project: str) -> list[tuple[str, str]]:
        """The latest tickets of a project — of the board, for the workspace.

        Latest first, every column but the drafts and those nobody named: what
        has been done and what is being done is what an idea must not repeat.
        A board that cannot be read leaves the prompt without them, not the
        batch without its ideas.
        """
        try:
            tickets = self._api.board()["tickets"]
        except store.StoreError:
            return []
        chosen = [
            ticket
            for ticket in tickets
            if ticket["title"]
            and ticket["column"] != "draft"
            and (not project or ticket["project"] == project)
        ]
        chosen.sort(key=lambda ticket: ticket.get("edited") or "", reverse=True)
        return [
            (
                ticket["title"],
                ticket["column"] if project or not ticket["project"]
                else f"{ticket['column']}, {ticket['project']}",
            )
            for ticket in chosen[: ideas.TICKETS_SHOWN]
        ]

    # -- deciding -------------------------------------------------------------

    def keep(self, identifier: int) -> dict:
        """Keep an idea: a draft ticket, or a new project and its first ticket.

        An idea kept before — and taken back since — already has its pages:
        they are what it becomes again, rather than a second copy of them.
        """
        idea = ideas.get(identifier)
        if idea.status == "kept":
            return idea.shown()
        api = self._api
        say = api.runner.voice.say
        created, ticket = idea.created, idea.ticket
        if idea.kind == "project":
            if not created:
                database = api.runner.workspace.projects
                if not database:
                    raise ValueError("this workspace has no projects database")
                created = ideas.bare(api.runner.client.create_row(database, idea.title, {}))
                if idea.description.strip():
                    api.runner.client.append_markdown(created, idea.description.strip())
                api.forget_projects()
                api.hub.publish("projects", saved=created)
            if not ticket:
                ticket = api.create_ticket(
                    say("idea-frame", name=idea.title),
                    ideas.framing(idea, say),
                    project=created,
                    ready=False,
                )["id"]
        elif not ticket:
            ticket = api.create_ticket(
                idea.title, ideas.body(idea, say), project=idea.project, ready=False
            )["id"]
        kept = ideas.decide(identifier, "kept", ticket=ideas.bare(ticket), created=created)
        api.hub.publish("ideas", project=idea.project, kept=identifier)
        return kept.shown()

    def discard(self, identifier: int) -> dict:
        """Throw an idea away. Nothing else: it stays known, never to be proposed again."""
        idea = ideas.get(identifier)
        if idea.status == "kept":
            raise ValueError("this idea was kept — take that back before throwing it away")
        thrown = ideas.decide(identifier, "discarded")
        self._api.hub.publish("ideas", project=idea.project, discarded=identifier)
        return thrown.shown()

    def undo(self, project: str | None = None) -> dict:
        """Take the last decision back — in one scope, or the last of all when None.

        The idea is proposed again. What a kept one became stays on the board
        as a draft, and is said so: the board has no wastebasket the runner may
        reach into, and a ticket is not deleted on the strength of a swipe. It
        is what the idea becomes again if it is kept a second time.
        """
        last = ideas.last_decided(None if project is None else ideas.bare(project))
        if last is None:
            raise LookupError("no decision to take back")
        back = ideas.decide(last.id, "proposed")
        self._api.hub.publish("ideas", project=last.project, undone=last.id)
        return {"idea": back.shown(), "was": last.status}


def _readme(location: Path | None) -> str:
    if location is None:
        return ""
    for name in READMES:
        try:
            return (location / name).read_text(encoding="utf-8", errors="replace")[: ideas.README_LIMIT]
        except OSError:
            continue
    return ""
