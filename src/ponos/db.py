"""The runner's local memory, in one SQLite file: ~/.local/state/ponos/ponos.db.

It does not replace the board. Tickets stay in Notion or in Markdown, because
that is where you read and edit them; this is what the runner keeps *about*
its own work, and wants to ask questions of rather than read back whole — the
dozen JSON files beside it, each with its own atomic write and no version
number, could only ever be reread from the first line. `sqlite3` ships with
Python, so the core still needs nothing but `python3` and `git`.

**One connection per process, and WAL.** The timer's run and the console are
two processes writing the same file at the same time. Write-ahead logging lets
one write while the other reads, and `busy_timeout` makes a second writer wait
its turn instead of failing on `database is locked`. Inside a process, the
console answers from several threads: they share the one connection, and
`transaction()` takes them in turn.

**Migrations, numbered by `PRAGMA user_version`.** The schema's version lives
in the file's own header, so it cannot drift from the tables it describes.
`MIGRATIONS` is an ordered tuple, and the version is how many of them have
been applied: a migration is only ever appended, never edited once released —
an installation that already ran it will not run it again. Each one runs in
its own `BEGIN IMMEDIATE` with the version bumped inside it, so a migration
that raises leaves the file as it was, and two processes starting together do
not both apply it: the second waits on the write lock, reads the version again
once it has it, and finds nothing left to do.

**A file newer than the code is refused, not read.** A downgrade — a rollback
of the install, two machines sharing a state directory — would otherwise have
an old runner writing into tables it does not know the shape of. It says which
version it found and which it knows, and touches nothing.

Migration 1 holds what the next tickets need first: a run, and the steps of a
run. A run is one session on one ticket — a ticket run three times is three
rows, which is the point: `history.jsonl` keeps one line per outcome and has
no place for the attempts in between. The ticket is referred to by its board
id and copied by title, because the board is not ours to join against and a
renamed or deleted ticket must not take its runs with it. Times are ISO 8601
in UTC, as text, the way every other file here writes them; `status` stays
NULL while a run is still going, so a run killed mid-way is findable for what
it is. A step is one line of what the session did, in order — `position`
rather than the clock, because two steps can share a second.
"""

from __future__ import annotations

import os
import sqlite3
import threading
from collections.abc import Callable, Iterator, Sequence
from contextlib import contextmanager
from pathlib import Path

from .config import state_dir

# How long a writer waits for the other process to finish before it gives up.
# A run's write is a row or two; the console's, the same. Five seconds is many
# times either, and still short enough to be an answer.
BUSY_TIMEOUT_MS = 5000


class DatabaseError(Exception):
    """The local database cannot be opened, or cannot be brought up to date."""


class TooNew(DatabaseError):
    """The file was written by a newer Ponos than the one running."""


def path() -> Path:
    return state_dir() / "ponos.db"


