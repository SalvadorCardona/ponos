"""The configuration file, described well enough for a browser to draw it.

`config.toml` is the single source of truth and stays a file you can open in an
editor. What this module adds is a *description* of it — one entry per key, with
the label, the sentence of help and the type — so the console can offer the same
settings without a second idea of what a setting is.

Three rules hold the whole thing together.

- **The file's own words, not the loader's.** A field shows what the file says;
  the value the runner would use when the file says nothing is shown beside it,
  greyed, as a placeholder. That is the difference between "you chose thirty
  minutes" and "nobody said, so thirty minutes it is" — and it is why clearing a
  field *removes the line* rather than writing an empty one.
- **A secret is never sent to the browser.** A token goes out as "set, ending in
  …f3a2" and comes back only when you type a new one. Clearing one is a gesture
  of its own, so that an empty field can keep meaning "leave it alone".
- **Nothing the browser says is trusted.** Every value is checked here against
  the same rules the loader applies — the floors, the three merge methods, the
  three events — and the file itself is loaded before the save is allowed to
  stand. See `config.edit`.

Adding a setting to `config.py` and not here is caught by the test suite: a key
the console cannot reach is a key that quietly stops existing.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .. import config as config_module
from .. import voice
from ..config import CONFIDENCES, EVENTS, MERGE_METHODS, UPDATE_CHANNELS, Config
from ..store import CONFLICTS, MODES

# What Claude Code accepts, and what each of them means for a runner nobody is
# watching. `bypassPermissions` is the working default: a session that stops to
# ask permission at three in the morning is a session that times out.
PERMISSION_MODES = ("bypassPermissions", "acceptEdits", "default", "plan")

# The same four, said as what they let a session do. The file's own word stays
# in brackets: it is what somebody reading `config.toml` will find there.
PERMISSION_OPTIONS = (
    ("bypassPermissions", "Everything, without asking (bypassPermissions)"),
    ("acceptEdits", "Edit files, no commands (acceptEdits)"),
    ("default", "Ask each time (default)"),
    ("plan", "Read only (plan)"),
)


@dataclass(frozen=True)
class Field:
    """One key of one table, and everything the console needs to draw it."""

    table: str
    key: str
    kind: str  # text · secret · path · bool · int · choice · events
    label: str
    help: str = ""
    choices: tuple[str, ...] = ()
    minimum: int = 0
    # Zero is "no ceiling", which is what almost every number here wants: a
    # timeout or an interval is bounded by what you meant, not by the loader.
    maximum: int = 0
    # What has to happen for a change to count. Most of it is read again on the
    # next run and needs nothing; the exceptions say so rather than looking like
    # they worked.
    after: str = ""
    # A value of `choices` and the words it is shown in. The file keeps saying
    # `squash`; the page says what squash does to your history.
    options: tuple[tuple[str, str], ...] = ()
    # Folded under "advanced settings" until asked for. Not less true, only
    # less often needed: a field somebody setting up their first board has to
    # read past is a field that hides the three that matter.
    advanced: bool = False

    @property
    def name(self) -> str:
        return f"{self.table}.{self.key}"


@dataclass(frozen=True)
class Section:
    key: str
    title: str
    blurb: str
    fields: tuple[Field, ...] = ()
    # The sections that are not lists of known keys: `[projects]` and
    # `[github]` are mappings you add rows to, and the console draws them as
    # such. The name of the table is the name of the list `describe` sends.
    pairs: str = ""


def _naming(
    table: str, words: dict[str, tuple[str, str]], advanced: bool = False
) -> tuple[Field, ...]:
    """A field per key of one of the four naming tables.

    Generated from the defaults rather than listed again: a property the runner
    learns to read is a field the console offers the same day — under its key,
    until somebody gives it a label of its own here.
    """
    return tuple(
        Field(
            table=f"notion.{table}",
            key=key,
            kind="text",
            label=words.get(key, (key.replace("_", " "), ""))[0],
            help=words.get(key, ("", ""))[1],
            advanced=advanced,
        )
        for key in config_module.defaults(table)
    )


# The order is the order of need: what connects the runner to a board, what
# decides how a ticket is worked, what reaches you, and — last — the names a
# board that was not built by `init` may spell differently. A field moved from
# one section to another keeps its key: the section is the page's idea, the
# table is the file's.
SECTIONS: tuple[Section, ...] = (
    Section(
        key="notion",
        title="Notion connection",
        blurb=(
            "The Notion integration that reads and writes your board. `ticket-runner init "
            "<page-url>` fills all of this in for you: come here only to fix it by hand."
        ),
        fields=(
            Field(
                "notion", "token", "secret", "Integration token",
                "The secret starting with `ntn_`, from notion.so/profile/integrations. "
                "Share your workspace page with the integration too: a token alone sees "
                "nothing.",
            ),
            Field(
                "notion", "workspace", "text", "Workspace page",
                "The Notion page that holds the Tickets, Projects, Agents and Context "
                "databases. Paste its URL: only the identifier is kept.",
            ),
            Field(
                "notion", "mention", "text", "Word that asks for an answer",
                "Write it in a ticket's comment — `@claude what is blocking?` — and the "
                "runner answers in the thread instead of working. The integration's own "
                "name works too.",
            ),
            Field(
                "notion", "tickets_database", "text", "Tickets database (without a workspace page)",
                "Only if the workspace page is empty: the tickets database on its own, by "
                "URL or identifier.",
                advanced=True,
            ),
        ),
    ),
    Section(
        key="storage",
        title="Board storage",
        blurb=(
            "Where your tickets live: in Notion (the default), as Markdown files on this "
            "machine, or in both, kept in sync."
        ),
        fields=(
            Field(
                "storage", "mode", "choice", "Board kept in",
                "Markdown files need no Notion token and no network. Both writes to the two "
                "and reconciles them.",
                choices=MODES,
                options=(
                    ("notion", "Notion"),
                    ("markdown", "Markdown files"),
                    ("both", "Both, kept in sync"),
                ),
                after="the console has to be restarted",
            ),
            Field(
                "storage", "path", "path", "Markdown folder",
                "The folder holding `tickets/`, `projects/`, `agents/`, `schedules/` and "
                "`context.md`. You can put it under git.",
                after="the console has to be restarted",
            ),
            Field(
                "storage", "conflict", "choice", "When both sides changed",
                "A page edited in Notion and in the files since the last sync: the most "
                "recent edit wins, the other is kept in the sync journal.",
                choices=CONFLICTS,
                options=(("newest", "Keep the most recent"),),
                advanced=True,
            ),
            Field(
                "storage", "on_every_pass", "bool", "Sync before every check of the board",
                "Only for Both. Off: the two only sync when you run `ticket-runner sync`.",
                advanced=True,
            ),
        ),
    ),
    Section(
        key="runner",
        title="Running tickets",
        blurb=(
            "How often the board is checked, how many tickets run at once, and how long "
            "each one may take."
        ),
        fields=(
            Field(
                "runner", "workspace_root", "path", "Repositories folder",
                "Where your git repositories are, e.g. `~/workspace`. A project's repository "
                "is looked for here — and cloned here when it is missing.",
            ),
            Field(
                "runner", "interval_seconds", "int", "Check the board every (seconds)",
                "The delay between two looks for Ready tickets. 10 starts a ticket within "
                "ten seconds; a look that finds nothing costs one request.",
                minimum=1,
                after="`ticket-runner enable` writes it into the systemd timer",
            ),
            Field(
                "runner", "max_concurrent", "int", "Tickets in parallel",
                "How many Claude sessions run at the same time. Each is a full session: 2 "
                "suits a laptop.",
                minimum=1,
            ),
            Field(
                "runner", "timeout_minutes", "int", "Time limit per ticket (minutes)",
                "Past it, the session is stopped and the ticket fails, with the reason.",
                minimum=1,
            ),
            Field(
                "runner", "language", "choice", "Language of the reports",
                "What the runner writes on tickets and sends to your phone, and the language "
                "sessions are asked to answer in. Not set: reports in English, and each "
                "session answers in the ticket's language.",
                choices=voice.LANGUAGES,
                options=(("en", "English"), ("fr", "French")),
            ),
            Field(
                "runner", "app_language", "choice", "Language of the console",
                "The language the console opens in, until you pick one with the FR / EN "
                "select — that choice stays with the browser. Not set: the language of the "
                "reports, or else the browser's.",
                choices=voice.LANGUAGES,
                options=(("en", "English"), ("fr", "French")),
            ),
            Field(
                "runner", "dry_run", "bool", "Test mode (changes nothing)",
                "The runner says what it would do and does none of it: no branch, no commit, "
                "no write to the board. Useful while you set things up.",
            ),
            Field(
                "runner", "permission_mode", "choice", "What a session may do without asking",
                "Nobody is there to approve: anything but “Everything” leaves a session "
                "waiting until it times out.",
                choices=PERMISSION_MODES,
                options=PERMISSION_OPTIONS,
                advanced=True,
            ),
            Field(
                "runner", "log_retention_days", "int", "Keep session logs (days)",
                "How long each session's log stays on this machine. 0 keeps them forever.",
                advanced=True,
            ),
            Field(
                "runner", "clean_done_worktrees", "bool", "Clean up after done tickets",
                "Once a day, delete the working copies of tickets done for as many days as "
                "the logs are kept. A blocked or in-review ticket keeps its own.",
                advanced=True,
            ),
        ),
    ),
    Section(
        key="models",
        title="Models and usage",
        blurb=(
            "Which Claude model works the tickets, and how much of your subscription the "
            "runner may spend."
        ),
        fields=(
            Field(
                "runner", "model", "text", "Default model",
                "`opus`, `sonnet` or `haiku`, for instance. Empty: Claude Code's own default. "
                "A ticket's Model column wins over it.",
            ),
            Field(
                "runner", "wait_for_credits", "bool", "Pause when the subscription limit is reached",
                "On: the ticket waits, ticked Waiting for credit, and starts again when the "
                "usage window resets. Off: every ticket fails until then.",
            ),
            Field(
                "runner", "credit_reserve_percent", "int", "Share kept for your own use (%)",
                "At 5, no new ticket starts past 95 % of the session or weekly limit, so you "
                "still have Claude for yourself. Running tickets finish. From 0 (use it all) "
                "to 50.",
                minimum=0,
                maximum=config_module.MOST_RESERVED,
            ),
        ),
    ),
    Section(
        key="git",
        title="Repositories and pull requests",
        blurb=(
            "What a Code ticket turns into: a branch, a pull request, and the merge once "
            "you validate it."
        ),
        fields=(
            Field("runner", "open_pull_request", "bool", "Open a pull request",
                  "Once the session succeeds, on GitHub — needs `gh` installed and signed in. "
                  "Opening one merges nothing."),
            Field("runner", "push", "bool", "Push the branch",
                  "Send the ticket's branch to the remote once it has commits. Off: the work "
                  "stays on this machine."),
            Field("runner", "merge_method", "choice", "Merge a validated pull request as",
                  "Applied when you move a ticket to Validated.",
                  choices=MERGE_METHODS,
                  options=(
                      ("squash", "One commit (squash)"),
                      ("merge", "A merge commit (merge)"),
                      ("rebase", "Commits replayed (rebase)"),
                  )),
            Field("runner", "base_branch", "text", "Base branch",
                  "The branch a ticket's branch starts from, e.g. `main`. Empty: the "
                  "repository's default branch."),
            Field("runner", "resolve_conflicts", "bool", "Resolve merge conflicts automatically",
                  "When a validated pull request conflicts, a session resolves it, runs the "
                  "project's checks, then merges. A conflict that needs a decision blocks the "
                  "ticket with the question."),
            Field("runner", "branch_prefix", "text", "Branch name prefix",
                  "`ticket/` gives `ticket/1a2b3c4d-remove-the-header`.",
                  advanced=True),
            Field("runner", "fetch", "bool", "Fetch the remote before branching",
                  "So a ticket starts from the latest code rather than last week's.",
                  advanced=True),
            Field("runner", "rebase", "bool", "Rebase on the base branch before pushing",
                  "The base branch moves while a session works: the branch is replayed on top "
                  "of it before the push, and a merge refused for being behind is retried once.",
                  advanced=True),
            Field("runner", "resolve_conflicts_except", "text", "Projects whose conflicts are left to you",
                  "Project names, separated by commas. A conflict there blocks the ticket "
                  "instead of being resolved.",
                  advanced=True),
            Field("runner", "resolve_model", "text", "Model that resolves conflicts",
                  "Empty: the model the ticket was worked with.",
                  advanced=True),
            Field("runner", "checks_timeout_minutes", "int", "Wait for CI before merging (minutes)",
                  "After a resolved conflict, or with automatic validation. 0 does not wait — "
                  "GitHub still refuses a merge a required check has not passed.",
                  advanced=True),
            Field("runner", "keep_worktree_on_failure", "bool", "Keep a failed ticket's work folder",
                  "Its worktree stays as the session left it, for you to look at. "
                  "`ticket-runner clean --force` removes them.",
                  advanced=True),
        ),
    ),
    Section(
        key="projects",
        title="Project folders",
        blurb=(
            "Which folder on this machine holds a Notion project's repository. Only needed "
            "when it is not found on its own: a `path` or `github` property on the project "
            "page does the same, for every machine."
        ),
        pairs="projects",
    ),
    Section(
        key="github",
        title="GitHub accounts",
        blurb=(
            "Which `gh` account works for each GitHub owner, when this machine uses several "
            "— yours and a client's. Left, the owner as in the repository's URL; right, the "
            "account as `gh auth status` lists it. Sign each one in once with `gh auth "
            "login`. An owner not listed here is worked under the active account."
        ),
        pairs="github",
    ),
    Section(
        key="validation",
        title="Automatic validation",
        blurb=(
            "Skip your review for some types of ticket. Once the session succeeds, the "
            "runner does what moving the ticket to Validated would do, then moves it to "
            "Done, and its report says so. A failed, blocked or out-of-credit ticket is "
            "never validated. All off: every ticket waits for you."
        ),
        fields=(
            Field("runner", "force_validated_code", "bool", "Code tickets",
                  "The pull request is opened, its CI waited for, then merged. A merge GitHub "
                  "refuses leaves the ticket in review, with the reason."),
            Field("runner", "force_validated_publication", "bool", "Publication tickets",
                  "What was prepared is published straight away, without waiting for your "
                  "review."),
            Field("runner", "force_validated_writing", "bool", "Writing tickets",
                  "No effect today: a Writing ticket already ends in Done."),
            Field("runner", "force_validated_external", "bool", "External action tickets",
                  "No effect today: an External action ticket already ends in Done."),
        ),
    ),
    Section(
        key="types",
        title="Ticket types",
        blurb=(
            "A ticket's type decides how it is worked: Code (a repository and a pull "
            "request), Writing (the answer in the page), External action (in a browser or a "
            "service), Publication (prepared, then published once validated). An empty type "
            "is guessed before the ticket runs; a type you chose is never changed."
        ),
        fields=(
            Field("runner", "classify", "bool", "Guess the type when it is empty",
                  "A short session reads the ticket, writes the type in its column and the "
                  "reason in a comment. Off: a ticket without a type is worked as before, "
                  "from what its project holds."),
            Field("runner", "classify_confidence", "choice", "Least confidence to act on a guess",
                  "Below it, the ticket is blocked and asks you for its type. A doubt "
                  "involving Publication or External action always blocks.",
                  choices=CONFIDENCES,
                  options=(("low", "Low"), ("medium", "Medium"), ("high", "High"))),
            Field("runner", "classify_model", "text", "Model that guesses the type",
                  "A light one is enough, e.g. `haiku`. Empty: Claude Code's own default.",
                  advanced=True),
            *_naming(
                "types",
                {
                    "code": ("Name of the Code type", "As written in your Type column."),
                    "writing": ("Name of the Writing type", "As written in your Type column."),
                    "external": (
                        "Name of the External action type",
                        "As written in your Type column.",
                    ),
                    "publication": (
                        "Name of the Publication type",
                        "As written in your Type column.",
                    ),
                },
                advanced=True,
            ),
        ),
    ),
    Section(
        key="schedules",
        title="Recurring tickets",
        blurb=(
            "Tickets created on their own from the Schedules database — hourly, daily, "
            "weekly or monthly. After the machine was off, one occurrence is created, never "
            "every one it missed."
        ),
        fields=(
            Field("runner", "schedule", "bool", "Create recurring tickets",
                  "Off: the Schedules database is ignored, and none of its rows is touched."),
        ),
    ),
    Section(
        key="notify",
        title="Notifications",
        blurb=(
            "How the runner reaches you: this computer's screen, Telegram or Slack. A reply "
            "on Telegram or Slack becomes a comment on the ticket — which is what restarts "
            "a blocked one."
        ),
        fields=(
            Field("notify", "events", "events", "Send a message when a ticket is",
                  "Blocked: it asks you a question. Done: its work waits for your review. "
                  "Failed: there is a log to read.",
                  choices=EVENTS,
                  options=(("blocked", "Blocked"), ("failed", "Failed"), ("done", "Done"))),
            Field("notify", "desktop", "bool", "Notify on this computer's screen",
                  "A desktop notification when a ticket finishes."),
            Field("notify", "replies", "bool", "Read your replies",
                  "Your replies on Telegram or Slack become comments on the ticket. Off: "
                  "messages are sent, replies are ignored."),
            Field("notify.telegram", "token", "secret", "Telegram bot token",
                  "From @BotFather (/newbot). `ticket-runner notify --pair` then finds the "
                  "chat ID."),
            Field("notify.telegram", "chat", "text", "Telegram chat ID",
                  "Only this chat is read: anybody can write to a bot."),
            Field("notify.slack", "token", "secret", "Slack bot token",
                  "The `xoxb-…` one. Scopes: `chat:write`, and `channels:history` "
                  "(`groups:history`, `im:history`) to read your replies."),
            Field("notify.slack", "channel", "text", "Slack channel ID",
                  "In Slack, ··· → View channel details, at the bottom. Then `/invite "
                  "@your-bot` in the channel — the step everyone forgets."),
            Field("runner", "notify", "bool", "Desktop notification (older setting)",
                  "Kept for older files: “Notify on this computer's screen” follows it when "
                  "it is not set itself.",
                  advanced=True),
        ),
    ),
    Section(
        key="live",
        title="Live progress",
        blurb="What a ticket shows while its session is running, and where the session goes after.",
        fields=(
            Field("runner", "progress", "bool", "Show progress on the ticket",
                  "The session's steps are written on the ticket's page, the latest one in "
                  "its Progress column."),
            Field("runner", "attach_sessions", "bool", "File sessions under their project",
                  "A finished session is moved under the project's folder, so `claude "
                  "--resume` there finds it. Off: it can only be resumed by its ID."),
            Field("runner", "progress_interval_seconds", "int", "Update progress every (seconds)",
                  "10 reads as live. 5 at the least, so two tickets at once do not spend "
                  "Notion's rate limit on it.",
                  minimum=5,
                  advanced=True),
            Field("runner", "session_host", "text", "Machine the sessions run on (ssh)",
                  "Only when the runner lives on a server, e.g. `me@server.example.com`: the "
                  "ticket's Session link then opens the session over ssh.",
                  advanced=True),
        ),
    ),
    Section(
        key="replies",
        title="Answers in comments",
        blurb=(
            "Reply under one of the runner's reports, or name it, and it answers in the "
            "thread — having read the ticket and the repository, and changing nothing."
        ),
        fields=(
            Field("runner", "reply", "bool", "Answer comments",
                  "Off: comments get no answer. Answering a blocked ticket's question still "
                  "starts it again."),
            Field("runner", "reply_interval_seconds", "int", "Look for new comments every (seconds)",
                  "10 at the least.",
                  minimum=10,
                  advanced=True),
            Field("runner", "reply_scan", "int", "Tickets looked at each time",
                  "One request each; the next ones are looked at the time after.",
                  minimum=1,
                  advanced=True),
            Field("runner", "reply_timeout_minutes", "int", "Time limit per answer (minutes)",
                  "Somebody is waiting for it: keep it short.",
                  minimum=1,
                  advanced=True),
            Field("runner", "reply_permission_mode", "choice", "What an answer may do",
                  "“Read only” is the guardrail: an answer that quietly changed a repository "
                  "is the last thing anybody expects.",
                  choices=PERMISSION_MODES,
                  options=PERMISSION_OPTIONS,
                  advanced=True),
        ),
    ),
    Section(
        key="openrouter",
        title="OpenRouter (other models)",
        blurb=(
            "One key for every other AI provider — a GPT, images, transcription. Sessions "
            "get it as `OPENROUTER_API_KEY`, and this console dictates with it."
        ),
        fields=(
            Field(
                "openrouter", "key", "secret", "OpenRouter key",
                "Starts with `sk-or-`, from openrouter.ai/keys. On its own it is only handed "
                "to the sessions; nothing about the runner changes.",
            ),
            Field(
                "openrouter", "route_sessions", "bool", "Run the sessions through OpenRouter",
                "Claude Code then talks to OpenRouter instead of Anthropic: models are named "
                "the OpenRouter way (`openai/gpt-5`), the bill is OpenRouter's rather than "
                "your subscription's, and Claude in Chrome no longer loads.",
            ),
            Field(
                "openrouter", "transcription_model", "text", "Dictation model",
                "Turns a message dictated in the console into text.",
            ),
            Field(
                "openrouter", "base_url", "text", "API address",
                "Only for a gateway of your own that speaks the same API.",
                advanced=True,
            ),
        ),
    ),
    Section(
        key="web",
        title="Web console",
        blurb=(
            "The server behind this page. It can run code on this machine as you, so it "
            "only listens to this machine unless you set a token or a sign-in."
        ),
        fields=(
            Field("web", "host", "text", "Listen address",
                  "`127.0.0.1`: this machine only. Any other address needs a token, or an "
                  "email and a password, below. Safer still: an ssh tunnel, `ssh -L "
                  "8787:127.0.0.1:8787 <this machine>`.",
                  after="the console has to be restarted"),
            Field("web", "port", "int", "Port",
                  "The console is then at `http://127.0.0.1:<port>`.",
                  minimum=1,
                  after="the console has to be restarted"),
            Field("web", "token", "secret", "Console token",
                  "Empty: one is drawn once and kept in "
                  "`~/.local/state/ticket-runner/web/token`. Needed to listen beyond this "
                  "machine.",
                  after="the console has to be restarted, and this page reopened with the new token"),
            Field("web", "email", "text", "Sign-in email",
                  "With a password, the console asks for the two instead of the token. "
                  "`TICKET_RUNNER_WEB_EMAIL` wins over it.",
                  after="the console has to be restarted"),
            Field("web", "password", "secret", "Sign-in password",
                  "`TICKET_RUNNER_WEB_PASSWORD` wins over it. Changing it signs every browser "
                  "out; the token keeps working, for scripts.",
                  after="the console has to be restarted"),
            Field("web", "send_after_transcription", "bool", "Send a dictated message right away",
                  "Off: the transcription waits in the field, to be read over first. "
                  "Dictation needs the OpenRouter key."),
            Field("web", "poll_seconds", "int", "Refresh the board every (seconds)",
                  "Only while this page is open. 5 at the least.",
                  minimum=5,
                  advanced=True),
            Field("web", "chat_timeout_minutes", "int", "Time limit per discussion reply (minutes)",
                  "For the discussion with the workspace, in this console.",
                  minimum=1,
                  advanced=True),
            Field("web", "attachment_max_mb", "int", "Largest attached file (MB)",
                  "Per file sent in the discussion. A larger one is refused, with the reason.",
                  minimum=1,
                  advanced=True),
            Field("web", "attachment_days", "int", "Keep attached files (days)",
                  "Copies of what you sent in the discussion, deleted after this or with "
                  "“new conversation”.",
                  minimum=1,
                  advanced=True),
        ),
    ),
    Section(
        key="update",
        title="Updates",
        blurb="The runner can update itself between two checks of the board.",
        fields=(
            Field("runner", "auto_update", "bool", "Update automatically",
                  "Installs the newest version as soon as there is one."),
            Field("runner", "update_channel", "choice", "Follow",
                  "Releases are versions that were tested; the branch brings every change as "
                  "soon as it lands.",
                  choices=UPDATE_CHANNELS,
                  options=(
                      ("release", "Releases (vX.Y.Z tags)"),
                      ("main", "Every commit of the installed branch"),
                  )),
            Field("runner", "update_interval_seconds", "int", "Look for an update every (seconds)",
                  "3600 is an hour. 60 at the least.",
                  minimum=60,
                  advanced=True),
        ),
    ),
    Section(
        key="prompts",
        title="Custom instructions",
        blurb=(
            "The instructions each session is given, each replaceable by a file of your "
            "own. Empty: the built-in ones."
        ),
        fields=(
            Field("runner", "prompt_file", "path", "Instructions for a ticket with a repository",
                  "The path to a Markdown or text file."),
            Field("runner", "document_prompt_file", "path", "Instructions for a ticket without one",
                  "The path to a Markdown or text file."),
            Field("runner", "delivery_prompt_file", "path", "Instructions for publishing a validated ticket",
                  "The path to a Markdown or text file."),
        ),
    ),
    Section(
        key="status",
        title="Names of the board's columns",
        blurb=(
            "Change these only if your board's columns are named differently. Leaving "
            "Blocked empty while renaming Failed means one column for both."
        ),
        fields=_naming(
            "status",
            {
                "ready": ("Ready", "The tickets the runner picks up."),
                "running": ("In progress", "Where a ticket goes while it is worked on."),
                "review": ("In review", "Work done, waiting for your review."),
                "validated": ("Validated", "You accepted it: the runner merges, or publishes."),
                "done": ("Done", "Finished and closed."),
                "failed": ("Failed", "Something broke; a log says what."),
                "blocked": ("Blocked", "The runner asked you a question and is waiting."),
            },
        )
        + (
            Field(
                "notion.status", "draft", "text", "Drafts",
                "Optional: the option your board already has for tickets still being "
                "written. Never picked up. Empty: a draft has no status.",
            ),
        ),
    ),
    Section(
        key="properties",
        title="Names of the ticket properties",
        blurb=(
            "Change these only if your Notion properties are named differently. An optional "
            "one may be missing: what it would hold is simply not written."
        ),
        fields=_naming(
            "properties",
            {
                "status": ("Status", "Required."),
                "project": ("Project", "Relation to the Projects database."),
                "agent": ("Machine", "Written by the runner: which machine took the ticket."),
                "pull_request": ("Pull request", "Written by the runner when one is opened."),
                "session": ("Session", "Written by the runner: the link that reopens the session."),
                "model": ("Model", "This ticket's model, over the default one."),
                "priority": ("Priority", "Which Ready ticket goes first."),
                "cost": ("Cost", "Written by the runner, in dollars."),
                "duration": ("Duration", "Written by the runner, in minutes."),
                "progress": ("Progress", "Written by the runner: what the session is doing."),
                "due": ("Scheduled for", "A date here holds the ticket until then."),
                "waiting": ("Waiting for credit", "Ticked while the subscription limit is reached."),
                "role": ("Agent", "Relation to the Agents database: who handles the ticket."),
                "type": ("Type", "Code, Writing, External action or Publication; empty, it is guessed."),
                "cadence": ("Schedule: cadence", "Hourly, Daily, Weekly or Monthly."),
                "at": ("Schedule: time", "The hour, written 09:00."),
                "day": ("Schedule: day", "Monday… or 1 to 31."),
                "active": ("Schedule: active", "Unticked: paused, nothing deleted."),
                "next_run": ("Schedule: next run", "Written by the runner."),
                "last_run": ("Schedule: last run", "Written by the runner."),
                "last_ticket": (
                    "Schedule: last ticket",
                    "Written by the runner: what the last occurrence created.",
                ),
            },
        ),
    ),
    Section(
        key="pages",
        title="Names of the Notion databases",
        blurb=(
            "The titles the runner looks for under your workspace page. Only Tickets is "
            "required; the others change nothing by their absence."
        ),
        fields=_naming(
            "pages",
            {
                "tickets": ("Tickets database", "Required."),
                "projects": ("Projects database", "Where a ticket's repository is found."),
                "agents": ("Agents database", "The roles a ticket can be handled by."),
                "context": ("Context page", "Who the work is for, read by every session."),
                "schedules": ("Schedules database", "Recurring tickets; absent, nothing recurs."),
            },
        ),
    ),
)

FIELDS: dict[str, Field] = {
    entry.name: entry for section in SECTIONS for entry in section.fields
}


def _table(raw: dict, table: str) -> dict:
    """One `[a.b]` table of the parsed file, or an empty one."""
    node: object = raw
    for part in table.split("."):
        if not isinstance(node, dict):
            return {}
        node = node.get(part)
    return node if isinstance(node, dict) else {}


def _fallback(config: Config, entry: Field) -> object:
    """What the runner uses when the file says nothing about this key.

    Read off the loaded configuration rather than written down again, so the
    placeholder cannot drift from the default it claims to show.
    """
    if entry.table == "notion.status":
        return config_module.defaults("status").get(entry.key, "")
    if entry.table == "notion.properties":
        return config_module.defaults("properties")[entry.key]
    if entry.table == "notion.pages":
        return config_module.defaults("pages")[entry.key]
    if entry.table == "notion.types":
        return config_module.defaults("types")[entry.key]
    holder = {
        "notion": config.notion,
        "runner": config.runner,
        "notify": config.notify,
        "web": config.web,
        "openrouter": config.openrouter,
        "storage": config.storage,
    }.get(entry.table)
    if holder is None:  # a channel table: nothing is defaulted into it
        return ""
    value = getattr(holder, entry.key, "")
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, tuple):
        return list(value)
    return value


def _preview(secret: str) -> str:
    """Enough of a token to recognise it by, and not enough to use it.

    The example value `config.example.toml` ships with is no token at all: it
    is where one goes. Saying "set · ends …xxxx" about it told somebody with a
    fresh file that Notion was configured, which `doctor` would then deny.
    """
    secret = secret.strip()
    if not secret or secret == config_module.PLACEHOLDER or "xxxx" in secret:
        return ""
    return f"…{secret[-4:]}" if len(secret) > 8 else "set"


def describe(config: Config) -> dict:
    """Every setting, as the console draws it. No secret leaves in here."""
    raw = config_module.read_raw(config.path)
    sections = []
    # On a board kept in Markdown, Notion is a section about something this
    # installation never talks to: it goes last rather than first, where it
    # would be the first thing somebody fills in for nothing.
    ordered = SECTIONS
    if not config.storage.notion:
        ordered = tuple(item for item in SECTIONS if item.key != "notion") + tuple(
            item for item in SECTIONS if item.key == "notion"
        )
    for section in ordered:
        drawn = {
            "key": section.key,
            "title": section.title,
            "blurb": section.blurb,
            "pairs": section.pairs,
            "fields": [],
        }
        for entry in section.fields:
            stated = _table(raw, entry.table).get(entry.key)
            shown: dict = {
                "name": entry.name,
                "kind": entry.kind,
                "label": entry.label,
                "help": entry.help,
                "choices": list(entry.choices),
                "options": dict(entry.options),
                "advanced": entry.advanced,
                "fallback": _fallback(config, entry),
                "after": entry.after,
                "stated": stated is not None,
            }
            if entry.kind == "secret":
                # Not `_fallback`: for a secret that is the value itself, and
                # the placeholder would carry out the very thing it exists to
                # keep in. A token has no default worth showing anyway.
                shown["value"] = ""
                shown["fallback"] = ""
                shown["preview"] = _preview(str(stated or ""))
            elif entry.kind == "events":
                shown["value"] = [str(item) for item in stated] if isinstance(stated, list) else None
            elif entry.kind == "bool":
                shown["value"] = bool(stated) if stated is not None else None
            elif entry.kind == "int":
                shown["value"] = int(stated) if isinstance(stated, int) else None
            else:
                shown["value"] = str(stated) if stated is not None else ""
            drawn["fields"].append(shown)
        sections.append(drawn)

    problem = ""
    try:
        config.require_usable()
    except config_module.ConfigError as error:
        problem = str(error).splitlines()[0]

    return {
        "path": str(config.path),
        "usable": not problem,
        "problem": problem,
        "sections": sections,
        "projects": [
            {"name": name, "value": str(path)}
            for name, path in sorted(_table(raw, "projects").items())
        ],
        "github": [
            {"name": owner, "value": str(account)}
            for owner, account in sorted(_table(raw, "github").items())
        ],
    }


def _value(entry: Field, offered: object) -> object:
    """One value from the browser, as the file may hold it — or `None` to unset.

    Everything the loader would silently repair is refused here instead. A floor
    the loader raises quietly is a field that saves, comes back changed and
    tells nobody why.
    """
    if offered is None:
        return None
    if entry.kind == "bool":
        if not isinstance(offered, bool):
            raise ValueError(f"{entry.label}: yes or no")
        return offered
    if entry.kind == "int":
        if isinstance(offered, bool) or not isinstance(offered, (int, str)):
            raise ValueError(f"{entry.label}: a number")
        try:
            number = int(str(offered).strip())
        except ValueError:
            raise ValueError(f"{entry.label}: “{offered}” is not a number") from None
        if number < max(entry.minimum, 0):
            raise ValueError(f"{entry.label}: {entry.minimum} at the least")
        if entry.maximum and number > entry.maximum:
            raise ValueError(f"{entry.label}: {entry.maximum} at the most")
        return number
    if entry.kind == "events":
        if not isinstance(offered, list):
            raise ValueError(f"{entry.label}: a list")
        chosen = [str(item).strip().lower() for item in offered]
        unknown = [name for name in chosen if name not in EVENTS]
        if unknown:
            raise ValueError(f"{entry.label}: no such moment “{unknown[0]}”")
        # An empty list is a real answer — "tell me nothing" — so it is written
        # rather than removed, which would bring the three back.
        return sorted(set(chosen), key=EVENTS.index)
    text = str(offered).strip()
    if entry.kind == "choice":
        if text and text not in entry.choices:
            raise ValueError(f"{entry.label}: one of {', '.join(entry.choices)}")
    # Blank means "say nothing about it", which is how the default comes back.
    return text or None


def _pairs(raw: dict, table: str, offered: object) -> list[tuple[str, str, object]]:
    """One `name = value` table as the browser now has it, against what is there.

    The two the file holds: `[projects]`, a Notion name and a path, and
    `[github]`, an owner and the account it is worked under. Both are mappings
    you add rows to rather than lists of known keys, so both are saved by what
    the browser sends *in full* — a row that is no longer there is a line that
    goes away.
    """
    if not isinstance(offered, list):
        raise ValueError(f"{table}: a list of {{name, value}}")
    wanted: dict[str, str] = {}
    for row in offered:
        if not isinstance(row, dict):
            raise ValueError(f"{table}: a list of {{name, value}}")
        name = str(row.get("name", "")).strip()
        value = str(row.get("value", "")).strip()
        if not name and not value:
            continue  # a row somebody started and left
        if not name:
            raise ValueError(f"a {table} row set to {value} has no name")
        if not value:
            raise ValueError(f"“{name}” maps to nothing — fill it in, or remove the row")
        if name in wanted:
            raise ValueError(f"“{name}” is named twice")
        wanted[name] = value
    changes: list[tuple[str, str, object]] = [
        (table, name, None) for name in _table(raw, table) if name not in wanted
    ]
    changes += [(table, name, value) for name, value in wanted.items()]
    return changes


def save(config: Config, payload: dict) -> dict:
    """Apply what the console sent. Nothing, or all of it — see `config.edit`.

    Only the keys the browser actually names are touched: a field left alone is
    a line the file keeps, comment and all. That is also what makes a secret
    safe to leave blank — blank was never sent.
    """
    offered = payload.get("settings")
    if offered is not None and not isinstance(offered, dict):
        raise ValueError("settings: a table of name → value")

    changes: list[tuple[str, str, object]] = []
    touched: list[Field] = []
    for name, value in (offered or {}).items():
        entry = FIELDS.get(str(name))
        if entry is None:
            raise ValueError(f"no such setting: {name}")
        changes.append((entry.table, entry.key, _value(entry, value)))
        touched.append(entry)

    raw = config_module.read_raw(config.path)
    for table in ("projects", "github"):
        if table in payload:
            changes += _pairs(raw, table, payload[table])

    if not changes:
        return {"saved": [], "after": []}

    written = config_module.edit(config.path, changes)
    return {
        "saved": written,
        # Said once each, and only for what actually moved: a notice about a
        # restart you do not need is a notice you stop reading.
        "after": sorted(
            {entry.after for entry in touched if entry.after and entry.name in written}
        ),
    }
