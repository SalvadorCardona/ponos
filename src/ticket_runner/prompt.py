"""The prompt handed to the Claude session.

Two choices are made here, and they decide the quality of the whole system:

- **the agent commits, it does not push.** Publishing a branch and opening a PR
  are outward-facing gestures; the runner performs them, once it has checked
  there is actually something to publish;
- **an ambiguous ticket is not guessed.** The agent must answer `RESULT: blocked`
  and stop. A badly specified ticket coming back as a draft with the question
  asked beats a pull request that confidently does the wrong thing.

What surrounds the ticket is composed from the widest frame to the narrowest —
who you are, then the project, then the task — so that the specific is read last
and wins when the two disagree.

A third template answers a comment rather than doing a ticket, and its one rule
is the mirror of the first: **it talks, it does not work.** A conversation that
quietly edited a repository would be the least expected thing this tool could
do, so the frame says so, and the runner runs it in a permission mode that
cannot write.

Two of the four types of ticket — see kinds.py — add a section of their own to
the second template, and each carries one rule on top of the others. **An
external action stops at its first doubt**, and its answer is the log of what it
did; **a publication is prepared, not published**, because the gesture that
publishes it is yours. Both are added to a prompt file of your own as well, at
its end when it has no `{kind}` to put them in: a template written before the
types existed must not become the road by which a post goes out unread.

A fourth one publishes what a ticket already holds, once a human has validated
it, and its rule is the third of the family: **it publishes, it does not
produce.** What goes out is what was read and accepted, unimproved — a session
that rewrote it on the way would be publishing something nobody validated.

A fifth one resolves the conflicts of a pull request that was validated and
would no longer merge, and its rule is the one a person merging by hand forgets
first: **both sides survive.** What landed on the base in the meantime is
another ticket's validated work, and dropping it to make this one pass would be
merging a regression nobody asked for — so a conflict that cannot keep both is
a question, not a choice.

Each of them carries a `{language}` line, and it is empty on purpose whenever
nobody asked for one: every template already says which language to write in —
the ticket's, the message's — and a runner nobody configured must keep saying
exactly that. `runner.language` is what replaces that rule with a decision, and
`voice.Voice.instruction` is the sentence it becomes.
"""

from __future__ import annotations

from pathlib import Path

DEFAULT = """\
You are working through a ticket for the {project} project, alone and with \
nobody to talk to: no one can answer a question while the session runs.

# Ticket — {title}

{body}

{comments}{context}{brief}{agent}# Context

- Repository: {repo}
- You are in a dedicated git worktree, on branch `{branch}`, created from \
`{base}`. Your working copy is shared with no one.
{resumed}- Notion ticket: {url}

# What is expected

1. Read the repository before writing: its conventions, its CLAUDE.md or \
AGENTS.md if it has one, the neighbouring code. Your change must read like the rest.
2. Implement what is asked, and nothing more. No opportunistic refactoring, no \
fixing nearby bugs: those are other tickets.
3. Run whatever the repository offers to check itself — lint, tests, build — and \
fix what you break. A server or a watcher you start, you stop by its PID or its \
port (`kill <pid>`, `fuser -k 5199/tcp`), never with `pkill -f` or `pgrep -f`: \
a pattern matches every process whose command line holds it, not only yours.
4. Commit inside the worktree, with a clear message written in the language the \
repository already uses. **Do not push** and do not open a pull request: that is \
the runner's job.
5. If the request is too ambiguous to settle alone, or if the ticket does not \
match this repository, do not guess: commit nothing and explain what is missing.
{language}
End with a final line, exactly one of these two. It is read on a phone, as a \
notification, so it is one sentence of under 200 characters and it is cut where \
it stops being one:

RESULT: ok — <what you changed, in one sentence>
RESULT: blocked — <what is missing to decide>
"""


