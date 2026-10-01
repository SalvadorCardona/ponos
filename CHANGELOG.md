# Changelog

What changed, release by release, in words a user of the runner would use — not
in commit subjects. Every entry answers "what can I do today that I could not do
yesterday", and the ones that matter most are the ones that change a habit.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the versions follow [semantic versioning](https://semver.org/): the **minor**
number moves when the runner gains something, the **patch** number when it stops
getting something wrong, and the **major** number when an installation needs a
hand to keep working — a configuration key that changed name, a Notion property
that has to exist, a command that went away.

`Unreleased` is where work lands as it is merged. It becomes a version when
somebody cuts a release; see `.claude/skills/release/SKILL.md`.

## [Unreleased]

### Added

- **Keyboard shortcuts in the console.** **Ctrl+K** (⌘K on a Mac) opens a
  command palette from any page: the pages, the projects, the tickets on the
  board, and three actions — a new ticket, the console, a resynchronisation —
  found by typing and opened with Enter; Escape closes it. **Ctrl+J** (⌘J) opens
  and closes the console, with the cursor already in its message bar, and hands
  the focus back to where it was when it closes. Both work from inside a field;
  a magnifying glass in the bar opens the palette for the mouse, and its tooltip
  and the bubble's say the keys.
- **Ponos thinks, the steps fold, and a turn can be stopped.** In the console's
  conversation with the workspace, a turn in flight shows Ponos thinking and one line
  about what the session is on — *reading api.py…*, *running the tests…*, *fixing an
  error…* — with the time spent, still under `prefers-reduced-motion`. The Bash lines and
  the Tracebacks no longer fill the conversation: they are folded under *Show the steps*,
  closed by default, whose line keeps the count, the time, the cost and a red dot for the
  steps that failed. While it answers, the arrow of the bar becomes *Stop* (or Escape from
  an empty field): the session and every command it started are ended, the conversation
  says *stopped by you* with what had been done, and the next message carries on in the
  same session.
- **Force validated, one type of ticket at a time.** Four boxes in *Settings ›
  Automatic validation* — Code, Writing, External action, Publication — or
  `force_validated_<type> = true` under `[runner]`, all off by default. Ticked,
  a ticket of that type no longer waits in *In review*: once its session has
  succeeded, a Code ticket's pull request is opened, its CI waited for and
  merged with `merge_method`, and a Publication is published straight away —
  then *Done*, with *Validated automatically (Force validated: …)* in its
  report. A merge GitHub refuses leaves the ticket in review, with the reason in
  its report and on its card. A failed, blocked or out-of-credit ticket is never
  validated, and a ticket already in review is left alone. Writing and External
  action already end in *Done*: their boxes change nothing today.

- **The console updates Ponos in one click.** The day a newer version is
  waiting, the version at the top right turns into a button: it names the
  installed version and the new one, links the release notes, and asks before
  anything happens. The update then runs with every step shown — downloading,
  installing, restarting — and the page reconnects on its own to the new
  version. A ticket in flight is never cut: the update waits for it (*Update
  after the ticket*, and can be called off meanwhile), and no ticket starts in
  between. Opened from another machine, the dialog gives `ticket-runner update`
  to copy instead.

- **The console's message bar takes photos, videos, documents and your voice.**
  *Talking to your machine* is now one rounded bar with the files above the
  words, a **+** to attach, a microphone, and a round arrow to send. A
  screenshot is pasted, a file dropped anywhere on the drawer or picked with the
  **+** — images, videos (mp4, webm, mov) and documents (pdf, txt, md, csv,
  json, docx, xlsx), up to `web.attachment_max_mb` (25 MB) each — and the
  workspace reads them from where they are kept, under the runner's state: an
  image or a PDF as it is, a video through frames `ffmpeg` takes along it (and,
  without `ffmpeg`, it says it could not see the clip). The microphone records
  (Alt+Shift+M), has the recording transcribed by OpenRouter in the runner's
  language, and puts the text in the bar to be read over before it goes —
  `web.send_after_transcription` sends it straight away. Without an OpenRouter
  key it is greyed out and says so. Your files show as thumbnails above your
  message and open in full with a click; *new conversation*, now a pen at the
  top of the drawer, deletes them, and `web.attachment_days` (7) removes what a
  conversation nobody closed left behind. `>` still runs a command, now with
  the verbs offered as you type.

- **Every project has a picture in the console.** The cover and the icon of its
  Notion page are the project's thumbnail in the list and the banner of its page
  — or its initial on a colour of its own, when it has neither. *Change the
  image* uploads a file, takes a pasted address or an emoji, and the picture
  becomes the page's cover or icon in Notion; one changed in Notion shows in the
  console at the next reading. Pictures stay on screen for as long as the
  console is open — a copy is kept on disk, since Notion's own links expire
  within the hour — and a change Notion refuses is kept and sent again rather
  than lost. On a Markdown board, the picture is a file beside the project's.

- **The console and Notion, kept in step — and saying when they are not.** The
  console reads what changed since its last read, reaching two minutes back
  (Notion's `last_edited_time` is to the minute: four moves in one minute all
  read `09:32:00`), and the whole board every five minutes and on demand; what
  the full read finds the others missed is counted and shown. A move made from
  the console is queued on disk, checked against the page first, retried with
  a growing wait, confirmed by reading the page back, and the card says
  *waiting*, *not sent* or *changed in Notion meanwhile* until it is settled.
  The bar says when the board last agreed with Notion, and its button now
  resynchronises. Every change seen, confirmed or refused is written in
  `sync.jsonl`.

- **A statistics page in the console.** *Statistics* in the menu opens on the
  last month — or seven days, three months, two dates of your own — with the
  tickets open on the last evening, closed and created over the period, and
  what the sessions spent; under them, a point per day for what came in, what
  went out, the open stock and the running spend, and the period's new tickets
  by status and by project. A closing is dated by the runner's history when the
  runner made it, and by the page's last edit in Notion otherwise; the page
  says how many of each.

- **A validated pull request that conflicts is resolved, not left to you.**
  “Pull Request has merge conflicts” used to block the ticket. Now the runner
  asks GitHub first, replays the branch onto its base in a worktree of its own,
  and hands the conflict to a session told to keep both sides — the ticket's
  work and what was merged meanwhile — to regenerate lockfiles rather than merge
  them, and to run the project's checks. The result is pushed with
  `--force-with-lease`, the pull request's CI is waited for, and the merge is
  asked again; the pull request and the ticket both say which files conflicted
  and how each was resolved, and the session's cost is added to the ticket's.
  A conflict that is a decision, checks that stay red, commits somebody else
  pushed, or a base still moving after two replays block the ticket with the
  question, and the resolution reached so far is pushed on a branch of its own.
  `runner.resolve_conflicts`, `resolve_conflicts_except`, `resolve_model` and
  `checks_timeout_minutes` configure it. See the README, “Ten tickets on one
  repository”.
- **A running ticket is followed on the ticket, not on a page of sessions.**
  The console's *Live* page listed sessions by the id of their log, and nothing
  said which ticket `24f9704c` was. A ticket's page now has a *live* tab — the
  one a ticket in progress opens on — with its session's journal as it is
  written: what the agent says drawn as prose, each tool call folded to one
  line with the worktree's path shortened to `./`, the scroll following the end
  until you scroll up. A finished ticket shows its last session there,
  read-only. On the board, a card in progress pulses, counts its steps and says
  what it is on; the runner's figures — sessions, timer, tickets handled and
  their cost — are a strip over the columns. The *Live* page and its menu entry
  are gone, and its old address leads to the board.
