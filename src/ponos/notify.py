"""Desktop notifications, for work that happens while you look elsewhere.

The whole point of the runner is that you are not watching it. A ticket that
finishes in the background is worth one line on screen — otherwise you discover
your pull request tomorrow.

And a line naming a ticket is worth clicking: the click opens that ticket's
Notion page, rather than leaving you to find the title again on the board.
`notify-send` cannot do that — it posts and forgets, never handing back the
identifier the desktop answers a click with, and more than one machine refuses
its `--action` outright while the desktop behind it supports actions perfectly
well. So a notification with somewhere to go is posted over D-Bus and followed
by a process of our own, detached: a run must not wait for somebody to look at
their screen. Everything else is still `notify-send`. The same process draws
the buttons a notification has beyond the ticket — the pull request, when there
is one — and opens whichever was pressed: the desktop says which by its key.

Everything here fails quietly: a machine with no notification daemon, a service
without a session bus, a missing `notify-send` — none of that is a reason for a
ticket to fail. A click that leads nowhere is not either, so every step of the
clickable path falls back to the plain notification.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import threading
from pathlib import Path

APP = "Ponos"
BUS = "org.freedesktop.Notifications"
OBJECT = "/org/freedesktop/Notifications"

# `default` is the action a click on the body of a notification triggers, by the
# freedesktop specification; the label is for a desktop that draws actions as
# buttons too, and the run hands it over in its own language — see `voice.py`.
# This one is what a notification sent from anywhere else says.
ACTION = "Open the ticket"

# How long the child follows its notification. A desktop that keeps notifications
# in a tray only says one was closed when you clear it, which can be days — and a
# process per ticket, kept for days, is a worse bargain than a click nobody made
# within the hour.
LIFETIME = 3600

# Ponos's own face, rather than the information sign every application has: the
# console's icon, which ships with the runner. A checkout or an install that lost
# it falls back on the system's icons, never on no notification.
ICON = Path(__file__).resolve().parent / "web" / "static" / "pwa" / "icon-192.png"


def send(
    title: str,
    body: str,
    *,
    urgent: bool = False,
    warning: bool = False,
    link: str = "",
    action: str = ACTION,
    buttons: tuple[tuple[str, str], ...] = (),
) -> bool:
    """One line on screen — and, with `link`, one that takes you to the ticket.

    `urgent` is a notification that stays until it is dealt with, which is only
    worth it when something waits for you; `warning` is one that went wrong, and
    says so by its icon without refusing to go away. `buttons` are more places
    to go than the ticket — a label and an address each.
    """
    if link and _hand_over(
        title, body, urgent=urgent, warning=warning, link=link, action=action, buttons=buttons
    ):
        return True
    return _plain(title, body, urgent=urgent, warning=warning)


def _plain(title: str, body: str, *, urgent: bool, warning: bool = False) -> bool:
    binary = shutil.which("notify-send")
    if not binary:
        return False
    try:
        subprocess.run(
            [
                binary,
                "--app-name", APP,
                "--urgency", "critical" if urgent else "normal",
                "--icon", _icon(warning),
                title,
                body,
            ],
            check=False,
            timeout=10,
            capture_output=True,
        )
        return True
    except (OSError, subprocess.SubprocessError):
        return False


def _icon(warning: bool) -> str:
    if warning:
        return "dialog-warning"
    return str(ICON) if ICON.is_file() else "dialog-information"


def _hand_over(
    title: str,
    body: str,
    *,
    urgent: bool,
    link: str,
    action: str = ACTION,
    warning: bool = False,
    buttons: tuple[tuple[str, str], ...] = (),
) -> bool:
    """Give the notification to a child that outlives this run.

    The child is this very module, run as one: it posts the notification, waits
    for the click, and opens the link. `PYTHONPATH` carries our own `src` to it
    so that it can import us however the parent was started — from the installed
    copy, from a checkout, or from a test.
    """
    if not all(shutil.which(tool) for tool in ("gdbus", "dbus-monitor", "xdg-open")):
        return False
    environment = dict(os.environ)
    root = str(Path(__file__).resolve().parents[1])
    carried = environment.get("PYTHONPATH", "")
    environment["PYTHONPATH"] = f"{root}{os.pathsep}{carried}" if carried else root
    try:
        subprocess.Popen(
            [
                sys.executable, "-m", "ponos.notify",
                link, title, body, "urgent" if urgent else "normal", action,
                "warning" if warning else "plain",
                *(part for button in buttons for part in button),
            ],
            env=environment,
            start_new_session=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    except (OSError, subprocess.SubprocessError):
        return False


# -- the child ----------------------------------------------------------------


def follow(
    link: str,
    title: str,
    body: str,
    *,
    urgent: bool,
    action: str = ACTION,
    warning: bool = False,
    buttons: tuple[tuple[str, str], ...] = (),
) -> None:
    """Post the notification, then open `link` — or a button's — if somebody clicks it.

    The watcher is started before the notification, because the identifier is
    only known once the notification is posted and a signal missed is a click
    lost. Anything that goes wrong on the way falls back to the plain
    notification: being told late is the point, being told never is not.
    """
    # A button is known by its place, which is all the desktop hands back.
    places = {"default": link, **{f"open-{index}": url for index, (_, url) in enumerate(buttons)}}
    watcher = _watch()
    identifier = (
        _post(title, body, urgent=urgent, action=action, warning=warning, buttons=buttons)
        if watcher
        else ""
    )
    if not identifier:
        if watcher:
            watcher.terminate()
        _plain(title, body, urgent=urgent, warning=warning)
        return
    # A daemon timer, so that the click that comes first ends the child rather
    # than leaving it to sit out the hour it was given.
    deadline = threading.Timer(LIFETIME, watcher.terminate)
    deadline.daemon = True
    deadline.start()
    try:
        target = places.get(_clicked(watcher, identifier), "")
        if target:
            subprocess.Popen(
                ["xdg-open", target],
                start_new_session=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
    except (OSError, subprocess.SubprocessError):
        pass
    finally:
        deadline.cancel()
        watcher.terminate()


def _watch() -> subprocess.Popen | None:
    """`dbus-monitor` on the notification signals, reading as they arrive."""
    try:
        return subprocess.Popen(
            ["dbus-monitor", "--session", f"type='signal',interface='{BUS}'"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )
    except (OSError, subprocess.SubprocessError):
        return None


def _post(
    title: str,
    body: str,
    *,
    urgent: bool,
    action: str = ACTION,
    warning: bool = False,
    buttons: tuple[tuple[str, str], ...] = (),
) -> str:
    """Show the notification, and return the identifier the desktop gave it.

    `--` before the arguments because the expiry is `-1`, "for as long as the
    desktop likes", and `gdbus` would otherwise read it as an option of its own.
    """
    actions = ", ".join(
        [f'"default", {_text(action)}']
        + [f'"open-{index}", {_text(label)}' for index, (label, _) in enumerate(buttons)]
    )
    try:
        answer = subprocess.run(
            [
                "gdbus", "call", "--session",
                "--dest", BUS,
                "--object-path", OBJECT,
                "--method", f"{BUS}.Notify",
                "--",
                _text(APP), "0", _text(_icon(warning)), _text(title), _text(body),
                f"[{actions}]", f"{{'urgency': <byte {2 if urgent else 1}>}}", "-1",
            ],
            check=False,
            timeout=10,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    found = re.search(r"uint32 (\d+)", answer.stdout)
    return found.group(1) if found else ""


def _text(value: str) -> str:
    """A title or a body, spelled as the string literal `gdbus` expects.

    Every argument is read as GVariant, so a body of “42” would arrive as a
    number and the whole call would be refused — and the notification with it.
    """
    for character, escape in (("\\", "\\\\"), ('"', '\\"'), ("\n", "\\n"), ("\t", "\\t")):
        value = value.replace(character, escape)
    return f'"{value}"'


def _clicked(watcher: subprocess.Popen, identifier: str) -> str:
    """Which action of that notification was clicked — "" when it was dismissed.

    `dbus-monitor` writes a signal over several lines — its name on the first,
    its arguments underneath — so the name is held until an identifier turns up
    under it, and the action's key is the string on the line after. Identifiers
    are handed out by the desktop and never shared, so one that matches is ours
    and no other application's.
    """
    signal = ""
    invoked = False
    for line in watcher.stdout:
        if invoked:
            found = re.search(r'string "(.*)"', line)
            return found.group(1) if found else "default"
        if "member=" in line:
            signal = line.rsplit("member=", 1)[-1].strip()
        elif line.strip() == f"uint32 {identifier}":
            if signal == "ActionInvoked":
                invoked = True
            elif signal == "NotificationClosed":
                return ""
    return "default" if invoked else ""


if __name__ == "__main__":  # the detached child, started by `send`
    follow(
        sys.argv[1], sys.argv[2], sys.argv[3],
        urgent=sys.argv[4] == "urgent",
        # A child started by an older parent, mid-update, has no label to read.
        action=sys.argv[5] if len(sys.argv) > 5 else ACTION,
        warning=len(sys.argv) > 6 and sys.argv[6] == "warning",
        buttons=tuple(zip(sys.argv[7::2], sys.argv[8::2])),
    )
