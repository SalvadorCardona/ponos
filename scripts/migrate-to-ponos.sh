#!/bin/sh
# Move a machine running ticket-runner over to Ponos, in one go.
#
#   sh scripts/migrate-to-ponos.sh            # waits for the pass in progress
#   sh scripts/migrate-to-ponos.sh --now      # stops it instead
#
# A migration filet, from the first line to the last: everything it names by
# the old name is what it moves away from. It is safe to run twice — every
# step looks before it acts, and a step already done is said and skipped.
#
# Never from inside a Ponos session: stopping the timer and the console is
# stopping the process that session runs under. From a terminal of your own.
#
# What it does, in this order, so that nothing runs on half a migration:
#   1. stops the old timer, so no new pass starts, then waits for the pass in
#      progress (or stops it with --now), then stops the old console;
#   2. installs Ponos with install.sh, units left off — which removes the old
#      units, renames the variables of their drop-ins, moves the configuration
#      and the state (worktrees and Claude Code sessions included) under the
#      new name, removes the old sources and leaves `ticket-runner` as an alias;
#   3. renames the checkout ~/workspace/ticket-runner to ~/workspace/ponos,
#      points its remote at the renamed repository and tells git where its
#      worktrees are;
#   4. writes the new units and starts them: `ponos enable`.
set -eu

OLD=ticket-runner
REPO_OLD=SalvadorCardona/ticket-runner
REPO_NEW=SalvadorCardona/ponos
WORKSPACE="${PONOS_WORKSPACE:-$HOME/workspace}"
STATE_OLD="${XDG_STATE_HOME:-$HOME/.local/state}/$OLD"
STATE_NEW="${XDG_STATE_HOME:-$HOME/.local/state}/ponos"
HERE="$(cd "$(dirname "$0")/.." && pwd)"

say()  { printf '==> %s\n' "$1"; }
ok()   { printf '    ✓ %s\n' "$1"; }
die()  { printf 'error: %s\n' "$1" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

case "$(pwd -P)/" in
    "$STATE_OLD"/*|"$STATE_NEW"/*)
        die "run this from a terminal of your own, not from a Ponos worktree: it stops the service the session runs under" ;;
esac
[ -n "${CLAUDECODE:-}" ] && die "run this from a terminal of your own, not from a Claude Code session"

# --- 1. the old services ---------------------------------------------------
if have systemctl; then
    say "Stopping $OLD"
    systemctl --user disable --now "$OLD.timer" >/dev/null 2>&1 && ok "$OLD.timer stopped" || true
    if systemctl --user is-active --quiet "$OLD.service" 2>/dev/null; then
        if [ "${1:-}" = "--now" ]; then
            systemctl --user stop "$OLD.service"
            ok "pass in progress stopped"
        else
            printf '    a pass is in progress — waiting for it to end (--now stops it)'
            while systemctl --user is-active --quiet "$OLD.service" 2>/dev/null; do
                printf '.'; sleep 10
            done
            printf '\n'
            ok "pass ended"
        fi
    fi
    systemctl --user disable --now "$OLD-web.service" >/dev/null 2>&1 && ok "$OLD-web.service stopped" || true
fi

# --- 2. Ponos, units off ---------------------------------------------------
# The repository is renamed on GitHub, or about to be: the old name redirects
# once it is, and is the only one that answers before.
REPO="$REPO_NEW"
git ls-remote --exit-code "https://github.com/$REPO_NEW.git" HEAD >/dev/null 2>&1 || REPO="$REPO_OLD"
say "Installing Ponos from $REPO"
TR_REPO="$REPO" TR_NO_SERVICE=1 sh "$HERE/install.sh" </dev/null

# --- 3. the checkout -------------------------------------------------------
if [ -d "$WORKSPACE/$OLD/.git" ] && [ ! -e "$WORKSPACE/ponos" ]; then
    say "Renaming $WORKSPACE/$OLD to $WORKSPACE/ponos"
    mv "$WORKSPACE/$OLD" "$WORKSPACE/ponos"
    # Claude Code files a session under its directory, slugified: the
    # sessions and the memory of the checkout follow it.
    for folder in "$HOME/.claude/projects/$(printf '%s' "$WORKSPACE/$OLD" | tr '/.' '--')"*; do
        [ -d "$folder" ] || continue
        target=$(printf '%s' "$folder" | sed "s|$(printf '%s' "$WORKSPACE/$OLD" | tr '/.' '--')|$(printf '%s' "$WORKSPACE/ponos" | tr '/.' '--')|")
        [ -e "$target" ] || mv "$folder" "$target"
    done
    ok "sessions and memory of the checkout moved with it"
fi
if [ -d "$WORKSPACE/ponos/.git" ]; then
    url=$(git -C "$WORKSPACE/ponos" remote get-url origin 2>/dev/null || true)
    case "$url" in
        *"$REPO_OLD"*)
            git -C "$WORKSPACE/ponos" remote set-url origin "$(printf '%s' "$url" | sed "s|$REPO_OLD|$REPO_NEW|")"
            ok "origin now points at $REPO_NEW" ;;
    esac
    # Both sides of every link: the checkout moved, and so did the worktrees.
    set --
    for worktree in "$STATE_NEW"/worktrees/*; do
        [ -f "$worktree/.git" ] && set -- "$@" "$worktree"
    done
    git -C "$WORKSPACE/ponos" worktree repair "$@" >/dev/null 2>&1 || true
    ok "worktrees repaired"
    CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/ponos/config.toml"
    if [ -f "$CONFIG" ] && grep -q "$WORKSPACE/$OLD\b" "$CONFIG"; then
        sed -i "s|$WORKSPACE/$OLD\b|$WORKSPACE/ponos|g" "$CONFIG"
        ok "configuration points at $WORKSPACE/ponos"
    fi
fi

# --- 4. start --------------------------------------------------------------
say "Starting Ponos"
PONOS="$HOME/.local/bin/ponos"
"$PONOS" enable
"$PONOS" doctor || true
printf '\nPonos is running. `ticket-runner` still answers, and says it was renamed.\n'
