/* The shapes the Python side sends, written down once.
 *
 * Every one of these mirrors a dict built in `src/ticket_runner/web/` — `api.py`
 * for the reads and writes, `console.py` and `live.py` for what comes down the
 * event stream. When a field is added there, it is added here, and TypeScript
 * says which components have to care.
 */

export type ColumnKey =
  | "ready"
  | "running"
  | "review"
  | "validated"
  | "blocked"
  | "failed"
  | "done"
  | "other"

export interface Ticket {
  id: string
  short: string
  title: string
  url: string
  status: string
  column: ColumnKey
  project: string
  kind: string
  priority: string
  model: string
  progress: string
  runner: string
  pull_request: string
  session: string
  session_link: string
  cost: number | null
  duration: number | null
  scheduled: string
  created: string
  /** Notion's `last_edited_time`: when a done ticket closed, where the runner's history does not say. */
  edited: string
  /** A move that has not reached Notion: on its way, refused, or not made
   * because Notion had been changed meanwhile — see `web/board.py`. */
  sync?: "pending" | "failed" | "conflict"
  /** Why, when it is not on its way. */
  sync_error?: string
  /** The status the move was to. */
  sync_status?: string
}

/** A ticket, with the page under it: the brief, the report, the notes between. */
export interface TicketDetail extends Ticket {
  /** The page's blocks, flattened the way the runner reads them. */
  content: string
}

export interface Board {
  tickets: Ticket[]
  /** Whether this board has a `validated` column the runner would honour. */
  validate?: boolean
  columns: { key: ColumnKey; name: string }[]
}

export interface Project {
  /** Empty for a project the configuration names and the board has never heard of. */
  id: string
  name: string
  kind: string
  url: string
  /** What the project page declares, when it declares anything. */
  repository?: string
  path?: string
  /** The `[projects]` entry of the configuration, where there is one. */
  configured?: string
  /** Where this row came from: the board, or the file on this machine. */
  source?: "board" | "config"
  /** The banner of its page, and the mark in front of its name. See `Picture`. */
  cover?: Picture
  icon?: Picture
}

/* One of a project's two pictures, as the console draws it.
 *
 * `src` is the console's own address for the image, never the board's: a file
 * Notion keeps is behind a URL that is dead within the hour, so the server
 * keeps a copy and serves that. */
export interface Picture {
  kind: "image" | "emoji" | ""
  src?: string
  emoji?: string
  /** The address a pasted picture lives at — somebody else's, so not a secret. */
  url?: string
  /** Chosen here, and not yet taken by the board. */
  pending?: boolean
  /** Why the board did not take it — it is tried again at the next reading. */
  error?: string
  /** Changed on both sides between two readings: which side's picture won. */
  conflict?: "notion" | "console" | ""
}

/** What a picture's change answers: both pictures of the project, as they now are. */
export interface Pictures {
  id: string
  cover: Picture
  icon: Picture
}

/** One project, opened: the row, and what is written on its page. */
export interface ProjectDetail extends Project {
  content: string
}

export interface Projects {
  projects: Project[]
  workspace_root: string
  /** `storage.mode`: which board these came off. */
  storage: string
}

/** The standing context: what reaches every ticket before the ticket itself. */
export interface Context {
  text: string
  /** The page it is written on, "" where the workspace has none. */
  page: string
  /** What that page is called, for the sentence that says it is missing. */
  where: string
  storage: string
  editable: boolean
}

/** One row of the Schedules database: a recipe for a ticket, and how often it is born. */
export interface Schedule {
  id: string
  name: string
  url: string
  /** "Hourly" | "Daily" | "Weekly" | "Monthly", or empty where nobody picked one. */
  cadence: string
  at: string
  day: string
  active: boolean
  /** When the next ticket is due, and when the last one was made. Empty for "never yet". */
  next: string
  last: string
  /** The ticket the last occurrence made, addressed as the board addresses one. */
  ticket: string
  /** The project's name, when the server already knew it; the page it points at, always. */
  project: string
  project_id: string
  model: string
  priority: string
  /** What stops this schedule being acted on, in the words `doctor` prints. */
  problem: string
}

/** One schedule opened: the row, and its page body — the brief of every ticket it makes. */
export interface ScheduleDetail extends Schedule {
  body: string
}

export interface Schedules {
  /** `runner.schedule`: off, and nothing is born however the rows are ticked. */
  enabled: boolean
  /** Whether the workspace has a Schedules database at all. */
  database: boolean
  /** What that page is called, for the sentence that says it is missing. */
  page: string
  /** `storage.mode`: which board these came off. */
  storage?: string
  schedules: Schedule[]
}

