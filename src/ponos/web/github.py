"""The console's half of « Connect GitHub »: the trip out, and the two ways back.

The page posts a form to GitHub — a form, and not a request of ours, because it
is the person who creates the app, signed in to GitHub in their own browser.
What comes back is two redirections, and neither carries the console's cookie:
it is `SameSite=Strict`, and a navigation that started on github.com is not
the console's own. So the way back is not checked by the cookie.

- **The callback is checked by its `state`.** Drawn when the page asked, kept in
  this process, good for an hour and once (see `github_app.take_state`): a code
  that comes back with any other is refused before GitHub is asked anything.
  What it does with a good one is fetch the app's credentials, keep them in
  `secrets.env`, and send the browser on to the installation page.
- **The installation's return needs nothing checked.** It writes nothing: which
  repositories the app reaches is asked of GitHub with the app's own key, not
  read off the address. It only leads back to the Settings page — through a page
  of its own that moves on by itself, so that the console is opened by a
  navigation of its own origin and the cookie goes with it.
"""

from __future__ import annotations

import html
import socket
from urllib.parse import quote

from .. import github_app

# Where the browser lands once GitHub is done with it.
SETTINGS = "/?view=console/settings/read/config/github-app"


def status() -> dict:
    return {"apps": github_app.describe()}


def connect(console: str, organisation: str = "") -> dict:
    """What the page posts to GitHub, for this console's address."""
    try:
        installation = socket.gethostname().split(".")[0]
    except OSError:
        installation = ""
    return github_app.begin(console, organisation, installation)


def disconnect(slug: str) -> dict:
    """Forget an app here. Deleting it is GitHub's: the answer says where."""
    held = {app.slug: app for app in github_app.apps()}
    app = held.get(slug)
    if not app or not github_app.forget(slug):
        raise LookupError(f"no GitHub app {slug} is connected here")
    return {"forgotten": slug, "settings_url": app.settings_url}


def callback(code: str, state: str) -> tuple[int, str]:
    """GitHub's return with the app: where to send the browser, or why not.

    Returns a status and a location (303) or a page (400, 502).
    """
    if github_app.take_state(state) is None:
        return 400, page(
            "This link has expired",
            "It was used already, or it is more than an hour old. Start again from the "
            "console: Settings › GitHub › Connect GitHub.",
        )
    try:
        app = github_app.convert(code)
    except github_app.GitHubAppError as error:
        return 502, page("GitHub did not give the app", str(error))
    github_app.save(app)
    return 303, app.install_url


def installed(setup_action: str = "") -> str:
    """The page the installation's return shows, on its way to the Settings."""
    target = f"{SETTINGS}&github={quote(setup_action or 'install')}"
    return page("GitHub connected", "Back to the console…", target)


def page(title: str, text: str, then: str = "") -> str:
    """A page of its own, without the bundle — and moving on, when it has somewhere to go."""
    moving = f'<meta http-equiv="refresh" content="0;url={html.escape(then)}">' if then else ""
    link = f'<p><a href="{html.escape(then)}">Ponos</a></p>' if then else '<p><a href="/">Ponos</a></p>'
    return (
        "<!doctype html><html><head><meta charset=\"utf-8\">"
        f"<title>{html.escape(title)}</title>{moving}"
        "<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem}</style>"
        f"</head><body><h1>{html.escape(title)}</h1><p>{html.escape(text)}</p>{link}</body></html>"
    )
