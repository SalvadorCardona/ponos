"""The last column: carrying out the tickets you have validated.

With *Ready*, the only other place on the board where moving a ticket sets
something off. *In review* asks a question — is this what you wanted? — and
moving the ticket to *Validated* answers it: yes, and now do the last thing.
What that last thing is, the ticket already says: one that came back as a pull
request has a merge waiting, one that came back as a text has a publication
waiting. Which leaves the decision exactly where it was — nothing is merged or
published because a session felt sure of itself, only because you moved a
ticket one column to the right.

Unless you said so once and for all. `force_validated_<type>` is that gesture
made in advance, for every ticket of one type: the session succeeds, and what
this column would set off is set off straight away — `_force_merge` for a pull
request, `_publish` for a publication — without the ticket passing through it.
Only on a success, never on a ticket already in review, and said in the report.
Writing and external action have nothing to set off: they end in done already.

The two are not carried out the same way, and the asymmetry is the module.
A merge is two `gh` calls and is done in the pass's own thread — three and a
rebase when GitHub refuses it for being behind, which is what a repository
taking ten tickets a day does to a pull request opened this morning. A
publication is a Claude session, so publications run the way tickets run — side
by side, never more than `max_concurrent` at once — and are claimed before they
are done, because publishing twice is the one mistake this must not make.

A merge whose rebase stops on a conflict crosses over to the second kind: the
conflict is resolved by a session, so it takes a place like a publication and
is claimed like one — see `_resolve`. Everything it does is a question the
moment it is not sure: a conflict that is a decision, checks that stay red, a
branch somebody else pushed to, a base that keeps moving. The branch it pushes
is the pull request's own, on a lease; the base is never touched.
A ticket typed as a publication comes here the same way, whatever its project
holds: it was prepared in its page, and its page is what goes out.

And the column is read more than once. `deliver` settles it at the top of a
pass; `delivering` is the same reading, offered to a pass that is already
running, so that a ticket validated at 14:20 is merged at 14:20 rather than
when the two-hour session that began at 14:04 finally ends — see `_work`.
"""

from __future__ import annotations

import shutil
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from . import agents, git, kinds, session, state, store
from . import prompt as prompt_module
from . import voice as voice_module
from .base import Base
from .config import state_dir
from .projects import Project
from .ticket import Job, Ticket, short_id


# How many times one validated ticket's branch is replayed and pushed before
# the runner stops chasing its base and asks: twice is a base that moved once
# more while the first replay was being merged, three times is a repository
# moving faster than a replay, and a loop nobody is watching.
MOST_REBASES = 2

# What a merge refusal would have said, for a pull request GitHub already calls
# conflicting or behind before one is asked — see `git.merge_blocker`.
BLOCKERS = {
    "CONFLICTING": "Pull Request has merge conflicts",
    "BEHIND": "the head branch is not up to date with the base branch",
}


def _report_of(answer: str) -> str:
    """What a resolving session wrote above its RESULT line: its report."""
    lines = answer.strip().splitlines()
    for index in range(len(lines) - 1, -1, -1):
        if lines[index].strip().lstrip("*# ").upper().startswith("RESULT:"):
            lines = lines[:index]
            break
    report = "\n".join(lines).strip()
    return report if len(report) <= 3000 else report[:3000].rsplit("\n", 1)[0] + "\n…"