export interface ChatState {
  session_id: string
  turns: number
  resume_command: string
  /** What a message may carry: the extensions the server keeps, and how heavy. */
  attachments?: { max_mb: number; accepted: string[]; ffmpeg: boolean }
  /** Whether the microphone can be offered, and why not when it cannot. */
  dictation?: { ready: boolean; why: string; send: boolean }
}

/** A file kept by the server for a message: what the transcript draws it from. */
export interface Attached {
  id: string
  name: string
  kind: "image" | "video" | "document"
  type: string
  size: number
}

export interface RunnerState {
  timer: string
  running: boolean
  lock: string
  /** The sessions in flight, read from their logs by the server. */
  sessions: Running[]
  /** When the credits come back, in seconds since the epoch — 0 while there are some. */
  credits: number
  /** The same moment, as a clock reads it. */
  credits_at: string
  workspace_root: string
  /** `storage.mode`: "notion", "markdown", or "both". */
  storage: string
  /** Where the Markdown board is, empty unless there is one. */
  board_path: string
  interval_seconds: number
  model: string
  permission_mode: string
  claude: boolean
  version: string
  update: string
  spend: number
  handled: number
  chat: ChatState
  commands: string[]
  busy: boolean
}

/** A line of a session: the tool it used, and what it used it on — or, `said`, what the agent wrote. */
export interface Step {
  label: string
  detail: string
  said?: boolean
}

export type Role = "you" | "workspace" | "error" | "command"

export interface Message {
  role: Role
  text: string
  at?: string
  attachments?: Attached[]
}

export interface Talk {
  id: string
  mention: string
  messages: Message[]
}

/** A session in flight: the ticket it belongs to (its short id), and its log. */
export interface Running {
  source: string
  log: string
}

/** One session log on disk, as `/api/logs` lists it. */
export interface LogEntry {
  name: string
  ticket: string
  at: number
  size: number
}

/* -- what the stream carries ------------------------------------------------ */

/** The sessions running now — a state, replayed to every tab that connects. */
export interface SessionsEvent {
  sessions: Running[]
}

export interface StepEvent extends Step {
  source: string
  log: string
}

export type ChatEvent =
  | { stage: "reset" }
  | { stage: "sent"; text: string; attachments?: Attached[]; session_id: string }
  | ({ stage: "step" } & Step)
  | {
      stage: "answer" | "failed"
      text: string
      ok?: boolean
      cost_usd?: number
      seconds?: number
      session_id?: string
    }

export type CommandEvent =
  | { stage: "started"; argv: string[] }
  | { stage: "line"; text: string }
  | { stage: "ended"; code: number }

export interface TalkEvent extends Message {
  ticket: string
}

/** When the board last agreed with Notion, and what does not. `board.describe`. */
export interface SyncEvent {
  synced_at: string
  reconciled_at: string
  /** Tickets the last full read found the incremental reads had wrong. */
  drift: number
  pending: number
  failed: number
  conflicts: number
  /** Why the last read failed, empty when it did not. */
  error: string
}

export interface NoticeEvent {
  where: string
  message: string
}

/* -- settings --------------------------------------------------------------- */

export type FieldKind = "text" | "path" | "int" | "bool" | "choice" | "events" | "secret"

export interface SettingField {
  name: string
  kind: FieldKind
  label: string
  help: string
  choices: string[]
  fallback: unknown
  after: string
  stated: boolean
  value: string | number | boolean | string[] | null
  preview?: string
}

export interface SettingSection {
  key: string
  title: string
  blurb: string
  pairs: string
  fields: SettingField[]
}

/** One row of a `name = value` table: a project and its path, an owner and its
 * GitHub account. Which table it belongs to is the section's `pairs`. */
export interface Pair {
  name: string
  value: string
}

export interface Settings {
  path: string
  usable: boolean
  problem: string
  sections: SettingSection[]
  projects: Pair[]
  github: Pair[]
}

export interface Saved {
  saved: string[]
  after: string[]
}

/** What a settings field may become on the way back to the file. */
export type SettingValue = string | number | boolean | string[] | null

/** One day of the statistics page. `open` is what was still open that evening, `cost` what was spent since the period began. */
export interface StatisticsDay {
  day: string
  created: number
  closed: number
  open: number
  cost: number
}

/** The statistics of one period — `web/statistics.py`. */
export interface Statistics {
  from: string
  to: string
  totals: { open: number; closed: number; created: number; cost: number }
  days: StatisticsDay[]
  /** The tickets created in the period, by the column they are in now. */
  statuses: { key: ColumnKey; count: number }[]
  /** The same tickets, by project; "" for a ticket with none. */
  projects: { name: string; count: number }[]
  /** How many closings the runner's history dated, and how many Notion's last edit had to. */
  dated: { history: number; edited: number }
}