DOCUMENT = """\
You are handling a Notion ticket {scope}, alone and with nobody to talk to: no \
one can answer a question while the session runs.

There is no code repository here. What the ticket asks for is a document, and \
your answer will be written back into the Notion ticket itself.

# Ticket — {title}

{body}

{comments}{context}{brief}{agent}# Context

- Working directory: {repo} — empty and disposable, it is yours to use.
- Notion ticket: {url}
{kind}
# What is expected

1. Do the work properly before writing: read what the ticket points at, and \
search the web where the answer depends on facts you cannot know. Prefer \
primary sources.
2. Write the deliverable to a file named `ANSWER.md` in your working directory. \
That file is what gets published to the ticket, so it must stand on its own: no \
"as discussed above", no reference to this prompt.
3. Write it in the language the ticket is written in.
4. Markdown, and only what Notion renders: headings, bullet and numbered lists, \
checkboxes, quotes, code fences, links, bold and italic. No HTML, no tables.
5. **Match the shape of what is asked, not a default shape.** A procedure wants \
ordered steps with costs, durations and where each one happens. A short piece — \
a post, an email, a headline — wants the text itself, ready to copy, respecting \
the length its channel imposes; if a choice of angle matters, give two or three \
variants and say in one line what separates them. Do not wrap a two-line \
deliverable in five headings, and do not answer a research question with a slogan.
6. Where facts, prices, deadlines or official procedures are involved, verify \
them and cite the source. Say what could not be verified rather than filling \
the gap.
7. If the request is too ambiguous to answer usefully, do not pad: write no \
`ANSWER.md` and explain what is missing.
{language}
End with a final line, exactly one of these two. It is read on a phone, as a \
notification, so it is one sentence of under 200 characters and it is cut where \
it stops being one:

RESULT: ok — <what you produced, in one sentence>
RESULT: blocked — <what is missing to decide>
"""

DELIVERY = """\
A ticket {scope} has been validated: a human read what came back and said yes. \
What is left is to carry it out — to put it where it was meant to go.

**You are publishing, not producing.** What the ticket asked for already \
exists: it is in the page below, written by an earlier session and accepted \
since. Do not rewrite it, do not tighten it, do not decide it reads better \
slightly differently. What was validated is what goes out, word for word.

# Ticket — {title}

{body}

{comments}{context}{brief}{agent}# Context

- Working directory: {repo} — empty and disposable, it is yours to use.
- Notion ticket: {url}

# What is expected

1. Work out from the ticket what publishing it means here — posting it to an \
account, sending it, filing it, deploying it — and where. The ticket says; do \
not invent a destination it does not name.
2. Do it with the tools you actually have. If the account, the credential or \
the tool is not one of them, that is not something to work around: say what is \
missing and stop. Publishing something to the wrong place is worse than not \
publishing it.
3. Do it once. Check first whether it is already out there — a run that was \
interrupted may have got there — and if it is, say where rather than doing it \
again.
4. Nothing else. No file to fix, no adjacent improvement, no follow-up you \
thought of: those are other tickets.
{language}
End with a final line, exactly one of these two. It is read on a phone, as a \
notification, so it is one sentence of under 200 characters and it is cut where \
it stops being one:

RESULT: ok — <what you published and where, with the link if there is one>
RESULT: blocked — <what stopped you, or what is missing to do it>
"""


CONVERSATION = """\
Someone has written to you in the comments of a Notion ticket {scope}. You are \
answering them, here, in that thread.

**You are talking, not working.** Nothing you say changes anything, and neither \
do you: no file written, no command that modifies, no commit, no branch, no \
pull request. If what is being asked needs work doing, say what it would take \
and say that it belongs in a ticket — the person you are talking to is one \
click away from making one.

# The ticket you are talking about — {title}

{body}

{comments}{context}{brief}{agent}# Context

- {where}
- Notion ticket: {url}

{thread}# The message to answer

{message}

# What is expected

1. Answer that message, and nothing else. Read whatever you need in order to \
answer honestly — the repository, the ticket, what was said before — and say \
you do not know rather than inventing something plausible.
2. Write in the language the message is written in.
3. Write for a comment thread: a few sentences. No heading, no preamble, no \
sign-off, no restating of the question. Long enough to be true, short enough to \
read on a phone.
4. Plain text. A short list is fine, a name in backticks is fine; nothing that \
needs rendering to mean anything.
5. No RESULT line and no report — everything you write is posted as the reply, \
exactly as you write it.
{language}"""