class Delivery(Base):
    """What a validated ticket sets off, and how far it is taken."""

    def delivered(self) -> list[dict]:
        """`deliver`, with what it did written into the history.

        Merged, published, or refused: as much a run of this ticket as a session
        is, and `ticket-runner history` should say so. It runs in a dry run too,
        where it only says what it would do — the one gesture that cannot be
        taken back is the one worth rehearsing — and a rehearsal is not history.
        """
        done = self.deliver()
        for entry in done:
            if entry.get("status") != "dry-run":
                state.record(entry)
        return done

    def deliver(self) -> list[dict]:
        """Carry out the tickets you have validated.

        The last column, and with *Ready* one of the only two where moving a
        ticket sets something off. *In review* asks a question — is this what you
        wanted? — and moving the ticket to *Validated* answers it: yes, and now
        do the last thing. What that last thing is, the ticket already says. One
        that came back as a pull request has a merge waiting; one that came back
        as a text has a publication waiting — a post, an email, a page. The
        runner does it, and only then is the ticket done.

        Which leaves the decision exactly where it was: nothing is merged or
        published because a session felt sure of itself, only because you moved
        a ticket one column to the right.

        Optional, like the columns before it. A board whose status property does
        not offer the validated option has no such gesture and is never even
        queried — `ticket-runner init` adds the option to a board that predates
        it, and until then you merge by hand as before.

        A date on the ticket is honoured here too. `Scheduled` means "not before
        this moment" wherever it is written, so a validated ticket dated Thursday
        is left in its column until Thursday and carried out then — which is what
        turns the board into a calendar for work that is *finished*: the post is
        written, you have read it and said yes, and it still goes out at the hour
        you chose. Merges wait the same way, for the same reason: one column, one
        rule.

        Merges are two `gh` calls and are done one after another. A publication
        is a Claude session, so publications are run the way tickets are run:
        side by side, never more than `max_concurrent` at once. They still
        finish before the queue is looked at — a ticket you have accepted comes
        before a ticket nobody has read yet — but a board with four of them
        costs one session's wait rather than four.

        This is the reading a pass does at its top, on a board nothing is
        running against yet. The same column is read again while the pass runs,
        by `delivering`, which is where the sorting actually lives.
        """
        results, publishing = self.delivering()
        return results + self._publish_all(publishing)

    def delivering(
        self, taken: set[str] | None = None
    ) -> tuple[list[dict], list[tuple[Ticket, Project]]]:
        """Sort the validated column: what is settled here, what needs a session.

        Two kinds of work sit in that column, and only one of them costs a
        place. A merge is two `gh` calls, so it happens here and now, in the
        thread that asked — which is what lets a pass with every place taken
        still merge a pull request you validated while it ran. A publication is
        a Claude session, so it is only *named* here: the caller runs it, in the
        pool it already keeps, and `deliver` is the caller that runs them all at
        once at the top of a pass. So is a merge whose conflicts need resolving,
        which is a session too — both go out through `_carry_out`.

        `taken` is what this pass has already carried out. Notion may still be
        serving the status a publication in flight has just overwritten, and
        publishing twice is the one mistake this must not make — so a ticket the
        caller has already taken off the column is skipped rather than trusted
        to have moved.

        A board that will not answer leaves the column where it is: the next
        look asks again, and neither a pass in flight nor the sessions in it
        have any business failing over a reading of a column they are not in.
        """
        settings = self.config.notion
        taken = taken or set()
        results: list[dict] = []
        publishing: list[tuple[Ticket, Project]] = []
        held: list[tuple[Ticket, datetime]] = []
        now = datetime.now().astimezone()
        try:
            pages = self.validated()
        except store.StoreError as error:
            self.say(f"  ! the validated column could not be read: {voice_module.line(error)}")
            return [], []
        for page in pages:
            ticket = Ticket(page)
            if ticket.id in taken:
                continue
            url = str(store.read(page, settings.prop("pull_request")) or "")
            moment = self._moment(ticket)
            if moment and moment > now:
                # A date says "not before this moment", and it says it here as
                # much as in the ready column: the post accepted on Tuesday for
                # Thursday goes out on Thursday. Merges wait with publications —
                # validating asks one question, and the date answers *when*.
                held.append((ticket, moment))
                if not url.startswith("http"):
                    # Its comments travel into the publication when the moment
                    # comes, exactly as a scheduled ready ticket's do, so the
                    # runner does not also answer them in the meantime. A ticket
                    # with a pull request is left talkable-to: there, a comment
                    # is a conversation about work already done.
                    self._claimed.add(ticket.id)
                continue
            if self.dry_run:
                # A dry run says what it would do here as everywhere else. It
                # matters more here than anywhere: this is the only column whose
                # gesture cannot be taken back.
                what = f"merge {url}" if url.startswith("http") else "publish what it holds"
                self.say(f"  (dry run) {ticket.title} — validated: would {what}")
                results.append({"ticket": ticket.title, "id": ticket.id, "status": "dry-run"})
                continue
            if url.startswith("http"):
                done = self._merge(ticket, url, publishing)
                if done:
                    results.append(done)
                continue
            if self.under_reserve():
                # A publication is a session; a merge is two `gh` calls. So the
                # merges above happen and this one waits, left validated, for
                # the pass that has credit again — the decision to publish it is
                # not being reconsidered, only postponed.
                self._claimed.add(ticket.id)
                continue
            # The type decides, as it did on the way in: a publication on a
            # project with a repository was prepared in the page, not in a pull
            # request, and that page is what is published.
            project = kinds.worked_in(self._project_of(ticket), self.kind(ticket))
            if project.is_code:
                # A ticket on a repository carries a pull request or it carries
                # nothing: there is no text on the page to publish, and starting
                # a session to look for one would be guessing.
                said = self.voice
                results.append(
                    self._fail(
                        ticket,
                        said.say("no-pull-request"),
                        said.say("no-pull-request-detail", project=project.name),
                        blocked=True,
                        question=said.say("no-pull-request-question"),
                    )
                )
                continue
            publishing.append((ticket, project))
        self._deferred = sorted(held, key=lambda pair: pair[1])
        return results, publishing

    def validated(self) -> list[store.Page]:
        """The pages sitting in the validated column.

        None at all where the board has no such column: the gesture is opt-in,
        and a board that never offers it is never even queried.
        """
        if not self.validated_column():
            return []
        settings = self.config.notion
        validated = settings.state("validated")
        status_property = settings.prop("status")
        kind = self.client.schema(self.database).get(status_property, "status")
        return self.client.query(
            self.database, {"property": status_property, kind: {"equals": validated}}
        )

    def validated_column(self) -> bool:
        """Does this board offer the validated column at all?

        Asked by `validated` before it queries, and by a publication before it
        says “move it to validated”: on a board without the column that would be
        an instruction nobody can follow.
        """
        settings = self.config.notion
        validated = settings.state("validated")
        if validated in (settings.state("review"), settings.state("done")):
            return False
        return validated in self.client.options(self.database, settings.prop("status"))

    def scheduled(self) -> list[tuple[Ticket, datetime]]:
        """Validated tickets whose moment has not come, soonest first.

        What `deliver` will carry out later rather than now. Read for the sake
        of saying so — a post you accepted on Tuesday for Thursday is as much a
        thing waiting to happen as a ticket sitting in ready with a date on it,
        and `ticket-runner list` shows the whole calendar rather than half of it.
        """
        now = datetime.now().astimezone()
        held: list[tuple[Ticket, datetime]] = []
        for page in self.validated():
            ticket = Ticket(page)
            moment = self._moment(ticket)
            if moment and moment > now:
                held.append((ticket, moment))
        return sorted(held, key=lambda pair: pair[1])

    def _merge(
        self, ticket: Ticket, url: str, resolving: list[tuple[Ticket, Project]]
    ) -> dict | None:
        """A validated pull request: merge it, and take the ticket to done.

        `resolving` is where a pull request whose conflicts need a session is
        put, for the caller to run it as it runs a publication — see `_carry_out`.
        """
        state_of = git.pull_request_state(url, self.config.github)
        if not state_of:
            # The same rule as `close_merged`: a ticket is never moved on an
            # answer GitHub did not give. The next run asks again.
            self.say(f"  · {ticket.title} — GitHub did not answer about {url}, left validated")
            return None
        said = self.voice
        if state_of == "CLOSED":
            state.forget_rebases(ticket.id)
            return self._fail(
                ticket,
                said.say("pull-request-closed"),
                said.say("pull-request-closed-detail", url=url),
                blocked=True,
                question=said.say("pull-request-closed-question", url=url),
            )
        if state_of == "MERGED":
            return self._merged(ticket, url, said.say("merged-before"))
        method = self.config.runner.merge_method
        # Asked first rather than read in a refusal: a pull request GitHub
        # already calls conflicting is replayed before anything is merged, and
        # one it calls mergeable goes the way every merge always went.
        blocker = git.merge_blocker(url, self.config.github) if self.config.runner.rebase else ""
        if blocker:
            self.say(f"  · {ticket.title} — GitHub says {url} is {blocker.lower()}")
            return self._catch_up(ticket, url, BLOCKERS[blocker], resolving)
        try:
            git.merge_pull_request(url, method, self.config.github)
        except git.GitError as error:
            if self.config.runner.rebase and git.is_behind(error):
                return self._catch_up(ticket, url, error, resolving)
            return self._refused(ticket, url, error)
        return self._merged(ticket, url, said.say("merged-with", method=method))

    def _merged(self, ticket: Ticket, url: str, *facts: str, notes: tuple = ()) -> dict:
        """Done, and said so: the pull request is in."""
        state.forget_rebases(ticket.id)
        said = self.voice
        self.say(f"  ✓ {ticket.title} — pull request merged, moved to done")
        self._set(
            ticket,
            **{self.config.notion.prop("status"): self.config.notion.state("done")},
            **self._refusal_cleared(ticket),
        )
        self._comment(
            ticket,
            said.report(said.verdict("merged", said.pull_request(url), *facts), url, *notes),
        )
        return {"ticket": ticket.title, "id": ticket.id, "status": "done", "merged": url}

    def _force_merge(self, job: Job, url: str) -> str:
        """Merge a pull request just opened, for a type whose validation is forced.

        What `_merge` does for a ticket you validated, minus what a pull request
        opened a minute ago does not need: its branch was replayed onto its base
        on the way out, so there is nothing to catch up with. What it does need
        is its CI — nobody has looked at it, so nobody has seen it go green — and
        it is waited for, `checks_timeout_minutes` at the most, from the worktree
        it was pushed from. Then the merge, with `merge_method`, as always.

        Returns why it was not merged, or "" once it is. A refusal is not a
        failure of the ticket: the work is done and the pull request is open, so
        it waits in review, where you would have found it without the option.
        """
        accounts = self.config.github
        checks = git.wait_for_checks(
            url, job.workdir, self.config.runner.checks_timeout_minutes, accounts
        )
        if checks == "failed":
            refusal = self.voice.say("forced-checks-red")
        else:
            try:
                git.merge_pull_request(url, self.config.runner.merge_method, accounts)
            except git.GitError as error:
                refusal = voice_module.line(error)
            else:
                state.forget_rebases(job.ticket.id)
                return ""
        self.say(f"    ! {url} not merged: {refusal}")
        return refusal

    def _refused(self, ticket: Ticket, url: str, refusal: object, *notes: str) -> dict:
        """A merge GitHub would not make, and nothing more the runner can do about it."""
        state.forget_rebases(ticket.id)
        said = self.voice
        return self._fail(
            ticket,
            said.say("merge-refused"),
            said.paragraphs(url, *notes, refusal),
            blocked=True,
            question=said.say("merge-refused-question", error=voice_module.line(refusal)),
        )

    def _catch_up(
        self,
        ticket: Ticket,
        url: str,
        refusal: object,
        resolving: list[tuple[Ticket, Project]],
    ) -> dict | None:
        """Put the branch back on top of its base, when that is what was wrong.

        A pull request opened this morning is behind by noon on a repository
        that takes ten tickets a day: GitHub refuses the merge, and the refusal
        is about the *branch*, not about the work. So the branch is replayed
        onto its base and pushed again, and the merge is asked a second time —
        which is exactly the gesture you would make by hand, and the one nobody
        should have to make ten times a day.

        Only that refusal. A check still red and a review still missing are
        refusals a rebase does not answer, and pushing the branch again would
        only spend a CI run to be refused the same way.

        A replay that stops on a conflict is not the end of it any more: the
        conflict is handed to a session — `_resolve` — at the next free place,
        unless the project is one whose conflicts are left to you. And a base
        that moves faster than the replays is not chased for ever: past
        `MOST_REBASES`, the ticket asks.
        """
        branch, base = git.pull_request_branches(url, self.config.github)
        project = self._project_of(ticket)
        if not branch or not project.is_code:
            return self._refused(ticket, url, refusal)
        if state.rebases(ticket.id) >= MOST_REBASES:
            return self._too_often(ticket, url, base)
        workdir = state_dir() / "scratch" / f"rebase-{short_id(ticket.id)}"
        self.say(f"  · {ticket.title} — merge refused, replaying {branch} onto {base}")
        failure = git.replay_pushed(
            project.path, branch, base, workdir, self.config.github
        )
        if failure and git.is_conflict(failure) and self.config.runner.resolves_conflicts(
            project.name
        ):
            if self.under_reserve():
                # A resolution is a session, and waits for credit the way a
                # publication does: left validated, not reconsidered.
                self._claimed.add(ticket.id)
                return None
            self.say(f"    ! {failure} — resolving it at the next free place")
            resolving.append((ticket, project))
            return None
        if failure:
            self.say(f"    ! {branch} not replayed: {failure}")
            return self._refused(ticket, url, refusal, failure)
        count = state.rebased(ticket.id)
        replayed = self.voice.say("merge-rebased", branch=branch, base=base)
        method = self.config.runner.merge_method
        try:
            git.merge_pull_request(url, method, self.config.github)
        except git.GitError as error:
            if git.is_behind(error):
                if count < MOST_REBASES:
                    # The base moved again between the push and the merge: the
                    # next pass replays it once more, on what it holds then.
                    self.say(f"    · {base} moved again — left validated for the next pass")
                    return None
                return self._too_often(ticket, url, base)
            return self._refused(ticket, url, error, replayed)
        return self._merged(
            ticket, url, self.voice.say("merged-with", method=method), notes=(replayed,)
        )

    def _too_often(self, ticket: Ticket, url: str, base: str) -> dict:
        """A base that moves faster than the replays: asked, rather than chased."""
        state.forget_rebases(ticket.id)
        said = self.voice
        return self._fail(
            ticket,
            said.say("rebased-too-often", base=base),
            url,
            blocked=True,
            question=said.say("rebased-too-often-question", count=MOST_REBASES, base=base),
        )

    def _carry_out(self, ticket: Ticket, project: Project) -> dict | None:
        """A validated ticket that needs a session: a publication, or a conflict.

        The two things of the validated column that cost a place, told apart by
        what the ticket carries: a pull request here can only be one whose merge
        stopped on a conflict — every other one was settled by `_merge`.
        """
        url = str(store.read(ticket.page, self.config.notion.prop("pull_request")) or "")
        if url.startswith("http"):
            return self._resolve(ticket, project, url)
        return self._publish(ticket, project)

    def _resolve(self, ticket: Ticket, project: Project, url: str) -> dict | None:
        """Resolve a validated pull request's conflicts, then merge it.

        The replay `_catch_up` gave up on, taken to its end: the branch as
        origin holds it, in a detached worktree of its own, rebased onto its
        base — and where git stops, a session takes over, told what the ticket
        wanted, what the pull request changes and what landed underneath it.
        What it leaves is checked before anything leaves the machine: no rebase
        half done, no marker left in a file, the base underneath. Then the push,
        on a lease on the commit it was replayed from; the pull request's CI;
        and the merge.

        Claimed like a publication, and for the same reason: two runners must
        not both resolve and push the same branch. Anything short of the merge
        is a question on the ticket — what conflicts and what it asks, not only
        GitHub's refusal — with whatever resolution was reached pushed to a
        branch of its own for you to look at.
        """
        settings = self.config.notion
        branch, base = git.pull_request_branches(url, self.config.github)
        if not branch:
            self.say(f"  · {ticket.title} — GitHub did not answer about {url}, left validated")
            return None
        short = short_id(ticket.id)
        role = store.read(ticket.page, settings.prop("role")) or []
        job = Job(
            ticket,
            project,
            branch=branch,
            base=base,
            workdir=state_dir() / "scratch" / f"resolve-{short}",
            session_id=session.new_id(),
            log=state.log_file(short),
            # The model the ticket was worked with, unless the configuration
            # names one for resolving: the session reads the same code again.
            model=self.config.runner.resolve_model
            or str(store.read(ticket.page, settings.prop("model")) or ""),
            agent=(
                agents.resolve(self.client, role[0], settings.prop("model"))
                if role
                else agents.Agent()
            ),
            comments=self.discussion(ticket),
        )
        self.say(f"  ▸ {ticket.title}\n    validated · resolving the conflicts of {url}")
        if self.dry_run:
            return None
        self._claimed.add(ticket.id)
        state.claim(ticket.id, settings.state("validated"))
        self._set(
            ticket,
            **{
                settings.prop("status"): settings.state("running"),
                settings.prop("agent"): self.agent_label,
                settings.prop("waiting"): False,
                settings.prop("session"): self._session_value(job.session_id, project.path),
            },
        )
        try:
            return self._resolved(job, url)
        finally:
            state.release(ticket.id)
            if project.path:
                git.remove_worktree(project.path, job.workdir)

    def _resolved(self, job: Job, url: str) -> dict | None:
        """`_resolve`, once the ticket is claimed: every road out of it."""
        ticket, project = job.ticket, job.project
        assert project.path is not None
        said = self.voice
        accounts = self.config.github
        validated = self.config.notion.state("validated")
        replay = git.begin_replay(project.path, job.branch, job.base, job.workdir)
        if replay.error:
            return self._refused(ticket, url, replay.error)
        conflicts = replay.conflicts or []
        facts = said.say(
            "conflict-facts",
            branch=job.branch,
            base=job.base,
            onto=replay.onto[:7],
            files=", ".join(f"`{name}`" for name in conflicts) or said.say("conflict-none"),
        )
        outcome: session.Outcome | None = None
        if conflicts:
            job.body = self._conflict_brief(job, url, replay)
            try:
                outcome = self._run_session(job, prompt_module.RESOLVE)
            except (OSError, FileNotFoundError) as error:
                return self._fail(ticket, said.say("no-session"), str(error))
            self._add_cost(ticket, outcome)
            if self._out_of_credit(outcome):
                return self._requeue(ticket, validated, outcome)
            told = _report_of(outcome.answer)
            if not outcome.ok:
                question = outcome.summary or said.say("conflict-open", base=job.base)
                return self._fail(
                    ticket,
                    said.say("conflict-open", base=job.base),
                    outcome.summary or outcome.error,
                    blocked=True,
                    question=question,
                    note=said.paragraphs(
                        facts, told, self._aside(job, replay), self._filed(job, outcome)
                    ),
                )
            if problem := self._unfinished(job, replay):
                return self._fail(
                    ticket,
                    said.say("conflict-unfinished"),
                    problem,
                    blocked=True,
                    question=said.say("conflict-unfinished-question", problem=problem),
                    note=said.paragraphs(facts, told, self._aside(job, replay)),
                )
        else:
            told = ""
        failure = git.push_leased(job.workdir, job.branch, replay.was, accounts)
        if failure:
            aside = self._aside(job, replay)
            if git.pushed_over(failure):
                state.forget_rebases(ticket.id)
                return self._fail(
                    ticket,
                    said.say("pushed-over", branch=job.branch),
                    failure,
                    blocked=True,
                    question=said.say("pushed-over-question", branch=job.branch),
                    note=said.paragraphs(facts, aside),
                )
            return self._fail(ticket, said.say("push-refused"), failure, note=aside)
        count = state.rebased(ticket.id)
        record = said.paragraphs(facts, told)
        git.comment_pull_request(url, f"Ponos — {record}", accounts)
        checks = git.wait_for_checks(
            url, job.workdir, self.config.runner.checks_timeout_minutes, accounts
        )
        checked = said.say(f"checks-{checks}")
        if checks == "failed":
            state.forget_rebases(ticket.id)
            return self._fail(
                ticket,
                said.say("checks-red"),
                url,
                blocked=True,
                question=said.say("checks-red-question", url=url),
                note=said.paragraphs(record, checked),
            )
        method = self.config.runner.merge_method
        try:
            git.merge_pull_request(url, method, accounts)
        except git.GitError as error:
            if git.is_behind(error) and count < MOST_REBASES:
                # Resolved and pushed, and the base moved again meanwhile: back
                # to the column it came from, for the next pass to replay what
                # is — with a little luck — only a replay this time.
                self.say(f"    · {job.base} moved again — left validated for the next pass")
                self._set(ticket, **{self.config.notion.prop("status"): validated})
                self._comment(ticket, said.report(record, checked, said.say("base-moved-again")))
                return {"ticket": ticket.title, "id": ticket.id, "status": "validated"}
            if git.is_behind(error):
                return self._too_often(ticket, url, job.base)
            return self._refused(ticket, url, error, record, checked)
        spent = said.spent(outcome.seconds, outcome.cost_usd) if outcome else ()
        done = self._merged(
            ticket,
            url,
            said.say("merged-with", method=method),
            said.say("conflicts-resolved") if conflicts else "",
            *spent,
            notes=(said.brief(outcome.summary) if outcome else "", record, checked),
        )
        if outcome:
            done.update(
                session=outcome.session_id,
                seconds=round(outcome.seconds, 1),
                cost_usd=outcome.cost_usd,
            )
        return done

    def _conflict_brief(self, job: Job, url: str, replay: git.Replay) -> str:
        """Everything the resolving session is told, under the ticket's own text."""
        said = [
            self._body(job.ticket).strip(),
            f"# The pull request — {url}",
            git.pull_request_body(url, self.config.github).strip() or "(no description)",
            "# Where the rebase stopped",
            f"`{job.branch}` (at `{replay.was[:7]}`) is being replayed onto "
            f"`origin/{job.base}` (at `{replay.onto[:7]}`). Git stopped on:\n"
            + "\n".join(f"- `{name}`" for name in replay.conflicts or []),
            f"# What landed on `{job.base}` since the branch left it",
            f"```\n{replay.arrived or '(nothing git could list)'}\n```",
            "# What the pull request changes",
            f"```diff\n{replay.diff}\n```\n"
            f"The whole of it, and each commit: `git log -p origin/{job.base}..{replay.was}`.",
        ]
        return "\n\n".join(part for part in said if part)

    def _unfinished(self, job: Job, replay: git.Replay) -> str:
        """What a resolution that said it was done has not actually done, or nothing."""
        said = self.voice
        if git.rebasing(job.workdir):
            return said.say("unfinished-rebase")
        marked = git.with_markers(job.workdir, replay.conflicts or [])
        if marked:
            return said.say("unfinished-markers", files=", ".join(f"`{name}`" for name in marked))
        if not git.contains(job.workdir, replay.onto):
            return said.say("unfinished-base", base=job.base)
        if git.is_dirty(job.workdir):
            return said.say("unfinished-dirty")
        return ""

    def _aside(self, job: Job, replay: git.Replay) -> str:
        """The resolution as far as it got, on a branch of its own — said, or nothing.

        Only a rebase carried to its end: a worktree still in the middle of one
        holds no branch worth reading, only an index somebody has to finish.
        """
        head = git.head(job.workdir)
        if git.rebasing(job.workdir) or not head or head == replay.was:
            return ""
        name = f"{job.branch}-rebased-{head[:7]}"
        if git.push_aside(job.workdir, name, self.config.github):
            return ""
        return self.voice.say("conflict-aside", branch=name)

    def _add_cost(self, ticket: Ticket, outcome: session.Outcome) -> None:
        """A resolution's price, added to what the ticket had already cost."""
        if not outcome.cost_usd or self.dry_run:
            return
        column = self.config.notion.prop("cost")
        before = store.read(ticket.page, column)
        spent = (before if isinstance(before, (int, float)) else 0.0) + outcome.cost_usd
        try:
            self.client.update(self.database, ticket.page.id, {column: round(spent, 3)})
        except store.StoreError as error:
            self.say(f"    ! the cost could not be written: {voice_module.line(error)}")

    def _publish_all(self, publishing: list[tuple[Ticket, Project]]) -> list[dict]:
        """Every validated publication of this pass, up to `max_concurrent` at once.

        A batch, unlike the ticket queue in `_work`, and deliberately so: the
        whole list is handed to `pool.map`, which starts the next publication as
        soon as a worker frees, so no place is ever left idle. What it does not
        do is look at the board again mid-list — and it has no reason to: this
        is the top of a pass, and a ticket validated a minute later is picked up
        by `_work`, which looks at that column for as long as the pass lasts.
        """
        if not publishing:
            return []
        if len(publishing) == 1:
            done = self._guarded(publishing[0][0], self._carry_out, *publishing[0])
            return [done] if done else []
        workers = min(len(publishing), max(1, self.config.runner.max_concurrent))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            results = list(
                pool.map(lambda pair: self._guarded(pair[0], self._carry_out, *pair), publishing)
            )
        return [done for done in results if done]

    def _publish(self, ticket: Ticket, project: Project, forced: str = "") -> dict | None:
        """A validated ticket with no pull request: publish what it holds.

        The Instagram post drafted last week, the email written into the page,
        the announcement waiting on somebody to press send: work whose last step
        is not a commit. A session is given the page as it stands — the ask, and
        the answer a previous run wrote under it — and told to put it where the
        ticket says, changing nothing on the way.

        Claimed like any other work, by moving the ticket to "in progress":
        publishing twice is the one mistake this must not make, and two runners
        looking at the same board would otherwise both take it. The column it
        was claimed from is written down first — see `state.claim` — so that a
        run dying mid-publication comes back as a question rather than as a
        second post.

        `forced` is the line saying nobody moved it: a ticket whose type has its
        validation forced comes here straight from the session that prepared it
        — see `Execution._execute_document` — and its report says so.
        """
        short = short_id(ticket.id)
        # The role, if the ticket names one: the account to post to and the
        # voice to post in are exactly the sort of thing an agent page carries.
        role = store.read(ticket.page, self.config.notion.prop("role")) or []
        job = Job(
            ticket,
            project,
            branch="",
            base="",
            workdir=state_dir() / "scratch" / f"deliver-{short}",
            body=self._body(ticket),
            session_id=session.new_id(),
            log=state.log_file(short),
            model=str(store.read(ticket.page, self.config.notion.prop("model")) or ""),
            agent=(
                agents.resolve(self.client, role[0], self.config.notion.prop("model"))
                if role
                else agents.Agent()
            ),
            comments=self.discussion(ticket),
        )
        self.say(f"  ▸ {ticket.title}\n    validated · publishing what the ticket holds")
        if self.dry_run:
            return None
        # A comment on a ticket being published is a conversation about the
        # work, not an instruction: the same rule as a ticket about to be run.
        self._claimed.add(ticket.id)
        state.claim(ticket.id, self.config.notion.state("validated"))
        self._set(
            ticket,
            **{
                self.config.notion.prop("status"): self.config.notion.state("running"),
                self.config.notion.prop("agent"): self.agent_label,
                # Unticked by the same write that claims it: the wait is over
                # the moment something is started, and a tick left behind would
                # have the next pass resume a session that is running.
                self.config.notion.prop("waiting"): False,
                self.config.notion.prop("session"): self._session_value(
                    job.session_id, project.path
                ),
            },
        )
        job.workdir.mkdir(parents=True, exist_ok=True)
        try:
            outcome = self._run_session(job, prompt_module.template(
                self.config.runner.delivery_prompt_file, prompt_module.DELIVERY
            ))
        except (OSError, FileNotFoundError) as error:
            state.release(ticket.id)
            return self._fail(ticket, self.voice.say("no-session"), str(error))
        # Every road from here writes a status that is not "in progress", so the
        # note about where it came from has done its work.
        state.release(ticket.id)
        said = self.voice
        if self._out_of_credit(outcome):
            # Back to validated, not to ready: the decision to publish it has
            # already been taken, and the wait does not take it back.
            return self._requeue(ticket, self.config.notion.state("validated"), outcome)

        if not outcome.ok:
            # Kept, always: a publication that half happened is exactly the log
            # somebody is going to want to read before trying again.
            return self._fail(
                ticket,
                said.say("not-published"),
                outcome.summary or outcome.error,
                blocked=outcome.blocked,
                question=outcome.summary,
                note=said.paragraphs(
                    forced,
                    self._filed(job, outcome, said.say("workdir-kept", path=job.workdir)),
                ),
            )

        shutil.rmtree(job.workdir, ignore_errors=True)
        self._set(
            ticket,
            **{
                self.config.notion.prop("status"): self.config.notion.state("done"),
                self.config.notion.prop("agent"): self.agent_label,
                self.config.notion.prop("session"): self._session_value(
                    outcome.session_id, job.session_home
                ),
                **self._measures(outcome),
            },
        )
        facts = said.spent(outcome.seconds, outcome.cost_usd)
        brief = said.brief(outcome.summary)
        self._comment(ticket, said.report(said.verdict("published", *facts), brief, forced))
        self.say(f"    ✓ {ticket.title} — published")
        self._tell("done", ticket, "published", said.report(said.facts(*facts), brief, forced))
        return {
            "ticket": ticket.title,
            "id": ticket.id,
            "status": "done",
            "project": project.name,
            "kind": "delivery",
            "session": outcome.session_id,
            "seconds": round(outcome.seconds, 1),
            "cost_usd": outcome.cost_usd,
        }
