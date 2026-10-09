"""How many tickets came in, how many went out, and when — for the console's statistics.

The board says where every ticket is now; it does not say when it got there.
Notion keeps a page's `created_time` and its `last_edited_time`, and nothing in
between — a status change is not dated anywhere the API reaches. So the day a
ticket closed is read from two places, the better one first:

- the runner's own history, where every move to `done` it makes itself is a
  line with its timestamp: a pull request merged from the validated column, a
  document written, a publication published. That is the exact minute;
- the page's `last_edited_time` for everything else — a ticket you dragged to
  done yourself, or one closed because its pull request was merged by hand
  (`board.close_merged` writes no history line). Nothing moves a ticket once it
  is done, so its last edit is its closing, unless somebody touched it since.

The history comes first because it cannot drift: a done ticket edited a week
later keeps the day it was closed. How many closings each source dated is
handed back too, so a curve built mostly on the second one says so.

Days are this machine's days, not UTC's: a ticket closed at 23:30 in Paris
closed that evening, not the next morning.

The series are computed here rather than in the browser because this is where
the tests are: the page only draws what it is handed.

A project's figures are the same computation over its tickets alone, and over
the history lines of those tickets: a history line knows its ticket's id, not
the project's name as the board spells it today, so the board is what says
whose a session was. That is also why the projects' costs add up to the
global one only up to the lines of tickets with no project — or no longer on
the board, which nobody can say a project for.
"""

from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta, tzinfo

# The runner's history lines that are a ticket reaching `done`. A plain "done"
# status is not one: a session that opened a pull request reports "done" and
# leaves the ticket in review.
CLOSING_KINDS = ("document", "delivery")

# A period longer than this is refused rather than drawn: two years of points
# is already more than a screen has pixels for.
LONGEST = 731


def day_of(stamp: str, zone: tzinfo | None = None) -> date | None:
    """The local day an ISO timestamp falls on, or None for an empty or broken one."""
    if not stamp:
        return None
    try:
        moment = datetime.fromisoformat(stamp)
    except ValueError:
        return None
    # A date with no time — what a board of files may carry — is that day.
    if moment.tzinfo is None:
        return moment.date()
    return moment.astimezone(zone).date()


def closings(history: list[dict], zone: tzinfo | None = None) -> dict[str, date]:
    """{ticket id: the last day the runner itself moved it to done}."""
    closed: dict[str, date] = {}
    for entry in history:
        if not (entry.get("merged") or entry.get("kind") in CLOSING_KINDS):
            continue
        if entry.get("status") != "done":
            continue
        day = day_of(str(entry.get("at", "")), zone)
        key = str(entry.get("id", "")).replace("-", "")
        if day and key and (key not in closed or day > closed[key]):
            closed[key] = day
    return closed


def period(start: str, end: str, today: date) -> tuple[date, date]:
    """The days asked for, the last thirty by default, refused when they make no sense."""
    last = date.fromisoformat(end) if end else today
    first = date.fromisoformat(start) if start else last - timedelta(days=29)
    if first > last:
        raise ValueError("the period ends before it starts")
    if (last - first).days >= LONGEST:
        raise ValueError(f"a period is at most {LONGEST} days")
    return first, last


def figures(
    tickets: list[dict],
    history: list[dict],
    first: date,
    last: date,
    zone: tzinfo | None = None,
    project: str | None = None,
) -> dict:
    """The cards, the curves and the breakdowns of one period.

    `tickets` are the board's, as `Api.board` builds them, with `edited`.
    With a `project` (its name, "" for the tickets that have none) only its
    tickets are counted, and only what its sessions spent.
    A ticket is open on a day if it was created by the end of it and not yet
    closed: that is every status but done, failed and blocked included — they
    are still somebody's to deal with.
    """
    if project is not None:
        tickets = [ticket for ticket in tickets if (ticket.get("project") or "") == project]
        mine = {str(ticket.get("id", "")) for ticket in tickets}
        history = [entry for entry in history if str(entry.get("id", "")).replace("-", "") in mine]
    dated = closings(history, zone)
    known = {}
    from_history = from_edit = 0
    for ticket in tickets:
        created = day_of(ticket.get("created", ""), zone)
        closed = None
        if ticket.get("column") == "done":
            closed = dated.get(str(ticket.get("id", "")))
            if closed:
                from_history += 1
            else:
                # Done with no date at all: closed before anything is drawn.
                closed = day_of(ticket.get("edited", ""), zone) or created or date.min
                from_edit += 1
            # An edit is never before the page existed; a history line about a
            # page that was since recreated could be.
            if closed and created and closed < created:
                closed = created
        known[ticket.get("id", "")] = (ticket, created, closed)

    created_on: Counter[date] = Counter()
    closed_on: Counter[date] = Counter()
    for _, created, closed in known.values():
        if created:
            created_on[created] += 1
        if closed:
            closed_on[closed] += 1

    # What was open the evening before the period: the curve starts from the
    # board as it stood, not from zero.
    def open_on(day: date) -> int:
        return sum(
            1
            for _, created, closed in known.values()
            if (created is None or created <= day) and (closed is None or closed > day)
        )

    spent_on: Counter[date] = Counter()
    for entry in history:
        day = day_of(str(entry.get("at", "")), zone)
        if day and first <= day <= last:
            spent_on[day] += float(entry.get("cost_usd") or 0)

    days = []
    stock = open_on(first - timedelta(days=1))
    spent = 0.0
    day = first
    while day <= last:
        stock += created_on[day] - closed_on[day]
        spent += spent_on[day]
        days.append(
            {
                "day": day.isoformat(),
                "created": created_on[day],
                "closed": closed_on[day],
                "open": stock,
                "cost": round(spent, 2),
            }
        )
        day += timedelta(days=1)

    # What the tickets closed in the period cost in all, sessions from before
    # the period included: a ticket is not cheaper for having been started
    # last month.
    cost_of: Counter[str] = Counter()
    for entry in history:
        cost_of[str(entry.get("id", "")).replace("-", "")] += float(entry.get("cost_usd") or 0)
    shut = [
        str(ticket.get("id", ""))
        for ticket, _, closed in known.values()
        if closed and first <= closed <= last
    ]
    average = round(sum(cost_of[key] for key in shut) / len(shut), 2) if shut else None

    born = [ticket for ticket, created, _ in known.values() if created and first <= created <= last]
    statuses = Counter(str(ticket.get("column") or "draft") for ticket in born)
    projects = Counter(str(ticket.get("project") or "") for ticket in born)
    return {
        "from": first.isoformat(),
        "to": last.isoformat(),
        "totals": {
            "open": days[-1]["open"],
            "closed": sum(item["closed"] for item in days),
            "created": sum(item["created"] for item in days),
            "cost": days[-1]["cost"],
        },
        "days": days,
        "statuses": [{"key": key, "count": count} for key, count in statuses.most_common()],
        "projects": [{"name": name, "count": count} for name, count in projects.most_common()],
        "dated": {"history": from_history, "edited": from_edit},
        "average": average,
    }