FOLLOW_UP = """\
A new message in the same thread, on the same ticket. Same rules: you are \
talking, not working — answer it, change nothing, stay in its language, keep it \
to a comment.
{language}
{message}
"""


RESOLVE = """\
A pull request of the {project} project was validated — a human read it and \
said yes — but it no longer merges: `{base}` has moved since its branch left \
it, and the two now conflict. You are resolving that conflict, alone and with \
nobody to talk to: no one can answer a question while the session runs.

# Ticket — {title}

{body}

{comments}{context}{brief}{agent}# Context

- You are in a disposable worktree of {repo}, in the middle of \
`git rebase origin/{base}` of the branch `{branch}`: git stopped on the \
conflicts listed above. `git status` shows where it stands.
- Notion ticket: {url}

# What is expected

1. Resolve every conflict so that **both intentions survive**: the work of this \
ticket, and what landed on `{base}` in the meantime. Never drop the work of \
another ticket to make this one pass.
2. Lockfiles and generated files are regenerated, not merged by hand: take the \
version from `{base}`, then run what produces them again — `pnpm install`, \
`npm install`, the generator, the build that writes them. Changelogs and \
changesets keep every entry from both sides.
3. Carry the rebase to its end: `git add` what you resolved, then \
`GIT_EDITOR=true git rebase --continue`, as many times as git stops. Keep the \
branch's commits and their messages, and add nothing the conflict does not need.
4. Then run the project's checks — build, typecheck, lint, tests: whatever the \
repository defines, in its CLAUDE.md or AGENTS.md, its package.json, its \
Makefile, its CI workflow. If one fails because of the merge, fix it in a \
commit of its own and run it again, three attempts at most. A check that already \
fails on `origin/{base}` is not yours to fix: say so.
5. **Do not push**, do not merge, and do not touch `{base}`: the runner does the \
rest once you are done.
6. Stop rather than choose when a conflict is a decision: two behaviours that \
cannot both hold, code deleted on one side and changed on the other, a database \
schema or migration changed on both sides. Stop too when the checks still fail \
after your attempts. Leave the worktree as it is, and say what conflicts and \
which question it raises.
{language}
Before the final line, write a short report in Markdown for the person who \
validated the pull request: one line per file that conflicted, saying how it \
was resolved, then the checks you ran and what they said. No heading.

End with a final line, exactly one of these two. It is read on a phone, as a \
notification, so it is one sentence of under 200 characters and it is cut where \
it stops being one:

RESULT: ok — <what you resolved, in one sentence>
RESULT: blocked — <what conflicts, and the question it raises>
"""


# What a session is told when it is picked back up where an exhausted quota left
# it. Deliberately not the whole prompt again: this session has the ticket, the
# brief and the context already, and resending them would cost on every turn
# what they cost once. What it cannot know is that time has passed and that its
# own half-done work is on disk — so that is the whole of the message.
CARRY_ON = """\
The credit ran out while you were working on this ticket, and it is back. Same \
ticket, same rules, same working directory: carry on from where you stopped.

Look at what you had already done before writing anything — `git status` and \
`git log`, or the files you were editing — so that nothing is written twice. \
Then finish the ticket and end on the RESULT line the first message asked for.
{language}"""