- **A ticket has a type, and the runner works it out when you did not.** A new
  `Type` column — *Code*, *Writing*, *External action*, *Publication* — says
  which road a ticket takes. Left empty, a short session on a light model
  classifies the ticket before it runs, writes the type into the column and the
  reason into a comment; a type you chose is never overwritten. When the guess
  is unsure, or hesitates with *External action* or *Publication*, nothing runs:
  the ticket is blocked with the question. An external action works without a
  repository, stops at its first doubt and logs what it did; a publication is
  prepared into *In review* and published only once you move it to *Validated*.
  `ticket-runner init` adds the column; a board without it runs as before. See
  [The type of a ticket](README.md#the-type-of-a-ticket).

- **The console wears the robot too, and it shows what the runner is doing.**
  The mascot of the landing page is now the console's mark and favicon, and a
  face at the right of the bar that changes with the runner as it happens:
  asleep on an empty queue, thinking while a ticket is claimed, busy while a
  session types, jumping when a ticket comes back, upset when one is blocked or
  the connection drops. Every card of the board wears one in the mood of its
  column — only the ones in progress move, so a board of a hundred stays calm —
  and so do the session panels, the empty lists, the loading and error pages
  and the toasts. A seventh state, `waiting`, says a person has the next move.
  One file for both: the console bundles the landing page's own component.

- **ticket-runner has a face.** A small robot, on the landing page and in its
  favicon, whose mood follows a ticket: thinking when one is claimed, busy while
  Claude Code types, jumping when the pull request is open, sad when it is
  blocked, asleep when the queue is empty — and a bar to make it react. One SVG
  in layers, coloured by CSS variables, light and dark, still under
  `prefers-reduced-motion`; a new state is one entry in a table. See
  [Mascot](README.md#mascot).

- **The console sets itself up on the first connection, and nobody has to find a
  token again.** A token protects an installation that is already set up; a
  fresh one has nothing to protect yet, and being sent to look for a secret on
  disk before you may type your own was the wrong way round. So a console
  **nobody has claimed** — no `web.token` chosen, no email and password set —
  now serves a form rather than a door, and `http://127.0.0.1:8787` is the whole
  of the address. One press does the installation in the order somebody would
  say it: the email and password that open the console from then on, and which
  sign the browser in there and then rather than asking for what was typed a
  second ago; the Notion token and the link of the page you shared, under which
  the five databases are built by the very code `ticket-runner init` runs; the
  rules that reach every session before the project's brief and before the
  ticket; and a Telegram bot token, whose chat id is read back from the bot so
  there is nothing to look up. Everything but the first pair may be left for the
  Settings tab, and a step that fails is said in the report rather than undone —
  pages created in somebody's Notion are not a thing to roll back. That first
  pair is also what closes the page for good: the next request is asked to sign
  in. An unclaimed console is necessarily on loopback — `serve` refuses any
  other host without a token or a sign-in — so the first browser to arrive is
  somebody sitting at that machine; on a machine you share, set `web.token` or
  the sign-in before starting the console, and `serve` says which of the two
  states it is in. An installation that already works and has never had a
  password is unclaimed too: the same form, with the Notion half already done,
  at `/setup`.

- **A project is a page you open and change, in the layout that suits the
  question.** The console's Projects screen only ever read: a list of what this
  installation knows of, and a link out to Notion for anything you wanted to
  change. But a project is where every ticket of that project starts from — its
  repository, and the brief that gives an answer your voice rather than
  nobody's — so it is now a resource like the board. Click a project and you get
  its page: what it declares, how many tickets point at it, and the brief
  itself, drawn rather than shown. *Edit* opens the four fields the page holds —
  the name, the repository, the path on this machine, and the brief — and what
  is written goes to the column your page already carries, `Repository`,
  `github` or `repo`, rather than to a second one beside it. The list comes in
  **two layouts**, and the one you are on is in the address: *cards*, to
  recognise a project by its name and its shape, and *table*, to compare them —
  which of these eleven has no repository is a question a grid of cards will not
  answer. A project only `[projects]` names has no page to write to: it says so
  and points at the settings, where that line lives. The old `/?page=projects`
  still lands on the list, so a link you kept goes on working.

- **The runner stops before the subscription is spent, and leaves you a share of
  it.** A runner left to itself would chew through every window it is given, so
  the terminal you open yourself at five o'clock finds nothing left.
  `runner.credit_reserve_percent` is the share it refuses to touch — 5 by
  default, so nothing new is started past 95 % — read off the same two figures
  Claude Code's own `/usage` shows, the session window and the week, whichever
  is the more constraining. What is already running is never killed: it
  finishes, because stopping a session halfway spends what it has already cost
  and gets nothing for it. What costs no credit carries on throughout — a pull
  request you validated this morning is still merged this afternoon — and that
  is the whole difference between this line and a spent window, which stops the
  pass outright. The reading is taken again at every free place rather than once
  a pass, since the sessions in flight are what fills the window. `0` spends the
  lot, as before this existed; `50` is the most it accepts; and a reading nobody
  can take — no Claude Code store, a payload whose shape changed — is one
  warning and the old behaviour, never a runner that stopped working because it
  could not find a JSON key. The setting is a field of the console's Settings
  tab, under *The run*.

- **A ticket the credit ran out under is ticked, not moved to a column of its
  own.** *Blocked* is the column that means **you** are needed — the agent asked
  a question and is waiting for an answer — and letting "come back at six" into
  it made the one column anybody has to open stop saying anything. But an eighth
  column was the wrong answer to that: nothing *happened* to the ticket, and
  moving it says something did. So the tickets database gains a checkbox,
  **Waiting for credit**: the ticket stays exactly as ready — or as validated —
  as it was, ticked while the window is spent and unticked by the write that
  claims it. The pass that has credit again takes the ticked ones *before*
  anything else, because they are the ones already half done. It picks their
  session back up rather than beginning the ticket over — the conversation is
  sent one message saying the window rolled over and its own half-done work is
  still on disk, not the whole frame a second time, and a session Claude Code no
  longer has falls back to a fresh one. What was queued behind a spent session
  is ticked the same way rather than sitting in *Ready* looking like a runner
  gone quiet. Being a property and not a status option is also what makes it
  reach a board built before it: `ticket-runner init` adds it to an existing
  database, where an option on a real `status` can only be typed in by hand.
  Without it nothing breaks — the credit is waited out silently, as before.

- **Ten tickets on one repository stop making nine conflicts.** The base branch
  does not wait for a session: the first merge lands, and every session still
  running is opening a pull request against a `main` of an hour ago. The branch
  is now replayed onto its base between the commits and the push, so what opens
  is a pull request on top of what the repository holds *now* — and a rebase
  that hits a conflict changes nothing: the branch goes back as the session left
  it, the pull request opens all the same, and the conflict is written on the
  ticket instead of being discovered on GitHub. The same gesture answers a
  *validated* merge GitHub refuses for being behind: the branch is replayed,
  pushed with a lease on the very commit that was replayed, and the merge is
  asked once more before the ticket is called stuck. A refusal a rebase cannot
  answer — a check still red, a review still missing, a branch policy — is left
  exactly as it came. `runner.rebase = false` gives back the old behaviour.

- **A machine that answers to two GitHubs.** `gh` only ever has one account
  active, so a pull request on the other one used to be refused for reasons that
  read like a bug: a repository GitHub says does not exist, a merge nobody is
  allowed to make. A new `[github]` table says which owner is worked under which
  account — `"animalink" = "dev-animalink"` — and everything that leaves the
  machine about that repository, the clone, the push, the pull request, the
  merge, the question “has this been merged yet?”, goes out under it. Log each
  account in once with `gh auth login` and they stay signed in side by side; no
  token is written into the configuration, it is asked of `gh` when it is
  needed. An owner nobody names is worked under whichever account `gh` is signed
  in as, so one GitHub means nothing to configure — and a line naming an account
  `gh` does not know is not a ticket's problem: the command runs as the active
  account, and `ticket-runner doctor` says the line is dead. The table is a
  section of the console's Settings tab, *Your GitHub accounts*.

- **The runner can live without Notion: the board as Markdown files.** One line —
  `storage.mode = "markdown"` — and projects, the standing context, the schedules
  and the tickets are read and written as files, properties in a YAML
  frontmatter and the content as Markdown under it, in a directory you can put
  under git. Nothing reaches the network: no token to create, no page to share,
  no integration to grant capabilities to, and `ticket-runner doctor` stops
  asking Notion who you are. Everything after that is unchanged — the queue, the
  claim, the worktree, the session, the report, the discussion on a ticket — for
  the reason this was worth doing at all: the runner now talks to a board
  through one interface (`store.py`), and which board answered is decided in one
  place. `notion` stays the default and behaves exactly as it always has.

- **The console can see every project, rewrite the standing context, and write a
  schedule.** Three screens, and they are what makes a Markdown-only
  installation self-sufficient. *Projects* lists every project this installation
  knows of — the board's own and the ones only `[projects]` names — with what
  each declares and where it landed on this disk. *Context* shows the text that
  reaches every ticket before the ticket itself, as the agent gets it, and saves
  it: it replaces rather than appends, because a context is a value, not a
  history. *Schedules* is no longer read-only — a row opens into a form for the
  six columns a schedule is written in, never the three a pass writes back, and
  a new schedule is created unticked whatever the form said.

- **Notion and Markdown, kept in step.** `storage.mode = "both"` reconciles the
  two before every pass and writes to both in between, so a ticket claimed at
  14:02 is not still reading *Ready* in the files while a session works on it. A
  page changed on both sides since the last reconciliation is a conflict:
  `storage.conflict = "newest"` keeps the later edit and writes the other into
  `~/.local/state/ticket-runner/sync.jsonl` with both timestamps and the name of
  the side that won. Nothing is ever deleted — a page that disappeared on one
  side is journalled and left alone on the other — and a page that never existed
  on the other side is created there, which is what makes the switch work from a
  board that is already full. `ticket-runner sync` does it on demand,
  `ticket-runner sync --journal` says what past ones did.

- **A project created from its GitHub link alone is cloned, not refused.** Until
  now, a `Repository` property that matched none of the clones under
  `workspace_root` put the project back with "no repository could be found" —
  and the only way out was to go and `git clone` it yourself. Now the first
  ticket that needs it makes the clone: `gh repo clone` where `gh` is there, so
  a private repository comes down under the same authentication the pull
  requests go out under, plain `git clone` otherwise, into `workspace_root`
  under the repository's own name. The ticket then runs in it exactly as in one
  you had all along, and its comment says where the folder came from. Nothing
  else changed: every way of matching a clone you already have is still tried
  first, a remote two clones answer to is still a question rather than a third
  copy, and only the run about to work on a ticket downloads anything —
  `ticket-runner projects`, `ticket-runner next` and a dry run read the board
  and fetch nothing.

- **The console opens with an email and a password, not with a token.** Set
  `web.email` and `web.password` — in the configuration, in the *This console*
  section of the Settings tab, or in `TICKET_RUNNER_WEB_EMAIL` and
  `TICKET_RUNNER_WEB_PASSWORD` for a server where a secret has no business being
  written down, the environment winning over the file — and
  `http://127.0.0.1:8787` becomes a bookmark that works: the page asks for the
  two instead of for a token you had to find again on every browser. The cookie
  it leaves is derived from them rather than drawn, so a console that restarts
  does not sign you out, and changing the password signs out every browser at
  once. Setting the two also unlocks a non-loopback bind, exactly as a token
  does, and deserves the same suspicion — behind that port sits
  `bypassPermissions`, and a wrong answer costs a second on purpose. The token
  does not go away: it stays what a script carries, what `serve --print-token`
  prints, and what the dev server's proxy borrows. It just stops being what
  *you* carry.

- **The console speaks French, and asks nobody which.** It reads the browser first —
  `Accept-Language` is a setting somebody actually made — and where that says nothing
  useful the time zone answers for it: a machine on Europe/Paris opens in French. The
  select at the right of the bar, under the flag, is how you disagree with the guess, and
  the choice is kept in `localStorage` like the theme. It holds everywhere: the menu, the
  pills in the bar, a ticket's page, the discussion under it, and the settings tab down to
  the sentence under each of its seventy fields. What stays in its own language is what
  belongs to somebody else — a ticket's title and the columns of your board are Notion's,
  the output of `> status` is the CLI's, and a report a run wrote follows `runner.language`
  as it always did. English is unchanged: it is the language the console is written in, and
  a console nobody switches is the console it was.

- **An OpenRouter key, and every other model comes within reach.** `openrouter.key`
  in the configuration — or the *Every other model* section of the console's
  Settings tab, where it is a secret like any other — and every session the
  runner starts carries it as `OPENROUTER_API_KEY`. Nothing about the runner
  changes: the key is simply *there*, so a ticket can have a GPT write the copy,
  a model transcribe an audio file or another make the video, and pay for it,
  without the runner having to know what any of those are. The second switch,
  `openrouter.route_sessions = true`, runs the sessions themselves on it: Claude
  Code then talks to OpenRouter rather than to Anthropic, and every model named
  — a ticket's Model column, an agent's, `runner.model` — becomes an OpenRouter
  slug, `openai/gpt-5` or `anthropic/claude-sonnet-4.5`. Two things travel with
  that one, and the README says so where it is offered: the CLI is authenticated
  by a token instead of as you, so Claude in Chrome does not load, and the bill
  is OpenRouter's rather than the subscription's, so there is no window left for
  `runner.wait_for_credits` to wait for.

- **The runner waits for the credits instead of failing on them.** A Claude
  subscription is metered in windows, and a spent one used to cost a whole
  board: every ticket the runner touched came back as a failure with a log to
  read, and by the time the credits returned there was nobody left to put any of
  them back. Now a session that dies on the quota puts the ticket back where it
  was taken from — *ready* for work, *validated* for a publication, branch and
  worktree untouched — and nothing at all is started until the window rolls
  over. The wait lasts as long as Claude Code said it would, or a quarter of an
  hour when it did not say; `ticket-runner status` and the console's header both
  show how much of it is left. `runner.wait_for_credits = false` brings back the
  old behaviour, which is what an `ANTHROPIC_API_KEY` runner wants.

- `runner.language`, and the runner answers in it. `"fr"` — or `"FR"`, or
  `"fr-FR"`, or `"français"` — and every report under a ticket, every question a
  blocked one asks and every line that reaches Telegram or Slack comes back in
  French. The setting also travels into every prompt, so the summary at the top
  of a report, the document a ticket with no repository produces and the answers
  given in the comments follow it too; commit messages and code keep the
  language the repository already uses. Empty stays English *and* keeps meaning
  "nobody decided": each session goes on answering in the language of the ticket
  it was given, exactly as before.

- **A schedule's context is written from the console, and every Markdown field
  is an editor.** The page body of a schedule — the brief copied into every
  ticket it makes — was the one part of a row the console could not touch: the
  form wrote its columns, and the text meant opening Notion. It is the last
  field of that form now, read from a new `GET /api/schedules/<id>`. And the
  four places the console writes Markdown — that context, the standing
  context, a project's brief, a new ticket — are no longer a text area but
  [Milkdown](https://milkdown.dev)'s Crepe: `/` for a block, a handle to drag
  one, a bar over a selection, `#` and `-` turned into what they mean as they
  are typed. Markdown is its model rather than an export of it, so what reaches
  Notion or a Markdown board is the text that was typed. It is fetched the first
  time such a field opens, not with the console.

### Changed

- **A project's repository reads at a glance, and its brief has room.** On the
  Projects page, a card says its repository as `owner/repo` — a link to it on
  GitHub — rather than a clone URL cut after `https://github.c…`, and its
  folder by its last two parts (`…/workspace/opoil`), whole in the tooltip; the
  two facts sit one under the other so they line up. The table and a project's
  page say the repository the same way. The count at the top reads "14 of 17
  projects have a repository". The drawer a project opens in is 640px wide
  instead of 384px (still the whole screen on a phone), its first line wraps
  before the close button, and the example in "Where it is" is translated.
- **A ticket's page only says what the ticket has.** The grid under the
  status draws a fact when the ticket has a value for it: a board without a
  duration, due-date or agent column no longer shows "Took —", "Scheduled —",
  "Taken by —" on every ticket. How long a session took is read from its log
  when the board has no duration column, so a finished ticket says it. The
  priority is said once, in the grid, not again as a tag above it. The status
  reads as the board heads its column — its dot and its name with a capital —
  rather than as a coloured lower-case word that looked like a link. The header
  calls the ticket by its short id, `#a49e1a7b`, as the board does, with a
  button that copies the full one, and a long title takes a second line, its
  whole text on hover.
- **The site says what Ponos is, and that Notion is optional.** Under the
  headline, one line: a harness around Claude Code that runs your tasks on your
  machine — code, writing, actions, posts. A new *What it does* section shows the
  four kinds of task, an example ticket each, then the tickets that come back on
  their own, the console's chat with your machine and projects that are only a
  name and a brief. The console is presented as Ponos's own board, over a folder
  of Markdown files. Notion, GitHub, Telegram · Slack and OpenRouter each get a
  card in *Integrations*, all optional, and Notion's films and its `init`
  command live there now. The installation shows the board as Markdown files
  first: the installer still asks for a Notion token, and Enter skips it. The
  page's description, its Open Graph card, `llms.txt` and the top of the README
  say the same.

- **The settings say what they do.** Every label, every sentence under a field
  and every section of *Settings* was rewritten in plain words, English and
  French, with its unit: *Tickets in parallel*, *Time limit per ticket
  (minutes)*, *Share kept for your own use (%)*. The sections follow what you
  are trying to do — *Running tickets*, *Models and usage*, *Repositories and
  pull requests*, *Automatic validation*, *Notifications*, *Answers in
  comments*… — instead of where a key sits in the file: the models are no
  longer spread over four of them, and the old desktop switch moved to
  *Notifications*. A choice shows what each value does (*One commit (squash)*,
  *Read only (plan)*), the key a field writes is printed under it, and the
  settings few people need fold away behind *Show the advanced settings*. No key
  changed: `config.toml` reads as it did. Two sentences that said something
  false are gone — `attach_sessions` files a session under its project for
  `claude --resume`, it does not make a link, and the board's storage mode said
  it took effect once “restart”, untranslated.

- **Ponos dresses Greek.** The antenna and its bulb are a small orange flame
  set on his head, the `>_` on his chest and the pink cheeks are gone, and he
  wears an ivory tunic with a terracotta sash and a gold brooch — on the site,
  its header, the console, the README, the favicon and the Open Graph card. The
  flame does what the bulb did: it wavers at rest, pulses while he thinks,
  burns high and flickers while he works, bounces when a ticket comes back,
  droops red when one is blocked, and is down to an ember when he sleeps. Under
  40 pixels it is one fatter orange shape, so it still reads in a browser tab.
- **A click on a project opens its form.** In the console's list of projects —
  a card, or a name in the table — the form comes up at once in a drawer over
  the list, instead of the project's page and then its *Edit* button. Escape,
  the cross or a click beside it close it; *Save* closes it and the list says
  the new name without a reload; on a phone it takes the whole screen. The
  project's page stays, one link away at the top of the drawer and behind the
  button under each card: it is where the pictures are changed and the brief
  is read as it reads.

- **The console's top bar no longer has a Ponos at its right end.** It says the
  stream, the version and the sync with Notion, then the two buttons — nothing
  else. The runner's mood is still on the mark, Ponos beside his name, at the
  top of the menu (and in the bar, on a phone).

- **The top of the site says what Ponos is.** The line under the headline
  names Notion, where the ticket is written, Claude Code, which does it on
  your machine, and what comes back — a pull request or a text, merged or
  published on your word. Beside it, where Ponos stood alone, a small picture
  plays the loop: a ticket in Notion goes *Ready*, Ponos works it with a few
  lines of his log, and pull request #96 opens — held at its end when motion
  is unwelcome, and under the text on a phone. *See it in 60 seconds* is the
  main button, the install command comes after the buttons and shows whole,
  and the line below says what it needs: Claude Code, and Notion or a folder
  of Markdown files. The count of sessions is gone from the public page.

### Fixed

- **A session no longer kills itself with `pkill -f`.** The prompt went on
  `claude`'s command line, and it holds the ticket's page — the last run's
  trace included. A ticket that quoted `vite --port 5199` had its session run
  `pkill -f "vite --port 5199"`, match its own command line, and die with exit
  code 137; other sessions carrying the same words could go with it. The
  prompt now always reaches the session on its standard input, never as an
  argument, so `ps` shows nothing of a brief to the other users of the machine
  either. The instructions of a code ticket also ask to stop a server by its
  PID or its port (`fuser -k 5199/tcp`) rather than by a pattern.

- **A ticket opens at once.** Its page stayed empty two to five seconds while
  the console read the whole ticket from Notion — and read it two or three
  times per opening. The title, the column, the project and the cost are drawn
  straight from the board, and only the brief waits, read once per opening.
  The console also keeps a ticket's page while its `last_edited_time` holds:
  opening it again costs one Notion request instead of one per block, and a
  brief edited in Notion is read again at the next opening.
- **A red CI no longer blocks a ticket for what is not its fault.** Once a
  pull request's conflicts were resolved, the slightest red check sent the
  ticket to *Blocked* with nothing but “CI: red.” — a flaky end-to-end test or
  a `main` already red was enough, and every ticket merged at that moment
  stopped on it. The failed GitHub Actions jobs are now run again once before
  anything is concluded, and a check still red is compared with the newest
  commit of the base branch: red there too, it was inherited, and the pull
  request is merged all the same, its report saying which check and why. Only
  a check red here and not on the base still blocks — and the report names it.
  The same reading applies to a type whose validation is forced.
- **A tab closed mid-request no longer fills the console's journal.** Closing
  or reloading the console while it was answering left two Python tracebacks
  in `journalctl` each time — the broken pipe, then the 500 the console tried
  to write on the same closed connection — and they hid the real errors. A
  client that has gone is now let go in silence; a route that fails still
  answers 500 with its message.
- **A picture in a Notion brief shows on the ticket's page.** A capture
  pasted into a ticket came out on the console as a bracketed English sentence
  ending in an S3 address cut off its signature — a link that answered 403.
  The page now draws the picture with its caption, and a click opens it full
  size; a file or a PDF is a link that opens, and the console says it in its
  own language. What the session reads still names the file, by its caption
  or its name, without the dead address.
- **Tickets abandoned on a board without a Runner column come back.** The
  runner signs a ticket it claims in that column, and only put back the ones
  it had signed — so on a board without it, a ticket left *in progress* by a
  reboot or a crash stayed there for good. Without the column, every ticket
  in progress that no run is holding goes back to *Ready* (one machine per
  board, then); with it, nothing changes, and another machine's tickets are
  still left alone.

- **A missing column is said, not swallowed.** `ticket-runner doctor` checks
  every column the runner works with — the optional ones too — and counts as
  a problem each one that is missing or of the wrong type, with what it
  switches off; `ticket-runner init` adds them. And a run that writes to a
  column the board does not have says so once, instead of dropping the value
  without a word.

- **An update that does not start is taken back.** A version is started by a
  Python of its own before it is kept; if it fails to import, or its launcher
  and units cannot be written, the installation returns to the commit it
  replaced instead of leaving a runner that dies before its first ticket.

- **The version no longer shows ↑ for an update already installed.** The check
  was written before the update it announced and read for the hour after; the
  header now compares it with what is actually on disk.

- **Every page of the console scrolls again.** Since the console moved to the
  admin layout, a page taller than the screen — a ticket and its session log,
  the settings, a long board — stopped at its bottom edge: no wheel, no
  touchpad, no scroll bar, no Page Down. The page scrolls as a whole now, under
  a bar and a menu that stay where they are; a dialog still holds it still
  while it is open, and lets it go when it closes. `npm run test:e2e` in
  `frontend/` checks it in a browser.

- **Blocked tickets were missing from the console on a board where `failed` and
  `blocked` are one status.** The console drew one column for both, the first,
  and put the tickets in the second — three tickets blocked in Notion, none on
  the console. A status now lands in the first column that carries it.

- **A run no longer writes its verdict over a status you changed by hand.** The
  page is read again before a status is written; a ticket moved during the
  session keeps your column, the run says so in its log and in the journal, and
  the console marks the card.

- **The Markdown mirror no longer loses the second edit of a Notion minute.**
  Its stamps carry a fingerprint of the page's properties, not only an edit
  time Notion rounds to the minute.

- **The console no longer drags on a board with years of Done.** The Done
  column draws its thirty most recent tickets and a *Show more* button under
  them; its heading still counts every one. The projects page no longer reads
  the whole tickets database to count what each project holds — the console
  counts the tickets it already has — and the schedules page draws its rows
  without waiting for the list of projects. `node scripts/measure-console.mjs`
  times it on a board of 350 tickets.

- **What an audit found, closed.** A `ticket-runner://` link could hand ssh an
  option (`?host=-oProxyCommand=…`): the host and the session id are now checked
  and ssh gets the host after `--`. The console no longer offers `run`, `update`
  or `clean`, and a command that outlives its three minutes takes its whole
  process group with it. `clean --force` takes the run lock and never acts on a
  repository that does not list the directory as its worktree. The run lock is
  never deleted nor emptied before it is held; the state files are written
  whole; the console's token, the copies of the configuration, the session logs
  and the history are created private. Notion reads that time out are retried
  and end as a Notion error, a `429` waits what it is told, and a write that may
  have landed is never sent twice. A ticket that raises fails on its own instead
  of ending the pass, and a git command past its timeout is a failed command. A
  prompt too long for one argument reaches the session on stdin. And `serve`
  starts on a fresh installation, token or not, as its first connection promised.

- **Telegram and Slack can listen to named people only.** `allowed_users` in
  `[notify.telegram]` and `[notify.slack]`; empty keeps the old behaviour, and
  `ticket-runner doctor` warns about a group or a channel where anybody can
  answer — an answer can wake a ticket.

- **An update puts the console on the code it just installed.** A run is a
  process that ends, so the version that lands between two passes is the version
  the next pass runs. The console is not: it is started once and answers for
  weeks, with the Python it was given at boot — while serving the page off the
  disk, which the update has just replaced. The two drifted apart, and the
  browser is where it showed: a console up since the evening before drew the
  project list, and opening a project answered `no such route:
  /api/projects/<id>` — the page was the morning's, the server it asked was the
  day before's, and all the page said was that the project could not be read. An
  update now restarts the console onto the code it installed, and never starts
  one somebody had stopped.

- **A project that cannot be read says what the server answered.** The page had
  one sentence for every failure, which made a route that had moved and a
  project that is gone look the same. What the server said is under it now, in
  its own words.

- **A ticket's page says how long the run took, and which machine took it.** The
  runner has always written both back to the board, and the console drew
  neither: a ticket home from a session said what it had cost and never how long
  it had taken, and a board two machines share never said which of them had the
  ticket in hand. Both are on the page now, beside the spend, and the *took*
  column is in the table layout of the board — where it is read in words rather
  than in minutes: `23 min`, `1 h 02`.

- **A board that is not Notion's stops offering links to Notion.** On a Markdown
  board a ticket's page is a file on this disk, and every card carried an
  outward link pointing at it with `file://` — an address a browser declines to
  follow from a console served over HTTP, without saying so. The link is offered
  where it leads somewhere, as a project's already was. The board no longer
  opens on "Notion holds the board" either, the live pane no longer says there
  is "no Notion in the way", and a form that saves says *Written* rather than
  *Written to Notion* — the same toast answers a project written to Notion, a
  project written to a file, and a setting written to `config.toml`.

- **A row of the board's table layout opens its ticket.** The table drew eight
  columns and offered no way into any of them: a ticket picked out there had to
  be found again on the cards. Every row now has the same *open* the projects
  have.

- **The board comes back in the layout you left it in.** What was fixed for the
  projects was true of the board too — the *table* you switched to was gone on
  the next reload and gone again on the way back from a ticket. It is in the
  address now, and the links back to the board carry it.

- **A pane stops printing where you are twice.** The bar above every pane says
  the path; Live, Schedules, Context and Settings each said it again on the line
  under it.

- **A ticket's discussion opens at its first comment.** Three comments opened
  with the first one cut in half and a screen of nothing under the last: what
  you had written was pinned to the top of the scroller, which is what a live
  conversation wants and not what a discussion read oldest-first is.

- **A brief written by hand reads as prose.** A paragraph wrapped over three
  lines — which is what a Markdown board holds, and what anybody typing into a
  ticket writes — was drawn as three paragraphs with a gap between each. Lines
  under one another are one paragraph again; a blank line is what ends one.

- **An empty board says so, in the language the console is in.** It said "No
  results yet — nothing matched your search", in English, on a page where nobody
  had searched for anything.

- **A date on the board is a date.** A ticket scheduled for a day showed
  `2026-09-19T00:00+02:00` on its card, on its page and in the table, beside an
  "il y a 7 h" written like a human. It now reads `19 sept. 2026`, and a
  scheduled hour is kept where there is one.

- **A link to a pane opened with the console's token lands on that pane.** The
  token is moved out of the address and into a cookie as soon as it arrives, so
  it does not sit in the history and in every screenshot — but everything beside
  it went with it, and `/?token=…&view=console/projects/list` opened on the
  board. What was carried is now carried back, the token excepted: a link to the
  projects, to a ticket, to one section of the settings is a link you can send
  to yourself with the token on it.

- **The projects come back in the layout you left them in.** The two layouts of
  the Projects screen — cards and table — moved on screen and nowhere else: a
  reload, or the way back from a project, put you on the cards whichever one you
  had picked. The layout is in the address now, and the links back to the list
  carry it.

- **The brief of a project stops asking for a message.** The empty box under
  *The brief* offered “Votre message…”, which is what a chat box says and not
  what the field is: a page of standing instructions every ticket of that
  project is told before it is told the ticket. The repository and the path on
  this machine are cut to the width of a card rather than shown whole, and are
  now readable in full by resting on them.

- **A project on a Markdown board no longer offers a link to Notion.** Its page
  is a file on this disk, and the page's outward link pointed at it with
  `file://` — an address a browser declines to follow from a console served over
  HTTP, without saying so. The link is offered where it leads somewhere.

- **A branch is replayed on a machine that has no git identity of its own.** A
  rebase writes commits, and git refuses to write one where it cannot tell who
  is writing — a CI runner, a container, a server nobody ever configured. The
  replay failed there on that, the failure read as the branch refusing to move,
  and the ticket landed in Blocked saying the pull request would not merge:
  true, and not the reason. The runner now lends git an identity where it finds
  none, and leaves alone the machine that has one — the replay of your own
  branch is still committed under your name.

### Changed

- **The product is called Ponos.** The robot gave it his name: the site, the
  README, the console's sidebar and tab, the messages on Telegram and Slack,
  the desktop notifications and the words `ticket-runner doctor` and the
  welcome screen print all say Ponos, and the site opens on a one-minute video
  of a ticket going from *Ready* to *Done*. Nothing to change on your side:
  the command, the Python package, the repository, the configuration and state
  paths, the `TICKET_RUNNER_*` variables, the systemd units and the
  `ticket-runner://` links keep the name they were installed under.
- **The robot has a name — Ponos — and the site looks like the console.**
  Ponos, after the Greek god of toil, is the one who does the tedious part:
  the console says so when you hover him (*Ponos is taking a ticket*, *Ponos
  prend un ticket*), and the site opens on him and on one promise — *Write the
  ticket. It comes back done.* The site now tells the loop in six sections
  instead of seventeen, and everything it used to explain lives in the README,
  which opens the same way. It takes its colours, faces and radius from the
  console's own tokens, in light and in dark, with a switch; the command, the
  package and the repository keep the name ticket-runner.

- **The robot is cuter, and still reads at 24 pixels.** A big round head on a
  small round body, stubby arms and legs, big eyes with lights in them, pink
  cheeks and a mouth; softer colours, with a gloss and a soft shadow. Every
  state has its face — a pout and a tear when a ticket is blocked, a snoring
  mouth asleep, an open smile on a hop that squashes when it lands. Under 40
  pixels — a card, a toast, the bar, the favicon — it is only its face, drawn
  larger. `--robot-cheek` and `--robot-glint` join the colour variables; see
  [Mascot](README.md#mascot).
- **The console is drawn in react-resource-view's admin layout.** The menu, the
  bar and the page's heading are the package's own now, around the same pages:
  the board, a ticket, *Live*, the projects, the schedules, the context and the
  settings. On a phone the menu runs along the bottom edge. The stream's dot,
  the version, *Refresh* and the light moved from the foot of the menu to the
  end of the bar; the menu no longer folds to a rail of icons. The old
  `/?page=live` and `/?page=context` addresses still land where they did, and
  the board follows the stream again without a reload — a card moved from
  another tab or from Notion now moves on the one you are looking at.

- **An installation updates to releases, not to every commit of `main`.** The
  runner followed the branch it was installed from, so anything merged into
  `main` was running everywhere within the hour, before anybody had called it a
  version. It now follows the newest `vX.Y.Z` tag, updates nothing while there
  is none — and says so in the journal — and never takes an installation that is
  already ahead of the tag back to it. `runner.update_channel = "main"` keeps the
  old behaviour; `ticket-runner doctor` says which one is followed.

- **The bar says where you are, and the discussion opens from a bubble.** The
  top of every page carried a row of pills — the timer and its interval, a run
  in flight, how many tickets had been handled and for how many dollars, a
  version waiting — and the language the console reads in. All of it was true
  and none of it was worth the room: a state you cannot act on, repeated over
  every page, is noise with a border around it. The bar is now the path and
  nothing else. What a run is doing is what *Live* is for; the version, and the
  day a newer one is waiting, sit at the foot of the menu beside the stream's
  own dot; and the language moved to *Settings → This console*, which is where
  somebody looking for a setting looks — it is still this browser's alone and
  never reaches `config.toml`. The conversation moved with it: instead of a
  second column taking half the screen whether or not there was anything in it,
  an entry in the menu to reach it on a phone and a switch in the bar to fold
  it away, there is **a bubble in the bottom corner** that opens a drawer over
  the page — the ticket's discussion when a ticket is open, the workspace's own
  everywhere else. The page keeps its full width until you ask for it.

- **Schedules is a list and a calendar, and a row is turned off from the list
  itself.** The page was drawn by hand — its own cards, its own form, its own
  way of writing "in 6 days" — on a console whose board, projects and settings
  are all drawn by the view package. It is now a resource like them, in the two
  layouts that page actually wants. *Table* compares them, and `Active` is the
  one cell you can type in: **unticking a row in the list stops it**, with no
  form to open and nothing deleted, which is the gesture this whole feature was
  built around. *Calendar* answers the only question a schedule really has —
  when the next one lands — by laying the occurrences out over a day, a week or
  a month, in your language and starting the week where your language does;
  clicking one says what it will make. *New schedule* and the pencil on a row
  write the six columns a schedule is written in, and still never `Next`,
  `Last` or the ticket the last occurrence made: those are what a pass writes
  back. `/?page=schedules` keeps working and lands on the list.

- **The menu is a name and a count.** Each of the seven entries carried a
  sentence under its name — how many tickets were ready, how many turns the
  conversation had, whether the timer was on — so a menu of seven addresses was
  fourteen lines to read, saying in the smaller type what each page says at the
  top of itself. An entry is now its name, and a number beside it where
  something is waiting there: the tickets on the board, the sessions writing
  right now. The timer is on the *Live* page, which is the page about what the
  runner is doing.

- **The settings are a page per section, and a link you can send.** The Settings
  tab was one column of collapsibles that drew all seventy fields at once, open
  or folded, and redrew every one of them at every keystroke. `config.toml` is
  now a resource with a single record, and each section of the file is a
  sub-page of it: the tab you are on is in the address, so
  `/?view=console/settings/read/config/notify` is a link to the notification
  settings that opens where you left it. Only the section you are looking at is
  drawn; what you typed in one you left is kept and given back when you come
  back to it. The tabs are built from what the server says the file holds, so a
  section the runner gains is a sub-page the day it is described. `[projects]`
  and `[github]` — the two mappings you add rows to rather than fields you fill
  — are tables of their own under that page, with the "add" dialog and the
  confirmation before a row goes, which retires the one hand-rolled table of
  inputs the console still had.

- **What a session says in the console is read, not parsed.** Both transcripts —
  the workspace's and a ticket's — showed a message exactly as it was written,
  so an answer arrived as its own source: `##` in front of the headings,
  asterisks around the emphasised words, a fence around the command it wanted
  you to run. They now draw the markdown they are handed: headings, lists
  nested as deep as they were written, the boxes a checklist ticks, quotes,
  fenced code, and a word behind a link. The surface it is said on is
  shadcn/ui's own chat bubble rather than one this console styled by hand, so a
  problem still reads red, the workspace still reads as a card, and your own
  turns still carry the accent. A ticket's page, which was already drawn this
  way, gains the same additions.

- **A report is a notification now, and it is three lines long.** The comment
  the runner writes under a ticket *is* what Notion pushes to your phone, cut
  after two or three lines — and it used to spend its first forty-four
  characters on `ticket-runner@salva-Inspiron-16-Plus-7620 — ` and the five
  after that on `done.`, so the notification stopped roughly where the
  information began. It now opens on a mark and a verdict that says what is
  expected of you — **To review**, **To read**, **Stuck**, **Failed**,
  **Waiting**, **Merged**, **Published** — followed by the figures that place
  it: `✅ To review — PR #12 · 3 commits · 18 minutes · $1.20`. Under it, one
  sentence, cut at two hundred characters whatever the session wrote, and the
  link on its own line. A blocked ticket puts the **question** on that first
  line, because that is the thing to read. Nothing is lost: which machine ran
  it was always in the board's *Runner* column, the session is a click in its
  *Session* column, and the command that resumes it — with the log path and the
  worktree kept — is folded into the block the run already writes its steps
  into, which on a failed run is renamed `⚠️ Trace` and is the only place it
  appears. On a run that went right it appears nowhere, because nobody has ever
  needed to resume a session that finished. The desktop notification and the
  Telegram or Slack message now say the same words as the comment rather than
  words of their own, and the folded block's title follows `runner.language`
  like everything else. Two things the runner used to recognise itself by the
  signature — a ticket that wakes on your answer, and the console's
  reading of a discussion — read the mark instead, and the reports already on
  your board keep being recognised by their old signature.
- **A pass fills its free places as they free, instead of running a batch and
  waiting.** `max_concurrent` used to be the size of the first handful: the
  tickets that happened to be ready at the pass's first second were prepared,
  and the pass then waited for every one of them before ending — so a ticket
  made ready at 14:10 waited for the two-hour session that started at 14:04,
  and for the timer after it, however many places were sitting empty. Measured
  on a real board: a pass with two tickets, one done in minutes and one still
  running twenty minutes later, while four tickets reached the ready column and
  not one agent was started. `max_concurrent` is now a number of **places**: a
  session that ends frees one, the board is read again on the spot, and the
  ticket that goes in is whichever is top of the queue *then* — same priority,
  date and age order as at the start. The pass ends when nothing is ready and
  nothing is in flight, and each ticket is written into `ticket-runner history`
  as it finishes rather than at the end. Nothing changed about the run lock or
  the timer: it is the pass that became continuous, not the number of runs. Two
  consequences worth knowing — `ticket-runner run --limit 3` means three
  tickets for that pass, not three at a time; and a comment *addressed* to the
  runner during a long pass is still answered by the next pass, because
  answering starts a session of its own, while an answer to a blocked ticket —
  typed in Notion, Telegram or Slack — is picked up by the pass itself at the
  next freed place.
- **A place nothing ever took is filled too, and that is what makes
  `max_concurrent = 2` mean two.** Filling a place when a session *ended* left
  the ordinary case out: tickets arrive one at a time, so the first one starts,
  the second place stays empty, and the pass then had nothing to do but wait for
  the session in flight before reading the board again. Nobody else could read
  it either — the run lock is the pass's until it ends, and the timer that fires
  every interval meets it and leaves — so one ticket in progress meant one
  ticket at a time, however many places you had allowed. A pass now looks at the
  board for as long as it holds an empty place, every `interval_seconds`: the
  same cadence the timer reads it on, so a board watched every ten seconds
  starts a second ticket within ten seconds of it being made ready, and one
  watched every half hour behaves exactly as if the runner had been idle.
  Nothing else moved — a full pool still asks the ready column for nothing and
  costs it not one extra request, `--limit` still caps the pass and not the
  width, and a spent subscription still stops the pass from starting anything at
  all.
- **A ticket you validate is carried out at once, and not when the sessions in
  flight are over.** The *Validated* column was settled at the top of a pass and
  never looked at again, so everything accepted while the pass ran waited for
  it: a pull request validated at 14:20 was merged when the two-hour session
  started at 14:04 ended — and on a board where something is nearly always in
  progress, that is a column of finished work standing still behind work that
  has nothing to do with it. A pass now reads that column for as long as it
  lasts, every `interval_seconds`, **whether or not a place is free**: a merge
  costs no place at all — two `gh` calls in the pass's own thread — so it
  happens at 14:20 even with every session running, and a publication, which is
  a session, takes the next place that frees, ahead of the ready column. What is
  in progress goes on being in progress: nothing is interrupted, no session is
  started beyond `max_concurrent`, and a validated ticket taken by the pass is
  held out of the next reading so that nothing is ever published twice.
  `--limit` counts tickets off the ready column and has never counted these.
- The web console has been redrawn. Every page opens the same way — where you
  are, said as a path; a heading you can read from across the room; and the one
  line that says what the page is for — and the accent is a lime, so the button
  worth pressing is the only thing on the screen wearing it. A ticket's card
  says its id and its age before it says anything else, and states its project
  and its cost along the bottom; a ticket's page states its metadata as a ruled
  grid instead of a row of pills. Sessions open on the three numbers you came
  for: how many are writing, how often the timer comes round, what has been
  spent.
- Forms read as forms. Every field the console draws — its own on the settings
  tab, and the ones react-data-form builds for a new ticket — sits in a filled
  box with its label against it and its explanation under it. The settings tab
  gains a list of its sections down the left, which says what the file holds,
  which parts are open, and how many of your unsaved changes are hiding in a
  part you folded away; a field you have touched says so.
- Reports read like sentences rather than like a row of fields. What used to be
  `Branch \`x\` · 3 commit(s) · <url>` followed by three lines of session
  machinery is now “3 commits on \`x\`, and the pull request is waiting to be
  read: <url>”, a line saying what the run took and cost, and the resume command
  last — where you look on the rare day something went wrong, rather than first.
  Durations are rounded to the minute, prices to the cent.
- The web console's board is now the board: the columns your Notion board has,
  under its own names, and a card dragged into one moves the ticket. The
  *table* tab shows the same tickets as rows. A new ticket is written in a form
  over the board rather than in a strip above it.
- A card opens a page of its own — the brief, the report a run appended, the
  notes in between, read from the Notion page — with the ticket's terminal
  beside it, in place of the workspace console. The *Ticket* entry of the menu
  is gone: the page is where the card takes you, and it has an address
  (`/?view=console/tickets/read/<id>`) a reload or a link comes back to. Every
  page does — `/?page=live`, `/?page=settings`.
- The board, the ticket page and the form are one declaration for
  [react-resource-view](https://github.com/SalvadorCardona/react-resource-view)
  and [react-data-form](https://github.com/SalvadorCardona/react-data-form);
  the two transcripts are shadcn's `message` and `message-scroller`. A switch at
  the right of the header folds the second column away, for a board that wants
  the width.
- The board opens on one heading instead of two, and a new ticket is written in
  a panel. react-resource-view 0.7.0 draws a list's header itself — the board's
  icon, its name and the line that says what it is for, with the *board* and
  *table* switch and **New ticket** on the same row — so the console has given
  up writing its own above it. The form for a new ticket slides in from the
  right of the screen, and up from the bottom on a phone, rather than landing in
  a dialog in the middle of it: a brief is written at full height with the board
  still there behind it, and the panel closes itself once the ticket is written.
- `doctor` says how the console is opened. “We set up a sign-in and the page
  still asks for a token” had no answer anywhere but in the configuration file:
  the sign-in only exists once `web.email` *and* `web.password` are both set,
  and the token never goes away in any case — it stays what a script and
  `serve --print-token` carry. A *Console* section now names the address and
  which of the two doors it opens on, and calls out half a sign-in — an email
  without a password, which is not a way in — where the only sign of it used to
  be a login page that never appeared.

### Added

- Tickets that come back on their own. A fifth database, *Schedules*, where one
  row describes a ticket and how often it is born — `Cadence` (Hourly, Daily,
  Weekly, Monthly), `At`, `Day`, and the `Active` tick that turns it on — with
  the body of its page as the brief, copied into every ticket it makes. When the
  moment comes, the runner writes the ticket into the ready column and steps
  back: same column, same queue, same session, same pull request. Monday's
  dependency review is written once instead of being retyped every Monday.
  Two rules are the whole point of it: **catching up creates one occurrence, not
  the missed ones** — a machine off for three days wakes up owing one ticket and
  not twelve — and **an occurrence still open blocks the next one**, so a
  schedule stuck on a question does not fill the board with copies of itself.
  `ticket-runner init` builds the database, on a bare page or on a board that
  predates it; `ticket-runner schedules` says what repeats and when it next
  does; `ticket-runner schedules --run "<name>"` makes its ticket on the spot;
  `ticket-runner list` now shows the whole calendar, the tickets waiting for a
  date and the ones not written yet. Optional throughout: a workspace with no
  schedules page has nothing that repeats, `doctor` is green on it, and
  `runner.schedule = false` turns everything off without a row being unticked.
- The web console shows what comes back on its own. A *Schedules* page in the
  menu — `/?page=schedules` — reads the calendar the way `ticket-runner
  schedules` reads it: what repeats, at what rhythm, when the next ticket is due
  and when the last one was made, with a way through to the ticket that
  occurrence produced. A row nobody can read says what is wrong with it rather
  than showing a date it does not have, and `runner.schedule = false` is said at
  the foot of the page — a browser was the one place that switch could not be
  seen, and a calendar of ticked rows that never fire reads as one that works.
  Nothing is written from here: a schedule is a Notion page, and its name is the
  link to it. The page asks Notion when you open it rather than living on the
  event stream, so a tab left open on the board never polls that database.
- `GET /api/tickets/<id>`: one ticket, with the page under it flattened the way
  the runner reads it before a run.
- `GET /api/schedules`: the Schedules database as the console draws it, with
  what makes each row unreadable spelled out rather than raised.
- The official `shadcn` skill, vendored under `.claude/skills/shadcn`, so a
  session working on the console composes from the same kit.

### Fixed

- A project whose `Path` points nowhere is no longer refused when the same page still
  names its repository. Rename a clone on disk and the page keeps the old path, while
  its `Repository` column stays right — the runner used to stop at the first wrong
  declaration and never read the second, blocking every ticket of that project with
  `project not found on disk`. Each way is now tried in turn, and the ticket runs on
  what the first working one finds; its comment says which declaration is out of
  date, and `ticket-runner projects` shows the project with a `!` rather than a tick
  until you correct it. A repository renamed on GitHub is found too: `gh` is asked what
  the old name is called now, and that is what the clones are matched against. What a
  fallback may find is deliberately narrow — only a clone whose `origin` remote is the
  one declared, never one whose folder is merely named like the project, and never one
  of two clones that answer to the same remote. A project none of its declarations lead
  to is still put back, and the comment now lists every way that was tried and why each
  one failed, instead of the first disappointment alone.

- A desktop notification now takes you to the ticket it names: clicking it
  opens that ticket's Notion page, where before a click did nothing and you
  had to go and find the title on the board. `notify-send` cannot do it — it
  never hands back the identifier a desktop answers a click with, and on GNOME
  it refuses `--action` outright — so a notification with a page behind it is
  posted over D-Bus and followed by a detached process, which waits for the
  click and then goes quiet. A machine missing `gdbus`, `dbus-monitor` or
  `xdg-open`, or a desktop that does not do notification actions, gets exactly
  the notification it got before.
- `ticket-runner init` can build the Tickets database on a bare page again. It
  declared the *Project* and *Agent* relations in a shape the Notion API
  rejects, so on 8 September 2026 a fresh page stopped at `POST /databases:
  400 body failed validation. Fix one:` — and said nothing after the colon,
  since only the first line of the error was shown, then claimed nothing was
  half-built when the workspace and the Projects and Agents databases already
  were. The relations are now spelled the way the API accepts; when the API
  refuses something, `init` prints every line of its answer; and the advice
  says what is true: what was built is kept, run the same command again.
- The runner no longer goes quiet after a run that failed. On 7 September 2026
  a Notion timeout failed a run, the timer was restarted, and nothing ran for
  the next two hours: the timer counted from the boot and from the service's
  last activation, had neither to count from, and sat *enabled* with no next
  run — `status` showed a green tick the whole time. The timer now also counts
  from its own start (`OnActiveSec`), so it always has a next run. `status` and
  `doctor` read that next run rather than `is-enabled`, and a timer that has
  none is a red line, not a tick; the console's badge says *stalled*. And
  `status` no longer reports a run in progress on the strength of a `run.lock`
  a dead process left behind: it asks the lock itself, which the kernel drops
  with the process. **An existing installation keeps its old unit, and the fault
  with it, until `ticket-runner enable` is run again** — which now restarts the
  timer rather than leaving an active one as it was, since a reload alone does
  not revive a starved timer.
- A ticket that has run before is picked up instead of being refused. Its branch
  is named after it, so a session that failed, or a pull request nobody merged,
  left a branch that answered `branch ticket/… already exists — ticket already
  handled?` on every pass afterwards — the ticket was stuck until somebody ran
  `ticket-runner clean --force` by hand. That branch is now checked out again,
  replayed on top of the newest base, and the session carries on from what it
  already holds: the agent is told it is continuing somebody's work, the ticket's
  comment says what was reused and what it was rebased onto, and the push that
  follows forces with a lease, since the history under it was replayed. A rebase
  that conflicts is undone rather than left half-applied — the session still runs,
  and the conflict is a line in the comment. Two things still stop the ticket, and
  both should: a branch another worktree has checked out, and a directory holding
  commits or changes that were never anywhere else.

### Added

- A date on a **validated** ticket is honoured too, so the board schedules what is
  finished and not only what is to be done: the post you wrote on Monday and accepted on
  Tuesday goes out on Thursday at 18:00, on its own, rather than on the pass that follows
  your click. The ticket waits in its column until the moment comes, and a pull request
  waits the same way — one column, one rule. `ticket-runner list` shows what *Validated*
  is holding back beside the ready tickets waiting for their date, and a pass counts them
  both.

- A ticket nobody got round to titling is named by the runner when it becomes
  ready: a very short session reads what the page says and writes a title back
  into Notion, so the board shows it too — and the branch reads
  `ticket/retirer-le-shader-…` instead of one more `untitled-ticket`. A ticket
  that already has a title keeps it and costs nothing extra, and one with
  nothing on the page still comes back with the question rather than a name
  invented for it.
- A terminal for one ticket, in the console: click a card and the **Ticket** tab

- The console is a React application. Its page is rebuilt on TypeScript, Vite,
  Tailwind and [shadcn/ui](https://ui.shadcn.com), and it has a light theme now —
  a switch in the header, dark still what it opens on. Nothing about how it is
  installed or served changed: what ships is the built bundle, committed beside
  the Python that serves it, so a machine still needs `python3` and `git` and no
  Node at all. Its source lives in `frontend/`.
- A menu down the left of the console, in place of the row of tabs — and it says
  more than the tabs could: how many tickets are ready and how many are in
  review, which ticket the Ticket pane is holding, how many sessions are writing
  right now. `Ctrl-B` folds it to a rail of icons; on a phone it is a drawer.
- The repository declares the shadcn MCP server in `.mcp.json`, so an agent
  working here can search the registry and add a component without leaving the
  session.
- A terminal for one ticket, in the console: click a card and the **Ticket** pane

  shows everything said on it — the runner's reports, your answers, the ones you
  gave from Telegram — with a field to say the next thing and, while it runs, its
  session's steps scrolling underneath. What you type is a comment on the ticket,
  written into the thread the runner last spoke in: answering its question runs
  the ticket again, and naming it asks it for words instead.
- Addresses in the console are links. An answer, the output of a command, a step
  of a session or a comment on a ticket that carries a URL is one click away,
  rather than something to read out loud into another tab.
- A ticket moved to *Ready* becomes a Claude Code session: a disposable git
  worktree, a branch, commits, and a pull request — or, for a project with no
  repository, a document written back into the Notion page itself.
- A projects database, a context page and an agents database, so a ticket knows
  which repository it belongs to, who the work is for, and who handles it.
- A discussion on a ticket: a comment under one of the runner's reports is
  answered in the thread by something that has read the ticket and the code.
- Telegram and Slack: a ticket the agent will not guess at asks its question
  where you already are, and one word answers it.
- `ticket-runner serve` — the web console: the board live, the CLI in a browser,
  and a chat with the whole workspace.
- Progress written as the session runs, at a ten-second cadence: a bullet per
  command run and per file touched, and what the agent says as a paragraph of
  its own — whole, in its own markdown, and never cut to the length of a bullet.
- Self-update: a run asks once an hour whether the installed code is still the
  newest, and updates itself between two runs.
- `ticket-runner history` shows what each ticket cost and how long it took.
- A dated ticket waits for its date.
- An architecture diagram, generated by [archify](https://github.com/tt-a1i/archify)
  from `diagrams/ticket-runner.architecture.json`: a still in the README and an
  interactive `diagrams/architecture.html` whose nodes link to the code they are
  drawn from.
- A *Validated* column: the answer to the question *In review* asks. Move a
  ticket there and the runner does the last thing it needs — it merges its pull
  request (`runner.merge_method`, `squash` by default), or, when there is none,
  runs a session that publishes what the ticket already holds: the post, the
  mail, the announcement. Then *Done*, which now means out in the world rather
  than merely finished. A run that dies mid-publication comes back as a question
  rather than redoing the work, publications of one pass run side by side, and
  `--dry-run` says what it would merge or publish without touching anything.
  Optional: a board without the column behaves exactly as before, and
  `ticket-runner init` adds it.
- A **Settings** tab in the web console: `config.toml` drawn as a page, every
  key of it, written back into that very file one line at a time — the comments
  around it survive, and the console picks the change up without a restart. A
  blank field says nothing and shows the default it falls back on; tokens are
  never sent to the browser, only *set, ending in …f3a2*; and a save is all of
  it or none of it, on a copy that has to load before it takes the file's place.
- A release and versioning system: this changelog, `scripts/release.py`, the
  `release` workflow, and the `/release` command Claude uses to cut one.
- `ticket-runner`, typed alone, presents itself: the product, the version it is
  running, an update waiting if there is one, and the commands — rather than an
  argparse usage block. The web console prints the same version beside its name
  in the header, so a browser tab left open says which runner it is talking to.

### Changed

- **The web console starts on its own.** Its unit was installed and left
  stopped, so the board only existed for as long as you remembered to type
  `ticket-runner serve` in a terminal you then had to leave open. It is now
  armed with the timer — by `install.sh` on a new machine, by `ticket-runner
  enable` on one that already has the runner — so `http://127.0.0.1:8787` is up
  after a boot with nothing to type, and the installer prints the address with
  the token in it rather than leaving it in a state file. What it opens is
  loopback and nothing else, which is what makes it a reasonable default;
  widening `web.host` is still the decision it always was. `TR_NO_WEB=1 sh
  install.sh` installs the unit and leaves it stopped, `ticket-runner disable`
  stops both — from a terminal, the console's own command line refusing the one
  command that would cut it off mid-answer — and `ticket-runner serve` on a
  machine where the console is already listening says where it is instead of
  failing on the port.
- The console's scroll bars are the console's own: thin, rounded, the colour of
  its panels, and only really visible under the pointer. The browser's — pale,
  wide, and drawn for a white page — turned up in every part of the console
  that scrolls, which is nearly all of it: the board, the transcript, a
  session's steps, the settings. The dropdowns and the caret follow the same
  dark now.

### Fixed

- `ticket-runner clean --force` removes the branch of every worktree it
  removes. A branch is named after its ticket, so a failed session left one
  behind that made every later attempt answer `branch ticket/… already exists`:
  the ticket was stuck for good, and `clean` — which only ever removed the
  directory — did not help. It does now, and it stops where something would be
  lost: a branch with commits of its own, one whose pull request is still open,
  or a worktree with uncommitted changes is kept, named in the output with the
  reason and with the command that drops it once you have looked.
