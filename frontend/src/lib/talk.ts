/* The drawer of the conversation, opened and closed from anywhere on the page.
 *
 * Events and not a value in the console's context: whoever asks — a section of
 * the settings that runs `> doctor`, the page of the sessions, a link in the
 * model picker — does not have to be near the drawer, nor to import it, which
 * would put the drawer in every chunk that wants to open it. This module
 * imports nothing, for the same reason. */

/* Opened from elsewhere: a section of the settings runs `> doctor` and the
 * answer arrives in the transcript, which is no use behind a closed drawer. An
 * event rather than a value in the console's context, for the same reason the
 * settings are reread on one: whoever asks does not have to be near whoever
 * answers. */
export const OPENED = "ponos:talk"

/** Open the drawer, from anywhere on the page. */
export const openTalk = () => window.dispatchEvent(new Event(OPENED))

/* Closed, from anywhere on the page: a link in the drawer that leads to a page
 * has to get the drawer out of its way. */
export const CLOSED = "ponos:talk-close"

/** Close the drawer, from anywhere on the page. */
export const closeTalk = () => window.dispatchEvent(new Event(CLOSED))

/* Opened or closed, whichever it is not: the palette's entry, which says the
 * same thing as the shortcut. */
export const TOGGLED = "ponos:talk-toggle"

/** Open the drawer if it is closed, close it if it is open. */
export const toggleTalk = () => window.dispatchEvent(new Event(TOGGLED))