def _runs_and_steps(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE runs (
            id          INTEGER PRIMARY KEY,
            ticket      TEXT NOT NULL,
            title       TEXT NOT NULL DEFAULT '',
            kind        TEXT NOT NULL DEFAULT '',
            project     TEXT NOT NULL DEFAULT '',
            agent       TEXT NOT NULL DEFAULT '',
            session     TEXT NOT NULL DEFAULT '',
            log         TEXT NOT NULL DEFAULT '',
            started_at  TEXT NOT NULL,
            ended_at    TEXT,
            status      TEXT,
            reason      TEXT NOT NULL DEFAULT '',
            cost_usd    REAL
        )
        """
    )
    connection.execute("CREATE INDEX runs_by_ticket ON runs (ticket, started_at)")
    connection.execute("CREATE INDEX runs_by_start ON runs (started_at)")
    connection.execute(
        """
        CREATE TABLE steps (
            id        INTEGER PRIMARY KEY,
            run       INTEGER NOT NULL REFERENCES runs (id) ON DELETE CASCADE,
            position  INTEGER NOT NULL,
            at        TEXT NOT NULL,
            kind      TEXT NOT NULL,
            text      TEXT NOT NULL DEFAULT '',
            UNIQUE (run, position)
        )
        """
    )


# Appended to, never edited: the version of a file is how many of these it has
# been through. Statements go through `execute` one at a time — `executescript`
# commits whatever transaction is open before it starts, which would apply half
# a migration under the old version number.
Migration = Callable[[sqlite3.Connection], None]
MIGRATIONS: tuple[Migration, ...] = (_runs_and_steps,)


def version(connection: sqlite3.Connection) -> int:
    return int(connection.execute("PRAGMA user_version").fetchone()[0])


def migrate(connection: sqlite3.Connection, migrations: Sequence[Migration] = MIGRATIONS) -> int:
    """Apply every migration the file has not been through, and return its version.

    Raises TooNew, before writing anything, when the file has been through more
    of them than this code knows.
    """
    known = len(migrations)
    found = version(connection)
    if found > known:
        raise TooNew(
            f"{path_of(connection)} is at schema version {found}, and this Ponos "
            f"only knows up to {known} — it was written by a newer version. "
            "Update Ponos (ponos update) rather than let an older one write into it"
        )
    for target in range(found + 1, known + 1):
        connection.execute("BEGIN IMMEDIATE")
        try:
            # Read again under the write lock: another process may have applied
            # this one while we were waiting for it.
            if version(connection) >= target:
                connection.execute("COMMIT")
                continue
            migrations[target - 1](connection)
            connection.execute(f"PRAGMA user_version = {target}")
            connection.execute("COMMIT")
        except BaseException:
            connection.execute("ROLLBACK")
            raise
    return version(connection)


def path_of(connection: sqlite3.Connection) -> str:
    row = connection.execute("PRAGMA database_list").fetchone()
    return row[2] if row and row[2] else "the database"


def open_at(location: Path, migrations: Sequence[Migration] = MIGRATIONS) -> sqlite3.Connection:
    """A new connection to `location`, set up and migrated. Prefer `connect()`.

    The file is created private before SQLite opens it: SQLite gives its `-wal`
    and `-shm` companions the database's own mode, so they are private too.
    """
    location.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.close(os.open(location, os.O_CREAT | os.O_RDWR, 0o600))
        # Autocommit at the driver's level: transactions are begun by hand, so
        # that `BEGIN IMMEDIATE` is what actually starts one.
        connection = sqlite3.connect(
            location, timeout=BUSY_TIMEOUT_MS / 1000, isolation_level=None, check_same_thread=False
        )
    except (OSError, sqlite3.Error) as error:
        raise DatabaseError(f"cannot open {location}: {error}") from error
    try:
        connection.execute(f"PRAGMA busy_timeout = {BUSY_TIMEOUT_MS}")
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA synchronous = NORMAL")
        connection.execute("PRAGMA foreign_keys = ON")
        migrate(connection, migrations)
    except DatabaseError:
        connection.close()
        raise
    except sqlite3.Error as error:
        connection.close()
        raise DatabaseError(f"cannot open {location}: {error}") from error
    return connection


_connections: dict[Path, sqlite3.Connection] = {}
_locks: dict[Path, threading.RLock] = {}
_opening = threading.Lock()


def connect() -> sqlite3.Connection:
    """This process's connection to the database, opened and migrated the first time.

    Keyed by path, so that a test — or anything else that moves
    `XDG_STATE_HOME` — gets the file it points at, not the one opened first.
    """
    location = path()
    with _opening:
        connection = _connections.get(location)
        if connection is None:
            connection = open_at(location)
            _connections[location] = connection
            _locks[location] = threading.RLock()
        return connection


@contextmanager
def transaction(immediate: bool = True) -> Iterator[sqlite3.Connection]:
    """One transaction on this process's connection, committed if the block returns.

    `immediate` takes the write lock up front, so a transaction that reads and
    then writes cannot be refused half-way by the other process; a read-only
    block passes False and waits for nobody.
    """
    connection = connect()
    with _locks[path()]:
        connection.execute("BEGIN IMMEDIATE" if immediate else "BEGIN")
        try:
            yield connection
        except BaseException:
            connection.execute("ROLLBACK")
            raise
        connection.execute("COMMIT")


def close() -> None:
    """Close every connection this process holds — for tests, and a clean exit."""
    with _opening:
        for connection in _connections.values():
            connection.close()
        _connections.clear()
        _locks.clear()


def check() -> tuple[Path, int]:
    """Open the database and say where it is and at which version — for `doctor`."""
    return path(), version(connect())