# What an external action is told, on top of the document frame.
EXTERNAL = """\
# This ticket is an external action

It is carried out outside any repository — in the browser, with Claude in \
Chrome; in a DNS zone; in the settings of a third-party service. Three rules \
come on top of the others:

- **Stop at the first doubt.** An account you are not sure is the right one, a \
value the ticket does not give, a screen that does not look like what the ticket \
describes: write no `ANSWER.md`, and end on `RESULT: blocked` with the \
question. An action taken on a guess is one somebody has to undo by hand.
- Do what the ticket asks and nothing else — above all nothing irreversible it \
does not name.
- `ANSWER.md` is the log of what you did: every action, in order — where (the \
site, the account, the page), what you changed, with the value before and after \
when there is one, and what came back. End it with what you checked afterwards \
to be sure it took.
"""

# What a publication is told on its first pass. The second is DELIVERY, once a
# human has validated what this one prepared.
PREPARE = """\
# This ticket is a publication — prepare it, do not publish it

What it asks for goes out in public and cannot be taken back: a post, a \
deployment, a message sent. So it happens in two steps, and you are the first. \
A human reads what you prepare; only once they have validated it does a second \
session publish it, word for word.

- **Publish nothing.** No post, no send, no deployment, no scheduled \
publication — and no draft saved on the target service either.
- `ANSWER.md` holds everything the second session needs and nothing it would \
have to decide: the exact text, ready to go out; the visuals — described, or \
linked where they already are, since this working directory is deleted with \
you; the target — the account, the channel, the recipients; and the moment, if \
the ticket gives one.
- If the target is not clear from the ticket, say so in `ANSWER.md` rather than \
choosing one: that is the first thing the reader will check.
"""


def kind(kind: str, repository: object = "") -> str:
    """The section a type of ticket adds to the document frame, or nothing.

    `repository` is the project's, when it has one the ticket is not worked in:
    a text about a codebase still wants to read that codebase — it just does not
    get to change it.
    """
    section = {"external": EXTERNAL, "publication": PREPARE}.get(kind, "")
    if repository:
        section = (
            f"- The project's repository is at {repository}: read it if the ticket "
            "needs it, and change nothing in it.\n" + ("\n" + section if section else "")
        )
    return section


def build(
    template: str,
    *,
    project: str,
    title: str,
    body: str,
    repo: str,
    branch: str,
    base: str,
    url: str,
    brief: str = "",
    context: str = "",
    agent_name: str = "",
    agent_brief: str = "",
    comments: list[str] | None = None,
    resumed: str = "",
    language: str = "",
    kind: str = "",
) -> str:
    scope, frame, heading, role, discussion = _frames(
        project, context, brief, agent_name, agent_brief, comments
    )
    text = template.format(
        project=project or "no project",
        scope=scope,
        context=frame,
        brief=heading,
        agent=role,
        comments=discussion,
        language=_language(language),
        title=title,
        body=body.strip() or "(the ticket has no description: everything is in the title)",
        repo=repo,
        branch=branch,
        base=base,
        url=url,
        resumed=resumed,
        kind=f"\n{kind}" if kind else "",
    )
    if kind and "{kind}" not in template:
        # A prompt file of your own, older than the types: see the docstring.
        text = f"{text.rstrip()}\n\n{kind}"
    return text


def conversation(
    template: str,
    *,
    project: str,
    title: str,
    body: str,
    where: str,
    url: str,
    message: str,
    thread: list[str] | None = None,
    brief: str = "",
    context: str = "",
    agent_name: str = "",
    agent_brief: str = "",
    comments: list[str] | None = None,
    language: str = "",
) -> str:
    """The prompt that answers one comment.

    The same frames as a ticket, in the same order — who you are, the project,
    the role — because the thing answering is the same thing that does the work
    and should sound like it. What differs is what sits closest to the answer:
    the thread it is being written into.
    """
    scope, frame, heading, role, discussion = _frames(
        project, context, brief, agent_name, agent_brief, comments
    )
    # The thread is nearer than the page's discussion: it is the conversation
    # being had, where the rest is the ticket's history.
    said = ""
    if thread:
        said = (
            "# This thread so far\n\n"
            "Oldest first. “you” is what you said in it.\n\n"
            + "\n".join(f"- {line}" for line in thread)
            + "\n\n"
        )
    return template.format(
        project=project or "no project",
        scope=scope,
        context=frame,
        brief=heading,
        agent=role,
        comments=discussion,
        language=_language(language),
        thread=said,
        title=title,
        body=body.strip() or "(the ticket has no description: everything is in the title)",
        where=where,
        url=url,
        message=message.strip(),
    )


