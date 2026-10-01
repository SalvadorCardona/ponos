import * as React from "react"
import { RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useConsole } from "@/hooks/use-console"
import { api, why } from "@/lib/api"
import { currentLanguage, t as translate, useT } from "@/lib/i18n"

import { Composer } from "./composer"
import { Turn } from "./turn"

/** An instant as the language the console is in would write it, or nothing at all. */
function moment(at?: string): string {
  if (!at) return ""
  const date = new Date(at)
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(currentLanguage(), { dateStyle: "short", timeStyle: "short" })
}

// The page's own language, as in the workspace's bar: what the person
// answering is reading, and so the likeliest one they are speaking.
const transcribe = async (audio: Blob) => (await api.transcribe(audio, currentLanguage())).text

/* One ticket's discussion, on its page.
 *
 * What you type is a comment on it, and a comment is already how a ticket is
 * answered: a reply under the question a run asked puts the ticket back in the
 * queue, and one that names the runner asks it for words instead. So there is
 * nothing new to learn here, and nothing kept on the side: the discussion is
 * Notion's, and the same words typed into Notion do the same.
 *
 * It used to be behind the bubble, which changed role on a ticket's page and
 * said so nowhere: a question waiting on you was a question you had to guess
 * was there. It is a tab of the page now, counted, and the one the page opens
 * on when the ticket is waiting — see `TicketPage`.
 *
 * The bar is the workspace's, given the words and the voice. Not the files: a
 * comment carries text, and a + that attached nothing would be a + that lied.
 * The steps of a running session are not here either — they are the next tab.
 */
export function TicketTalk() {
  const { ticket, talk, mention, tell, rereadTalk, talkLoading, runner } = useConsole()
  const t = useT()
  const [problem, setProblem] = React.useState("")

  const send = async (text: string) => {
    setProblem("")
    try {
      await tell(text)
      return true
    } catch (error) {
      setProblem(translate("not written: {{why}}", { why: why(error) }))
      return false
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="text-muted-foreground min-w-0 flex-1 text-xs">
          {t("an answer to its question runs it again")} ·{" "}
          <code className="bg-muted rounded px-1 py-0.5 font-mono">{mention}</code>{" "}
          {t("asks it for words instead")}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={rereadTalk}
          disabled={!ticket || talkLoading}
          title={t("read the discussion again")}
        >
          <RotateCw className={talkLoading ? "animate-spin" : undefined} />
          {talkLoading ? t("reading…") : t("reread")}
        </Button>
      </div>

      {/* A log rather than a scroller of its own: the page already scrolls,
          and a discussion read oldest first is read the way a page is. */}
      <div role="log" aria-live="polite" className="flex flex-col gap-2">
        {talk.map((message, index) => (
          <Turn
            key={index}
            role={message.role}
            text={message.text}
            who={
              message.role === "you"
                ? t("you")
                : message.role === "error"
                  ? t("problem")
                  : t("the runner")
            }
            when={moment(message.at)}
          />
        ))}
        {!talk.length && !talkLoading ? (
          <p className="text-muted-foreground text-sm">
            {t("Nothing has been said on this ticket yet.")}
          </p>
        ) : null}
        {talkLoading && !talk.length ? (
          <p className="text-muted-foreground text-sm">{t("reading the discussion…")}</p>
        ) : null}
      </div>

      {problem ? <p className="text-destructive text-xs">{problem}</p> : null}
      <Composer
        className="mx-0 max-w-none"
        busy={false}
        onSend={send}
        placeholder={t("Answer the ticket, or ask it something")}
        transcribe={transcribe}
        dictation={
          runner?.chat?.dictation ?? { ready: false, why: t("Dictation is not available"), send: false }
        }
      />
    </div>
  )
}