def follow_up(message: str, language: str = "") -> str:
    """The next turn of a conversation the session already has the frame for.

    Its own function rather than a `.format` at the call site, because the two
    things it fills in are the two things every other template here fills in the
    same way, and a follow-up that forgot the language would be a thread that
    answers in French once and in English from then on.
    """
    return FOLLOW_UP.format(message=message, language=_language(language))


def message_of(prompt_text: str) -> str:
    """The message a built conversation prompt is about to answer.

    A resumed session has the whole frame already; sending it again would cost
    the ticket's body and the project's brief on every turn and teach it
    nothing. What it has not seen is the last section.
    """
    marker = "# The message to answer\n\n"
    if marker in prompt_text:
        return prompt_text.split(marker, 1)[1].split("\n# What is expected", 1)[0].strip()
    return prompt_text.strip()


def carry_on(language: str = "") -> str:
    """The message that restarts a ticket's own session, quota permitting."""
    return CARRY_ON.format(language=_language(language))


def _language(instruction: str) -> str:
    """The language a session is asked to write in, as a paragraph of its own.

    Empty when nothing was configured, and empty means *exactly* nothing: the
    templates then read as they always did, and each one keeps the rule it
    already carried — the language of the ticket, of the message, of whoever is
    being answered. A runner nobody told anything is a runner that changed
    nothing.
    """
    instruction = instruction.strip()
    return f"\n{instruction}\n" if instruction else ""


def _frames(
    project: str,
    context: str,
    brief: str,
    agent_name: str,
    agent_brief: str,
    comments: list[str] | None,
) -> tuple[str, str, str, str, str]:
    """The blocks that surround a ticket, widest first. Shared by both prompts."""
    # A ticket may have no project at all: the sentence has to read either way.
    scope = f"for the {project} project" if project else "that belongs to no project"
    # Who the work is for: the workspace's context page, the same on every
    # ticket of every project. It matters most on a document ticket, where the
    # agent starts in an empty directory and has nothing else to go on.
    frame = f"# Who you are working for\n\n{context.strip()}\n\n" if context.strip() else ""
    # Standing instructions from the project page, if it has any. They come
    # before the `# Context` block so they read as the frame, not as an
    # afterthought — and after the page above, which frames them in turn.
    heading = f"# About {project}\n\n{brief.strip()}\n\n" if brief.strip() else ""
    # The role, narrower than the project and narrower than you: a project says
    # where the work happens, an agent says what craft it takes.
    role = ""
    if agent_brief.strip():
        role = f"# Your role — {agent_name}\n\n{agent_brief.strip()}\n\n"
    # What was said on the ticket sits with the ticket, not with the frames:
    # a question asked by a previous run and answered since is part of the ask.
    discussion = ""
    if comments:
        discussion = (
            "# What has already been said on this ticket\n\n"
            "Oldest first. An earlier run may have asked a question here and been "
            "answered since — that answer is part of what you are being asked.\n\n"
            + "\n".join(f"- {line}" for line in comments)
            + "\n\n"
        )
    return scope, frame, heading, role, discussion


def template(prompt_file: str, fallback: str = DEFAULT) -> str:
    if not prompt_file:
        return fallback
    path = Path(prompt_file).expanduser()
    if not path.exists():
        raise FileNotFoundError(f"prompt file not found: {path}")
    return path.read_text(encoding="utf-8")
