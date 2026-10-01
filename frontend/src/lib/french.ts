/* The console in French.
 *
 * One entry per sentence the console says, keyed by the sentence itself — the
 * key is the English source, so a key nobody has translated is drawn as it was
 * written rather than as a name nobody meant to read. See `i18n.ts`.
 *
 * Three kinds of entry live here, and they are kept apart on purpose:
 *
 * - the words the packages under the console say, which are theirs;
 * - the words the console itself says;
 * - the words `web/settings.py` writes about the configuration, which travel
 *   from the server to the settings page and are translated on arrival. A test
 *   holds that last list to the file it comes from: a setting whose sentence
 *   is rewritten in Python and not here would quietly go back to English.
 */
export const FRENCH: Record<string, string> = {
  /* -- what the packages say ---------------------------------------------- */
  // react-resource-view and react-data-form draw a board, a form and a panel,
  // and say a few things of their own along the way. A word they already say
  // in French is absent from this list: an untranslated key is drawn as it
  // stands, which is the French they were written in.
  "No data yet": "Rien sur le tableau.",
  // What a list with a `noResult` of its own never says — and what the tables
  // in the settings fall back on.
  "No results yet": "Rien pour l'instant",
  "Nothing matched your search. Try different criteria, or come back later.":
    "Rien ne correspond. Changez de critères, ou revenez plus tard.",
  "Nothing here": "rien",
  Saved: "Déplacé",
  create: "Nouveau ticket",
  read: "Ouvrir",
  update: "modifier",
  Edit: "Modifier",
  delete: "retirer",
  Cancel: "Annuler",
  "Search...": "Rechercher…",
  "Select...": "Choisir…",
  "Nothing found.": "Rien trouvé.",
  "Nothing found yet": "Rien trouvé pour l'instant",
  "Nothing selected": "Rien de sélectionné",
  "Pick an item from the list to see its details":
    "Choisissez un élément dans la liste pour en voir le détail",
  "View details": "Voir le détail",
  "Clear the search": "Effacer la recherche",
  "This cannot be undone.": "C'est sans retour.",
  "Your changes have been saved": "Vos modifications ont été enregistrées",
  Deleted: "Supprimé",
  "The item has been removed": "L'élément a été supprimé",
  "The item could not be removed": "L'élément n'a pas pu être supprimé",
  "Deletion is not possible": "La suppression est impossible",
  // A value the package prints as it holds it, in the one layout that shows a
  // checkbox without a form around it: the calendar's preview of a schedule.
  true: "oui",
  false: "non",
  /* The calendar, which the schedules are laid out in: the days of its week,
     and the button that walks back through them. `Today`, `Jour`, `Semaine` and
     `Mois` are the package's own French; only what it says in English needs an
     entry here. */
  monday: "lundi",
  tuesday: "mardi",
  wednesday: "mercredi",
  thursday: "jeudi",
  friday: "vendredi",
  saturday: "samedi",
  sunday: "dimanche",
  Previous: "Précédent",
  Today: "Aujourd'hui",
  // The two lines a form ends on, set from `i18n.ts` rather than read from a
  // declaration: they are handed to a toast as they stand.
  // Not `Saved`, which the package already says — and says on a card dropped in
  // another column, where it means "moved".
  Written: "Écrit",
  "Some fields need another look": "Quelques champs demandent une relecture",

  /* -- where you are ------------------------------------------------------- */
  workspace: "espace de travail",
  board: "tableau",
  table: "liste",
  live: "en direct",
  schedules: "récurrences",
  settings: "réglages",
  "the console": "la console",
  "the discussion": "la discussion",
  "the workspace": "l'espace de travail",
  "the ticket": "le ticket",
  "the console's language": "la langue de la console",
  "This browser's, and this browser's only: it is not written to the file. Left alone, the console reads the one your browser asks for.":
    "Celle de ce navigateur, et de lui seul : elle ne s'écrit pas dans le fichier. Sans réponse, la console lit celle que votre navigateur demande.",
  // The bubble in the bottom corner, and what it opens: the ticket's
  // discussion where there is one, the workspace's own everywhere else.
  "open {{pane}}": "ouvrir {{pane}}",
  // Ctrl+K, and the button in the bar that opens it.
  "Command palette": "Palette de commandes",
  "Find a page, a project or a ticket, or run an action.":
    "Trouver une page, un projet ou un ticket, ou lancer une action.",
  "Type a page, a project, a ticket…": "Une page, un projet, un ticket…",
  "Nothing matches.": "Rien ne correspond.",
  "Open or close the console": "Ouvrir ou fermer la console",
  Search: "Rechercher",
  "search a page, a project, a ticket": "chercher une page, un projet, un ticket",
  "A sentence talks to your workspace; a line that starts with > runs a command.":
    "Une phrase parle à votre espace de travail ; une ligne qui commence par > lance une commande.",
  "No such page.": "Cette page n'existe pas.",
  "Reading the board…": "Lecture du tableau…",

  /* -- the menu ------------------------------------------------------------ */
  Board: "Tableau",
  Schedules: "Récurrences",
  Settings: "Réglages",
  Light: "Clair",
  Dark: "Sombre",
  "go light": "passer au clair",
  "go dark": "passer au sombre",
  // The board and Notion, side by side: when they last agreed, and what does
  // not — the line in the bar, its tooltip, and the button beside it.
  "Resynchronise now": "Resynchroniser maintenant",
  "resynchronise now: the whole board read again, the refused moves sent again":
    "resynchroniser maintenant : tout le tableau relu, les déplacements refusés renvoyés",
  "synced {{age}}": "synchro {{age}}",
  "{{count}} s ago": "il y a {{count}} s",
  "last read of Notion: {{at}}": "dernière lecture de Notion : {{at}}",
  "whole board compared: {{at}}": "tableau entier comparé : {{at}}",
  "{{count}} gap(s) found and corrected": "{{count}} écart(s) trouvé(s) et corrigé(s)",
  "{{count}} move(s) waiting for Notion": "{{count}} déplacement(s) en attente d’envoi à Notion",
  "{{count}} move(s) Notion refused": "{{count}} déplacement(s) refusé(s) par Notion",
  "{{count}} ticket(s) changed in Notion meanwhile":
    "{{count}} ticket(s) modifié(s) dans Notion entre-temps",
  "the last read failed: {{why}}": "la dernière lecture a échoué : {{why}}",
  // On a card moved from the console, until Notion has it — and on the toast
  // that says it once when it will not.
  "waiting to be sent to Notion": "en attente d’envoi à Notion",
  "not sent to Notion": "non envoyé à Notion",
  "changed in Notion meanwhile — not overwritten": "modifié dans Notion entre-temps — non écrasé",
  "“{{title}}” did not reach Notion": "« {{title}} » n’est pas arrivé dans Notion",
  "“{{title}}” was changed in Notion meanwhile": "« {{title}} » a été modifié dans Notion entre-temps",
  "event stream": "flux d'événements",
  "connecting…": "connexion…",
  "reconnecting…": "reconnexion…",
  // The menu is a name and a count; the sentences that used to sit under each
  // name are gone, and the words they were made of with them.
  "{{count}} turn(s)": "{{count}} tour(s)",
  // At the foot of the menu, where the stream's own dot is: the version, and
  // the one day it matters, that a newer one is waiting. The row of pills it
  // used to be said this beside four other things nobody was reading.
  "the version this console runs": "la version que fait tourner cette console",
  // The day a newer one is waiting, the version is the button that installs
  // it — and the dialog that asks first, then follows the update to the end.
  "v{{version}} → {{target}}, click to update": "v{{version}} → {{target}}, cliquez pour mettre à jour",
  Update: "Mettre à jour",
  "updating…": "mise à jour…",
  "update failed": "mise à jour échouée",
  "Update Ponos": "Mettre à jour Ponos",
  "Updating Ponos": "Ponos se met à jour",
  "The update failed": "La mise à jour a échoué",
  "Ponos is up to date": "Ponos est à jour",
  "restarted on {{version}}": "redémarré sur {{version}}",
  "Release notes": "Notes de version",
  "What changed": "Ce qui a changé",
  "Ponos downloads the new version, checks that it starts, then restarts the console. The page reconnects on its own; if anything fails, the current version stays.":
    "Ponos télécharge la nouvelle version, vérifie qu'elle démarre, puis redémarre la console. La page se reconnecte seule ; au moindre échec, la version actuelle reste en place.",
  "A ticket is running": "Un ticket est en cours",
  "The update will start once it has finished: nothing is interrupted, and no ticket starts in between.":
    "La mise à jour partira quand il sera terminé : rien n'est interrompu, et aucun ticket ne démarre entre-temps.",
  "Update now": "Mettre à jour maintenant",
  "Update after the ticket": "Mettre à jour après le ticket",
  "Call it off": "Annuler la mise à jour",
  "The update did not start": "La mise à jour n'a pas démarré",
  "Ponos stayed on its previous version": "Ponos est resté sur sa version précédente",
  "This console cannot update Ponos itself: {{why}}. On the machine it runs on, type:":
    "Cette console ne peut pas mettre Ponos à jour elle-même : {{why}}. Sur la machine où il tourne, tapez :",
  Copy: "Copier",
  "Update scheduled": "Mise à jour programmée",
  "It starts as soon as this is over: {{what}}. No ticket starts in between.":
    "Elle part dès que ceci est terminé : {{what}}. Aucun ticket ne démarre entre-temps.",
  "Starting…": "Démarrage…",
  "Downloading the new version": "Téléchargement de la nouvelle version",
  "Checking that it starts, and installing it": "Vérification qu'elle démarre, et installation",
  "Restarting the console": "Redémarrage de la console",
  "The page reconnects by itself once the new version answers.":
    "La page se reconnecte d'elle-même dès que la nouvelle version répond.",
  Log: "Journal",
  // What the server says it waits for, or why it cannot do it from here
  // (`web/upgrade.py`, `web/api.py`).
  "a ticket is running": "un ticket est en cours",
  "a conversation turn is being answered": "une réponse de la conversation est en cours",
  "a command is running": "une commande est en cours",
  "an update is started from the machine the runner is on":
    "une mise à jour se lance depuis la machine où tourne le runner",

  /* -- the board and a ticket ---------------------------------------------- */
  // The columns as the runner names them, for a board that has not named them
  // itself. A board that has is repeated in its own words.
  Ready: "Prêt",
  "In progress": "En cours",
  "In review": "En revue",
  Validated: "Validé",
  Blocked: "Bloqué",
  Failed: "Échoué",
  Done: "Terminé",
  "No status": "Sans statut",
  "Your board, live. Drop a card in another column and the runner is told.":
    "Votre tableau, en direct. Déposez une carte dans une autre colonne et le runner en est averti.",
  "Nothing on the board yet — a ticket moved to the ready column is a session that starts.":
    "Rien sur le tableau — un ticket déposé dans la colonne prête, c'est une session qui démarre.",
  "New ticket": "Nouveau ticket",
  Ticket: "Ticket",
  Title: "Titre",
  "The brief": "Le brief",
  Project: "Projet",
  Status: "Statut",
  Priority: "Priorité",
  Model: "Modèle",
  Cost: "Coût",
  Took: "Durée",
  Scheduled: "Prévu",
  "Ready to run": "Prêt à tourner",
  Create: "Créer",
  "What has to be done, in one line. It is what the board shows.":
    "Ce qu'il y a à faire, en une ligne. C'est ce que le tableau montre.",
  "The whole of what the runner is told. Written on the ticket's page, and read from there.":
    "Tout ce que le runner reçoit. Écrit sur la page du ticket, et lu depuis là.",
  "What must change, where, and how you will know it is done.":
    "Ce qui doit changer, où, et à quoi vous verrez que c'est fait.",
  "A project with a repository gets a pull request; none at all gets a document.":
    "Un projet avec un dépôt donne une pull request ; aucun projet donne un document.",
  "Off, and the ticket is a draft the runner leaves alone.":
    "Décoché, le ticket est un brouillon auquel le runner ne touche pas.",
  "no project — a document": "aucun projet — un document",
  "no project": "aucun projet",
  "open in Notion": "ouvrir dans Notion",
  "pull request": "pull request",
  session: "session",
  "just now": "à l'instant",
  "{{count}} min ago": "il y a {{count}} min",
  "{{count}}h ago": "il y a {{count}} h",
  "{{count}}d ago": "il y a {{count}} j",
  "{{count}}mo ago": "il y a {{count}} mois",
  "Scroll to the last message": "Aller au dernier message",
  "{{count}} min": "{{count}} min",
  "{{count}} h": "{{count}} h",
  "run again": "relancer",
  "make ready": "rendre prêt",
  validate: "valider",
  done: "terminé",
  hold: "mettre en attente",
  project: "projet",
  priority: "priorité",
  model: "modèle",
  spent: "dépensé",
  took: "durée",
  "taken by": "pris par",
  created: "créé",
  scheduled: "prévu",
  "the brief": "le brief",
  "The page is empty: the title is the whole brief.":
    "La page est vide : le titre est tout le brief.",
  "This ticket could not be read.": "Ce ticket n'a pas pu être lu.",
  "Ticket created": "Ticket créé",
  "could not move “{{title}}”": "impossible de déplacer « {{title}} »",
  "“{{title}}” moved to {{column}}": "« {{title}} » déplacé dans {{column}}",
  "hold → {{column}}": "en attente → {{column}}",
  "The runner leaves it alone until it is made ready again.":
    "Le runner n'y touche plus tant qu'il n'est pas remis prêt.",
  "Run “{{title}}” again?": "Relancer « {{title}} » ?",
  "The ticket goes back to {{column}} and the next pass starts a new session on it — a session that is paid for, like the first one.":
    "Le ticket retourne dans {{column}} et la prochaine passe lance une nouvelle session dessus — une session payante, comme la première.",
  "Run it again": "Relancer",
  "Validate “{{title}}”?": "Valider « {{title}} » ?",
  "The runner merges its pull request on its next pass. A merge is not taken back from here.":
    "Le runner fusionne sa pull request à sa prochaine passe. Une fusion ne se défait pas d'ici.",
  "The runner publishes what the ticket holds on its next pass.":
    "Le runner publie le contenu du ticket à sa prochaine passe.",
  Validate: "Valider",
  "Try again": "Réessayer",
  "Back to the board": "Retour au tableau",
  "The server gave no reason.": "Le serveur n'a pas donné de raison.",
  "A ticket needs a title.": "Un ticket a besoin d'un titre.",
  "Remove the banner from the dashboard": "Retirer le bandeau du dashboard",
  "Earlier columns": "Colonnes précédentes",
  "More columns": "Colonnes suivantes",
  "{{count}} empty column(s) hidden": "{{count}} colonne(s) vide(s) masquée(s)",
  "Hide empty columns": "Masquer les colonnes vides",
  "Show them": "Les afficher",
  "Show more ({{count}} left)": "Voir plus ({{count}} restants)",
  "The board could not be read again": "Le tableau n'a pas pu être relu",
  "Map a project to a folder": "Associer un projet à un dossier",
  "A schedule written here is a ticket that comes back on its own.":
    "Une récurrence écrite ici est un ticket qui revient tout seul.",
  Close: "Fermer",
  Link: "Lien",
  "timer switched off — ticket-runner enable": "minuterie arrêtée — ticket-runner enable",
  "timer not installed — ticket-runner enable": "minuterie non installée — ticket-runner enable",
  "timer masked in systemd": "minuterie masquée dans systemd",
  "timer on, with no next run": "minuterie active, sans prochaine passe",
  "no systemd on this machine": "pas de systemd sur cette machine",
  "timer state unknown": "état de la minuterie inconnu",

  /* -- a ticket's terminal -------------------------------------------------- */
  "Talking to": "Discussion avec",
  "No ticket open": "Aucun ticket ouvert",
  "Everything said on the ticket, oldest first. What you type is a comment on it.":
    "Tout ce qui s'est dit sur le ticket, du plus ancien au plus récent. Ce que vous écrivez est un commentaire sur celui-ci.",
  "Open a ticket from the board.": "Ouvrez un ticket depuis le tableau.",
  "Nothing has been said on this ticket yet.": "Rien n'a encore été dit sur ce ticket.",
  "reading the discussion…": "lecture de la discussion…",
  "an answer to its question runs it again": "une réponse à sa question le relance",
  "asks it for words instead": "lui demande des mots plutôt que du travail",
  "Answer the ticket, or ask it something": "Répondez au ticket, ou demandez-lui quelque chose",
  "read the discussion again": "relire la discussion",
  "reading…": "lecture…",
  reread: "relire",
  "sending…": "envoi…",
  "not written: {{why}}": "non écrit : {{why}}",
  "could not read the discussion: {{why}}": "impossible de lire la discussion : {{why}}",
  you: "vous",
  problem: "problème",
  command: "commande",
  "the runner": "le runner",

  /* -- the workspace console ------------------------------------------------ */
  "Talking to your machine": "Parler à votre machine",
  "A sentence reaches your repositories and the board; a line that starts with `>` reaches the CLI.":
    "Une phrase atteint vos dépôts et le tableau ; une ligne qui commence par `>` atteint le CLI.",
  "Ask the workspace, or type >status": "Demandez à l'espace de travail, ou tapez >status",
  "Ask me anything about your workspace — I can read your repositories, look at the board and create tickets. Type > followed by a command (>status, >list, >doctor) to use the CLI directly.":
    "Demandez-moi ce que vous voulez sur votre espace de travail — je peux lire vos dépôts, regarder le tableau et créer des tickets. Tapez > suivi d'une commande (>status, >list, >doctor) pour passer directement par le CLI.",
  Send: "Envoyer",
  "new conversation": "nouvelle conversation",
  "start a new conversation": "démarrer une nouvelle conversation",
  "exit {{code}}": "sortie {{code}}",
  "Full screen": "Plein écran",
  "Leave full screen": "Quitter le plein écran",
  "Resize the drawer": "Redimensionner le panneau",
  "Copy the command that resumes this conversation in a terminal":
    "Copier la commande qui reprend cette conversation dans un terminal",
  Copied: "Copié",
  "Copy the full id": "Copier l’id complet",
  "Drop to attach to your message": "Déposez pour joindre à votre message",
  "Photos, videos and documents, up to {{limit}} MB each":
    "Photos, vidéos et documents, jusqu'à {{limit}} Mo chacun",

  /* -- the message bar ------------------------------------------------------- */
  "Attach a file": "Joindre un fichier",
  "Attach a photo, a video or a document — or drop it, or paste it":
    "Joindre une photo, une vidéo ou un document — ou le déposer, ou le coller",
  "Remove {{name}}": "Retirer {{name}}",
  "Open {{name}}": "Ouvrir {{name}}",
  "A file sent to the workspace": "Un fichier envoyé à l'espace de travail",
  "“{{name}}” is over {{limit}} MB": "« {{name}} » dépasse {{limit}} Mo",
  "“{{name}}” is not a file the workspace can take":
    "« {{name}} » n'est pas un fichier que l'espace de travail accepte",
  "The limit is web.attachment_max_mb, in the settings.":
    "La limite est web.attachment_max_mb, dans les paramètres.",
  "Images (png, jpg, webp, gif), videos (mp4, webm, mov) and documents (pdf, txt, md, csv, json, docx, xlsx).":
    "Images (png, jpg, webp, gif), vidéos (mp4, webm, mov) et documents (pdf, txt, md, csv, json, docx, xlsx).",
  "“{{name}}” could not be attached": "« {{name}} » n'a pas pu être joint",
  Commands: "Commandes",
  Dictate: "Dicter",
  Recording: "Enregistrement",
  "Transcribing…": "Transcription…",
  Stop: "Arrêter",
  "The workspace is answering": "L'espace de travail répond",
  // The Stop the arrow becomes while a turn runs, and what a stopped turn says.
  "Stopping…": "Arrêt en cours…",
  "stopped by you": "interrompu par vous",
  // Ponos, while the workspace answers: one line about the last step. See `thinking.ts`.
  "thinking…": "réfléchit…",
  "stopping…": "s'arrête…",
  "reading {{name}}…": "lit {{name}}…",
  "reading a file…": "lit un fichier…",
  "editing {{name}}…": "modifie {{name}}…",
  "editing a file…": "modifie un fichier…",
  "writing {{name}}…": "écrit {{name}}…",
  "writing a file…": "écrit un fichier…",
  "searching the code…": "cherche dans le code…",
  "looking it up on the web…": "cherche sur le web…",
  "handing part of it to a helper…": "confie une partie à un assistant…",
  "planning the work…": "planifie le travail…",
  "fixing an error…": "corrige une erreur…",
  "looking at the board…": "regarde le tableau…",
  "looking at the history…": "regarde l'historique…",
  "running the tests…": "lance les tests…",
  "running a command…": "lance une commande…",
  "working…": "travaille…",
  // The steps, folded under the turn they belong to.
  "Show the steps": "Voir les étapes",
  "Hide the steps": "Masquer les étapes",
  "{{count}} step(s) went wrong": "{{count}} étape(s) en erreur",
  "Dictation is not available": "La dictée n'est pas disponible",
  "Dictation is transcribed by OpenRouter: add an OpenRouter key in the settings":
    "La dictée est transcrite par OpenRouter : ajoutez une clé OpenRouter dans les paramètres",
  "This browser gives the page no microphone": "Ce navigateur ne donne aucun micro à la page",
  "The microphone is blocked for this page — allow it in the browser's site settings":
    "Le micro est bloqué pour cette page — autorisez-le dans les paramètres du site du navigateur",
  "The microphone could not be opened": "Le micro n'a pas pu être ouvert",
  "Nothing was heard": "Rien n'a été entendu",
  "The recording could not be transcribed": "L'enregistrement n'a pas pu être transcrit",

  /* -- a ticket's session, and the runner's figures ----------------------------- */
  "writing now": "en train d'écrire",
  "the last session, read-only": "la dernière session, en lecture seule",
  "Follow the session": "Suivre la session",
  "starting…": "démarrage…",
  "The session has not written anything yet. Its first step appears here as it happens.":
    "La session n'a encore rien écrit. Sa première étape apparaît ici dès qu'elle a lieu.",
  "No journal is left for this ticket: its session log is gone, or it never ran.":
    "Il ne reste aucun journal pour ce ticket : son journal de session a disparu, ou il n'a jamais tourné.",
  sessions: "sessions",
  "{{count}} ticket(s) in progress": "{{count}} ticket(s) en cours",
  "nothing in progress": "rien en cours",
  timer: "minuterie",
  "timer {{state}}": "minuterie {{state}}",
  off: "arrêtée",
  "between two runs": "entre deux passes",
  handled: "traités",
  "${{amount}} spent so far": "{{amount}} $ dépensés jusqu'ici",
  "{{count}} step(s)": "{{count}} étape(s)",
  "Out of credit until {{at}}. The subscription's window is spent: tickets stay where they are, and the first run after that takes them again.":
    "Crédits épuisés jusqu'à {{at}}. La fenêtre de l'abonnement est consommée : les tickets restent où ils sont, et la première passe après ce moment les reprend.",
  "`claude` was not found on this machine: no session can start.":
    "`claude` est introuvable sur cette machine : aucune session ne peut démarrer.",

  /* -- what comes back on its own -------------------------------------------- */
  /* `Cadence`, `Model` and `Priority` are already said above, where the
     configuration says them; `table` is said where the board says it. */
  Schedule: "Récurrence",
  calendar: "calendrier",
  "A row says what to make and how often; when the moment comes the runner writes the ticket into the ready column and steps back.":
    "Une ligne dit quoi faire et à quelle fréquence ; le moment venu, le runner écrit le ticket dans la colonne prête et se retire.",
  "{{count}} of {{total}} on": "{{count}} sur {{total}} active(s)",
  "nothing yet": "rien pour l'instant",
  "Nothing repeats here": "Rien ne se répète ici",
  "This workspace has no “{{page}}” page.":
    "Cet espace de travail n'a pas de page « {{page}} ».",
  "builds it.": "la construit.",
  "Nothing repeats here yet": "Rien ne se répète encore ici",
  "A row in the “{{page}}” database is a ticket that comes back.":
    "Une ligne de la base « {{page}} », c'est un ticket qui revient.",
  "none of this runs.": "rien de tout cela ne tourne.",
  "This schedule is no longer on the board.": "Cette récurrence n'est plus sur le tableau.",
  // The columns of the list, and the fields of the form that writes a row.
  At: "À",
  Day: "Jour",
  On: "Active",
  Next: "Prochaine",
  Last: "Dernière",
  Problem: "Problème",
  "New schedule": "Nouvelle récurrence",
  "A ticket that comes back": "Un ticket qui revient",
  "nothing said": "rien de précisé",
  "What the ticket it makes will be called. Every occurrence carries this name.":
    "Le nom du ticket qu'elle produit. Chaque occurrence porte ce nom.",
  "Weekly dependency review": "Revue hebdomadaire des dépendances",
  "The hour, written 09:00. Empty, and the hour the pass runs at answers.":
    "L'heure, écrite 09:00. Vide, c'est l'heure de la passe qui répond.",
  "Which day a weekly or monthly one lands on.":
    "Le jour où tombe une récurrence hebdomadaire ou mensuelle.",
  "Monday, or 1 to 31": "Lundi, ou 1 à 31",
  "Off, and nothing is born — the row is kept, and the hours with it.":
    "Décochée, rien ne naît — la ligne est gardée, et ses horaires avec.",
  "Created unticked: nothing is born until you turn it on.":
    "Créée décochée : rien ne naît tant que vous ne l'activez pas.",
  "A schedule needs a name": "Une récurrence a besoin d'un nom",
  "Copied into every ticket it makes: what to do, where, and how you will know it is done.":
    "Recopié dans chaque ticket qu'elle produit : quoi faire, où, et comment savoir que c'est fait.",
  "What each occurrence has to do.": "Ce que chaque occurrence doit faire.",

  /* -- the Markdown editor ---------------------------------------------------- */
  /* The menu `/` opens and the bar over a selection. `Context` and `Link` are
     already said above. */
  "Paste a link…": "Collez un lien…",
  Bold: "Gras",
  Italic: "Italique",
  Strikethrough: "Barré",
  "Inline code": "Code en ligne",
  Text: "Texte",
  "Heading 1": "Titre 1",
  "Heading 2": "Titre 2",
  "Heading 3": "Titre 3",
  Quote: "Citation",
  Divider: "Séparateur",
  List: "Liste",
  "Bullet list": "Liste à puces",
  "Numbered list": "Liste numérotée",
  "To-do list": "Liste de tâches",
  Advanced: "Avancé",
  Code: "Code",
  Table: "Tableau",

  /* -- the projects ----------------------------------------------------------- */
  /* `Projects`, `Project`, `Repository`, `Where it is` and `The brief` are
     already said above, where the board and the configuration say them. */
  "What the tickets are about.": "Ce dont parlent les tickets.",
  "What the tickets are about: where the work happens, and what conventions hold there. One with no repository is not a mistake — its tickets come back as a document.":
    "Ce dont parlent les tickets : où se fait le travail, et quelles conventions y règnent. Un projet sans dépôt n'est pas une erreur — ses tickets reviennent sous forme de document.",
  "A project says where the work happens and what conventions hold there. One with no repository is not a mistake: its tickets come back as a document.":
    "Un projet dit où se fait le travail et quelles conventions y règnent. Un projet sans dépôt n'est pas une erreur : ses tickets reviennent sous forme de document.",
  cards: "cartes",
  Kind: "Nature",
  Repository: "Dépôt",
  "On this machine": "Sur cette machine",
  Tickets: "Tickets",
  "code work": "travail de code",
  "document work": "travail de rédaction",
  "{{count}} ticket(s)": "{{count}} ticket(s)",
  repository: "dépôt",
  "on this machine": "sur cette machine",
  "wherever the clone is": "là où se trouve le clone",
  "Nothing declares a repository, so its tickets produce a document rather than a pull request.":
    "Rien ne déclare de dépôt : ses tickets produisent un document plutôt qu'une pull request.",
  "from the configuration": "depuis la configuration",
  "path set in the configuration": "chemin fixé dans la configuration",
  "{{count}} of {{total}} projects have a repository": "{{count}} projets sur {{total}} ont un dépôt",
  "{{count}} of {{total}} projects has a repository": "{{count}} projet sur {{total}} a un dépôt",
  "~/workspace/that-repository": "~/workspace/ce-depot",
  "Reading the projects…": "Lecture des projets…",
  "No project yet — a ticket without one comes back as a document.":
    "Aucun projet pour l'instant — un ticket sans projet revient sous forme de document.",
  "is where a repository is looked for, and cloned into when it is nowhere.":
    "est l'endroit où un dépôt est cherché, et cloné quand il n'est nulle part.",
  "This project could not be read.": "Ce projet n'a pas pu être lu.",
  "No project called “{{name}}”.": "Aucun projet ne s'appelle « {{name}} ».",
  "Nothing is written on this page, so its tickets are told about the workspace and nothing about the project.":
    "Rien n'est écrit sur cette page : ses tickets reçoivent le contexte de l'espace de travail et rien sur le projet.",
  "This project is a line in config.toml and has no page: the board has never heard of it, so there is nothing here to write a brief on.":
    "Ce projet est une ligne de config.toml et n'a pas de page : le tableau n'en a jamais entendu parler, il n'y a donc rien ici sur quoi écrire un brief.",
  "Change its path in the settings.": "Changez son chemin dans les réglages.",
  "Open the project's page": "Ouvrir la page du projet",
  "Open full size": "Ouvrir en grand",
  "Image attached to the ticket": "Image jointe au ticket",
  "File attached to the ticket": "Fichier joint au ticket",
  "its pictures, the brief as it reads, and the way to Notion.":
    "ses images, le brief tel qu'il se lit, et le chemin vers Notion.",

  /* -- a project's pictures ------------------------------------------------ */
  "Change the image": "Changer l'image",
  "The cover and the icon of the project's page, in Notion as well as here.":
    "La couverture et l'icône de la page du projet, dans Notion comme ici.",
  Cover: "Couverture",
  Icon: "Icône",
  "Drop an image here, or paste one.": "Déposez une image ici, ou collez-en une.",
  "Choose a file": "Choisir un fichier",
  "Remove the cover": "Retirer la couverture",
  "Remove the icon": "Retirer l'icône",
  "Or the address of an image": "Ou l'adresse d'une image",
  "Or an emoji": "Ou un emoji",
  "Another emoji": "Un autre emoji",
  "Sending…": "Envoi…",
  "Use this image": "Utiliser cette image",
  "That file is not an image.": "Ce fichier n'est pas une image.",
  "This image could not be read.": "Cette image n'a pas pu être lue.",
  "The cover is changed": "La couverture est changée",
  "The icon is changed": "L'icône est changée",
  "The image was not changed": "L'image n'a pas été changée",
  "Kept here, not yet in Notion": "Gardée ici, pas encore dans Notion",
  "It is sent again at the next reading of the board.":
    "Elle sera renvoyée à la prochaine lecture du tableau.",
  "Not in Notion yet — kept here, and sent again at the next reading: {{why}}":
    "Pas encore dans Notion — gardée ici, et renvoyée à la prochaine lecture : {{why}}",
  "Not in Notion yet — sent again at the next reading.":
    "Pas encore dans Notion — renvoyée à la prochaine lecture.",
  "Changed on both sides: Notion's picture was newer, and it won.":
    "Changée des deux côtés : celle de Notion était la plus récente, elle l'emporte.",
  "Changed on both sides: this one was newer, and it won in Notion too.":
    "Changée des deux côtés : celle-ci était la plus récente, elle l'emporte aussi dans Notion.",
  "This project is a line in config.toml; it is changed in the settings.":
    "Ce projet est une ligne de config.toml ; il se modifie dans les réglages.",
  "What the board calls it. A ticket points at this page, not at this name.":
    "Le nom que lui donne le tableau. Un ticket pointe vers cette page, pas vers ce nom.",
  "owner/repo, or the clone URL. Empty, and its tickets come back as a document.":
    "propriétaire/dépôt, ou l'URL du clone. Vide, ses tickets reviennent sous forme de document.",
  "Only needed where the repository cannot be found on its own. Worktrees are made beside it, never in it.":
    "Utile seulement quand le dépôt ne se trouve pas tout seul. Les worktrees sont créés à côté, jamais dedans.",
  "The audience, the voice, the conventions, the things never to do. Every ticket of this project is told it before it is told the ticket.":
    "Le public, le ton, les conventions, ce qu'il ne faut jamais faire. Chaque ticket de ce projet le reçoit avant de recevoir le ticket.",
  "Write it as you would brief somebody joining the project.":
    "Écrivez-le comme à quelqu'un qui arrive sur le projet.",

  /* -- the standing context --------------------------------------------------- */
  Context: "Contexte",
  "What every ticket is told first.": "Ce qu'on dit d'abord à chaque ticket.",
  "Before the project's brief and before the ticket itself. It is what makes an answer sound like you rather than like nobody — and you pay for it on every single ticket.":
    "Avant le brief du projet et avant le ticket lui-même. C'est ce qui fait qu'une réponse vous ressemble plutôt que de ne ressembler à personne — et vous le payez sur chaque ticket.",
  "{{count}} characters in every prompt": "{{count}} caractères dans chaque prompt",
  Reread: "Relire",
  "Saving…": "Enregistrement…",
  "Reading the context…": "Lecture du contexte…",
  "This workspace has no “{{page}}” page, so there is nowhere to write.":
    "Cet espace de travail n'a pas de page « {{page}} » : il n'y a nulle part où écrire.",
  "Who you are, what the team does, the stack, the conventions, the things never to do. Keep it to one screen.":
    "Qui vous êtes, ce que fait l'équipe, la stack, les conventions, ce qu'il ne faut jamais faire. Tenez-vous à un écran.",
  "saved to the “{{page}}” page, and read again on the next run.":
    "enregistré dans la page « {{page}} », relu à la prochaine passe.",
  "The context is saved": "Le contexte est enregistré",
  "Every ticket from here on is told this.": "Chaque ticket à partir de maintenant le reçoit.",
  "The context was not saved": "Le contexte n'a pas été enregistré",

  /* -- the statistics ------------------------------------------------------- */
  Statistics: "Statistiques",
  "What came in, what went out.": "Ce qui est entré, ce qui est sorti.",
  "Tickets created, closed and still open, day after day. Open means any column but done — blocked and failed included.":
    "Les tickets créés, fermés et encore ouverts, jour après jour. Ouvert veut dire toute colonne sauf terminé — bloqués et échoués compris.",
  "7 days": "7 jours",
  "1 month": "1 mois",
  "3 months": "3 mois",
  Custom: "Personnalisée",
  From: "Du",
  To: "Au",
  "Counting the tickets…": "Je compte les tickets…",
  Open: "Ouverts",
  Closed: "Fermés",
  Created: "Créés",
  Spent: "Dépensé",
  "on the evening of the last day": "au soir du dernier jour",
  "moved to done in the period": "passés en terminé sur la période",
  "added to the board in the period": "ajoutés au tableau sur la période",
  "by the runner's sessions in the period": "par les sessions du runner sur la période",
  "No ticket on the board over this period.": "Aucun ticket sur le tableau pendant cette période.",
  "Per day": "Par jour",
  "Created and closed": "Créés et fermés",
  "Tickets created and closed per day": "Tickets créés et fermés par jour",
  "Every evening": "Chaque soir",
  "Open tickets": "Tickets ouverts",
  "Tickets still open, evening after evening": "Tickets encore ouverts, soir après soir",
  "Running total": "Cumul",
  "Spent since the start of the period": "Dépensé depuis le début de la période",
  "Created in the period": "Créés sur la période",
  "By status": "Par statut",
  "By project": "Par projet",
  "No project": "Sans projet",
  "No ticket created in the period.": "Aucun ticket créé sur la période.",
  "A closing is dated by the runner's history when the runner closed the ticket ({{history}}), by the page's last edit in Notion otherwise ({{edited}}).":
    "Une fermeture est datée par l'historique du runner quand c'est lui qui a fermé le ticket ({{history}}), sinon par la dernière modification de la page dans Notion ({{edited}}).",

  /* -- the settings page, in its own words ----------------------------------- */
  "Configure the runner.": "Configurez le runner.",
  "A blank field uses the runner’s own default, shown greyed inside it; under each field, its key in config.toml. Your tokens stay on this machine: they are never sent to this page.":
    "Un champ vide prend la valeur par défaut du runner, affichée en gris à l'intérieur ; sous chaque champ, sa clé dans config.toml. Vos jetons restent sur cette machine : ils ne sont jamais envoyés à cette page.",
  "Reading the configuration…": "Lecture de la configuration…",
  "could not read the configuration: {{why}}": "impossible de lire la configuration : {{why}}",
  "default · {{value}}": "défaut · {{value}}",
  yes: "oui",
  no: "non",
  nothing: "rien",
  "not set": "non renseigné",
  "set · ends {{preview}}": "renseigné · finit par {{preview}}",
  forget: "oublier",
  "takes effect once": "prend effet une fois que",
  "Written to the file": "Écrit dans le fichier",
  "nothing typed here": "rien de tapé ici",
  "Show the advanced settings ({{count}})": "Afficher les réglages avancés ({{count}})",
  "Hide the advanced settings": "Masquer les réglages avancés",
  "Its key in config.toml": "Sa clé dans config.toml",

  /* -- the two `name = value` tables, each a resource of its own -------------
     `Projects`, `Project` and the two section blurbs are already said where
     `web/settings.py` describes the file; only what the rows add is here. */
  "Where it is": "Où il se trouve",
  "Spelled as the project page is, or the ticket finds no repository.":
    "Écrit comme la page du projet l'écrit, sinon le ticket ne trouve aucun dépôt.",
  "The repository itself. Worktrees are made beside it, never in it.":
    "Le dépôt lui-même. Les worktrees sont créés à côté, jamais dedans.",
  "A row with no name maps nothing.": "Une ligne sans nom ne fait correspondre rien.",
  "A project mapped to nothing is a row to remove.":
    "Un projet qui ne mène nulle part est une ligne à retirer.",
  "No mapping here — the project pages carry it.":
    "Aucune correspondance ici — ce sont les pages de projet qui la portent.",
  "add a project": "ajouter un projet",
  "Remove this project": "Retirer ce projet",
  Accounts: "Comptes",
  Owner: "Propriétaire",
  Account: "Compte",
  "As GitHub spells it in the URL of a repository, before the slash.":
    "Tel que GitHub l'écrit dans l'URL d'un dépôt, avant la barre oblique.",
  "The account gh auth status names — logged in once with gh auth login.":
    "Le compte que nomme gh auth status — connecté une fois avec gh auth login.",
  "A row with no owner names nobody.": "Une ligne sans propriétaire ne nomme personne.",
  "An owner mapped to nothing is a row to remove.":
    "Un propriétaire qui ne mène nulle part est une ligne à retirer.",
  "One GitHub here — everything goes out as whoever gh is signed in as.":
    "Un seul GitHub ici — tout part sous le compte auquel gh est connecté.",
  "add an account": "ajouter un compte",
  "Remove this account": "Retirer ce compte",
  "one change, unsaved": "une modification non enregistrée",
  "{{count}} changes, unsaved": "{{count}} modifications non enregistrées",
  revert: "annuler",
  Save: "Enregistrer",
  "saving…": "enregistrement…",
  "one setting": "un réglage",
  "{{count}} settings": "{{count}} réglages",
  "Saved {{how}}: {{names}}.": "Enregistré {{how}} : {{names}}.",
  "Takes effect once {{after}}.": "Prend effet une fois que {{after}}.",
  "Nothing to save — the file already said that.":
    "Rien à enregistrer — le fichier le disait déjà.",
  "Not saved: {{why}}": "Non enregistré : {{why}}",
  "does that token reach your board?": "est-ce que ce jeton atteint votre tableau ?",
  "send yourself a test message": "envoyez-vous un message de test",

  /* -- the settings page, as `web/settings.py` describes the file ------------- */
  // The server sends one entry per key of `config.toml` — a title, a sentence
  // of help, what has to happen for a change to count, the words a choice is
  // shown in — and they arrive in the words that file is written in. Held to it
  // by the test suite. In the order the page draws them.

  "Notion connection": "Connexion à Notion",
  "The Notion integration that reads and writes your board. `ticket-runner init <page-url>` fills all of this in for you: come here only to fix it by hand.":
    "L'intégration Notion qui lit et écrit votre tableau. `ticket-runner init <page-url>` remplit tout ceci pour vous : ne venez ici que pour corriger à la main.",
  "Integration token": "Jeton d'intégration",
  "The secret starting with `ntn_`, from notion.so/profile/integrations. Share your workspace page with the integration too: a token alone sees nothing.":
    "Le secret qui commence par `ntn_`, depuis notion.so/profile/integrations. Partagez aussi votre page d'espace de travail avec l'intégration : un jeton seul ne voit rien.",
  "Workspace page": "Page de l'espace de travail",
  "The Notion page that holds the Tickets, Projects, Agents and Context databases. Paste its URL: only the identifier is kept.":
    "La page Notion qui contient les bases Tickets, Projects, Agents et Context. Collez son URL : seul l'identifiant est gardé.",
  "Word that asks for an answer": "Mot pour demander une réponse",
  "Write it in a ticket's comment — `@claude what is blocking?` — and the runner answers in the thread instead of working. The integration's own name works too.":
    "Écrivez-le dans un commentaire de ticket — `@claude qu'est-ce qui bloque ?` — et le runner répond dans le fil au lieu de travailler. Le nom de l'intégration marche aussi.",
  "Tickets database (without a workspace page)": "Base des tickets (sans page d'espace de travail)",
  "Only if the workspace page is empty: the tickets database on its own, by URL or identifier.":
    "Seulement si la page d'espace de travail est vide : la base des tickets seule, par son URL ou son identifiant.",

  "Board storage": "Stockage du tableau",
  "Where your tickets live: in Notion (the default), as Markdown files on this machine, or in both, kept in sync.":
    "Où vivent vos tickets : dans Notion (par défaut), en fichiers Markdown sur cette machine, ou dans les deux, synchronisés.",
  "Board kept in": "Tableau stocké dans",
  "Markdown files need no Notion token and no network. Both writes to the two and reconciles them.":
    "Les fichiers Markdown ne demandent ni jeton Notion ni réseau. Les deux écrit des deux côtés et les réconcilie.",
  "the console has to be restarted": "la console doit être redémarrée",
  Notion: "Notion",
  "Markdown files": "Fichiers Markdown",
  "Both, kept in sync": "Les deux, synchronisés",
  "Markdown folder": "Dossier Markdown",
  "The folder holding `tickets/`, `projects/`, `agents/`, `schedules/` and `context.md`. You can put it under git.":
    "Le dossier qui contient `tickets/`, `projects/`, `agents/`, `schedules/` et `context.md`. Vous pouvez le mettre sous git.",
  "When both sides changed": "Quand les deux côtés ont changé",
  "A page edited in Notion and in the files since the last sync: the most recent edit wins, the other is kept in the sync journal.":
    "Une page modifiée dans Notion et dans les fichiers depuis la dernière synchronisation : la modification la plus récente l'emporte, l'autre est gardée dans le journal de synchronisation.",
  "Keep the most recent": "Garder la plus récente",
  "Sync before every check of the board": "Synchroniser avant chaque consultation du tableau",
  "Only for Both. Off: the two only sync when you run `ticket-runner sync`.":
    "Seulement pour Les deux. Désactivé : ils ne se synchronisent que lorsque vous lancez `ticket-runner sync`.",

  "Running tickets": "Exécution des tickets",
  "How often the board is checked, how many tickets run at once, and how long each one may take.":
    "À quelle fréquence le tableau est consulté, combien de tickets tournent à la fois, et combien de temps chacun peut prendre.",
  "Repositories folder": "Dossier des dépôts",
  "Where your git repositories are, e.g. `~/workspace`. A project's repository is looked for here — and cloned here when it is missing.":
    "Là où sont vos dépôts git, par ex. `~/workspace`. Le dépôt d'un projet y est cherché — et cloné ici s'il manque.",
  "Check the board every (seconds)": "Consulter le tableau toutes les (secondes)",
  "The delay between two looks for Ready tickets. 10 starts a ticket within ten seconds; a look that finds nothing costs one request.":
    "Le délai entre deux recherches de tickets prêts. 10 démarre un ticket en moins de dix secondes ; une recherche qui ne trouve rien coûte une requête.",
  "`ticket-runner enable` writes it into the systemd timer":
    "`ticket-runner enable` l'écrit dans la minuterie systemd",
  "Tickets in parallel": "Tickets en parallèle",
  "How many Claude sessions run at the same time. Each is a full session: 2 suits a laptop.":
    "Combien de sessions Claude tournent en même temps. Chacune est une session complète : 2 convient à un portable.",
  "Time limit per ticket (minutes)": "Durée maximale par ticket (minutes)",
  "Past it, the session is stopped and the ticket fails, with the reason.":
    "Au-delà, la session est arrêtée et le ticket passe en échec, avec la raison.",
  "Language of the reports": "Langue des comptes rendus",
  "What the runner writes on tickets and sends to your phone, and the language sessions are asked to answer in. Not set: reports in English, and each session answers in the ticket's language.":
    "Ce que le runner écrit sur les tickets et envoie sur votre téléphone, et la langue dans laquelle on demande aux sessions de répondre. Non choisie : comptes rendus en anglais, et chaque session répond dans la langue du ticket.",
  English: "Anglais",
  French: "Français",
  "Test mode (changes nothing)": "Mode test (ne modifie rien)",
  "The runner says what it would do and does none of it: no branch, no commit, no write to the board. Useful while you set things up.":
    "Le runner dit ce qu'il ferait et n'en fait rien : ni branche, ni commit, ni écriture sur le tableau. Utile pendant la mise en place.",
  "What a session may do without asking": "Ce qu'une session peut faire sans demander",
  "Nobody is there to approve: anything but “Everything” leaves a session waiting until it times out.":
    "Personne n'est là pour valider : autre chose que « Tout » laisse une session attendre jusqu'à expiration.",
  "Everything, without asking (bypassPermissions)": "Tout, sans demander (bypassPermissions)",
  "Edit files, no commands (acceptEdits)": "Modifier les fichiers, sans commandes (acceptEdits)",
  "Ask each time (default)": "Demander à chaque fois (default)",
  "Read only (plan)": "Lecture seule (plan)",
  "Keep session logs (days)": "Garder les journaux de session (jours)",
  "How long each session's log stays on this machine. 0 keeps them forever.":
    "Combien de temps le journal de chaque session reste sur cette machine. 0 les garde pour toujours.",

  "Models and usage": "Modèles et consommation",
  "Which Claude model works the tickets, and how much of your subscription the runner may spend.":
    "Quel modèle Claude traite les tickets, et quelle part de votre abonnement le runner peut consommer.",
  "Default model": "Modèle par défaut",
  "`opus`, `sonnet` or `haiku`, for instance. Empty: Claude Code's own default. A ticket's Model column wins over it.":
    "`opus`, `sonnet` ou `haiku`, par exemple. Vide : le modèle par défaut de Claude Code. La colonne Model d'un ticket l'emporte.",
  "Pause when the subscription limit is reached":
    "Patienter quand la limite de l'abonnement est atteinte",
  "On: the ticket waits, ticked Waiting for credit, and starts again when the usage window resets. Off: every ticket fails until then.":
    "Activé : le ticket patiente, coché En attente de crédit, et repart quand la fenêtre d'usage se renouvelle. Désactivé : chaque ticket échoue jusque-là.",
  "Share kept for your own use (%)": "Part gardée pour votre usage (%)",
  "At 5, no new ticket starts past 95 % of the session or weekly limit, so you still have Claude for yourself. Running tickets finish. From 0 (use it all) to 50.":
    "À 5, aucun nouveau ticket ne démarre au-delà de 95 % de la limite de session ou de la semaine : il vous reste Claude pour vous. Les tickets en cours vont au bout. De 0 (tout utiliser) à 50.",

  "Repositories and pull requests": "Dépôts et pull requests",
  "What a Code ticket turns into: a branch, a pull request, and the merge once you validate it.":
    "Ce que devient un ticket Code : une branche, une pull request, et la fusion une fois que vous l'avez validé.",
  "Open a pull request": "Ouvrir une pull request",
  "Once the session succeeds, on GitHub — needs `gh` installed and signed in. Opening one merges nothing.":
    "Une fois la session réussie, sur GitHub — il faut `gh` installé et connecté. L'ouvrir ne fusionne rien.",
  "Push the branch": "Pousser la branche",
  "Send the ticket's branch to the remote once it has commits. Off: the work stays on this machine.":
    "Envoyer la branche du ticket sur le dépôt distant dès qu'elle a des commits. Désactivé : le travail reste sur cette machine.",
  "Merge a validated pull request as": "Fusionner une pull request validée en",
  "Applied when you move a ticket to Validated.": "Appliqué quand vous passez un ticket en Validé.",
  "One commit (squash)": "Un seul commit (squash)",
  "A merge commit (merge)": "Un commit de fusion (merge)",
  "Commits replayed (rebase)": "Commits rejoués (rebase)",
  "Base branch": "Branche de base",
  "The branch a ticket's branch starts from, e.g. `main`. Empty: the repository's default branch.":
    "La branche d'où part la branche d'un ticket, par ex. `main`. Vide : la branche par défaut du dépôt.",
  "Resolve merge conflicts automatically": "Résoudre les conflits de fusion automatiquement",
  "When a validated pull request conflicts, a session resolves it, runs the project's checks, then merges. A conflict that needs a decision blocks the ticket with the question.":
    "Quand une pull request validée est en conflit, une session le résout, lance les vérifications du projet, puis fusionne. Un conflit qui demande une décision bloque le ticket avec la question.",
  "Branch name prefix": "Préfixe des noms de branche",
  "`ticket/` gives `ticket/1a2b3c4d-remove-the-header`.":
    "`ticket/` donne `ticket/1a2b3c4d-remove-the-header`.",
  "Fetch the remote before branching": "Récupérer le dépôt distant avant de créer la branche",
  "So a ticket starts from the latest code rather than last week's.":
    "Pour qu'un ticket parte du code le plus récent, et non de celui de la semaine dernière.",
  "Rebase on the base branch before pushing": "Rebaser sur la branche de base avant le push",
  "The base branch moves while a session works: the branch is replayed on top of it before the push, and a merge refused for being behind is retried once.":
    "La branche de base avance pendant qu'une session travaille : la branche est rejouée par-dessus avant le push, et une fusion refusée pour retard est retentée une fois.",
  "Projects whose conflicts are left to you": "Projets dont les conflits vous reviennent",
  "Project names, separated by commas. A conflict there blocks the ticket instead of being resolved.":
    "Noms de projets, séparés par des virgules. Un conflit y bloque le ticket au lieu d'être résolu.",
  "Model that resolves conflicts": "Modèle qui résout les conflits",
  "Empty: the model the ticket was worked with.":
    "Vide : le modèle avec lequel le ticket a été traité.",
  "Wait for CI before merging (minutes)": "Attendre la CI avant de fusionner (minutes)",
  "After a resolved conflict, or with automatic validation. 0 does not wait — GitHub still refuses a merge a required check has not passed.":
    "Après un conflit résolu, ou avec la validation automatique. 0 n'attend pas — GitHub refuse quand même une fusion qu'une vérification obligatoire n'a pas validée.",
  "Keep a failed ticket's work folder": "Garder le dossier de travail d'un ticket en échec",
  "Its worktree stays as the session left it, for you to look at. `ticket-runner clean --force` removes them.":
    "Son worktree reste tel que la session l'a laissé, pour que vous l'examiniez. `ticket-runner clean --force` les supprime.",

  "Project folders": "Dossiers des projets",
  "Which folder on this machine holds a Notion project's repository. Only needed when it is not found on its own: a `path` or `github` property on the project page does the same, for every machine.":
    "Quel dossier de cette machine contient le dépôt d'un projet Notion. Utile seulement s'il n'est pas trouvé tout seul : une propriété `path` ou `github` sur la page du projet fait la même chose, pour toutes les machines.",

  "GitHub accounts": "Comptes GitHub",
  "Which `gh` account works for each GitHub owner, when this machine uses several — yours and a client's. Left, the owner as in the repository's URL; right, the account as `gh auth status` lists it. Sign each one in once with `gh auth login`. An owner not listed here is worked under the active account.":
    "Quel compte `gh` travaille pour chaque propriétaire GitHub, quand cette machine en utilise plusieurs — le vôtre et celui d'un client. À gauche le propriétaire tel qu'il apparaît dans l'URL du dépôt ; à droite le compte tel que `gh auth status` le liste. Connectez chacun une fois avec `gh auth login`. Un propriétaire absent d'ici est traité sous le compte actif.",

  "Automatic validation": "Validation automatique",
  "Skip your review for some types of ticket. Once the session succeeds, the runner does what moving the ticket to Validated would do, then moves it to Done, and its report says so. A failed, blocked or out-of-credit ticket is never validated. All off: every ticket waits for you.":
    "Se passer de votre relecture pour certains types de ticket. Dès que la session réussit, le runner fait ce que ferait le passage en Validé, puis passe le ticket en Terminé, et son compte rendu le dit. Un ticket en échec, bloqué ou à court de crédits n'est jamais validé. Tout désactivé : chaque ticket vous attend.",
  "Code tickets": "Tickets Code",
  "The pull request is opened, its CI waited for, then merged. A merge GitHub refuses leaves the ticket in review, with the reason.":
    "La pull request est ouverte, sa CI attendue, puis elle est fusionnée. Une fusion que GitHub refuse laisse le ticket en relecture, avec la raison.",
  "Publication tickets": "Tickets Publication",
  "What was prepared is published straight away, without waiting for your review.":
    "Ce qui a été préparé est publié aussitôt, sans attendre votre relecture.",
  "Writing tickets": "Tickets Rédaction",
  "No effect today: a Writing ticket already ends in Done.":
    "Sans effet aujourd'hui : un ticket Rédaction finit déjà en Terminé.",
  "External action tickets": "Tickets Action externe",
  "No effect today: an External action ticket already ends in Done.":
    "Sans effet aujourd'hui : un ticket Action externe finit déjà en Terminé.",

  "Ticket types": "Types de ticket",
  "A ticket's type decides how it is worked: Code (a repository and a pull request), Writing (the answer in the page), External action (in a browser or a service), Publication (prepared, then published once validated). An empty type is guessed before the ticket runs; a type you chose is never changed.":
    "Le type d'un ticket décide comment il est traité : Code (un dépôt et une pull request), Rédaction (la réponse dans la page), Action externe (dans un navigateur ou un service), Publication (préparée, puis publiée une fois validée). Un type vide est deviné avant que le ticket ne tourne ; un type que vous avez choisi n'est jamais changé.",
  "Guess the type when it is empty": "Deviner le type quand il est vide",
  "A short session reads the ticket, writes the type in its column and the reason in a comment. Off: a ticket without a type is worked as before, from what its project holds.":
    "Une courte session lit le ticket, écrit le type dans sa colonne et la raison en commentaire. Désactivé : un ticket sans type est traité comme avant, d'après ce que contient son projet.",
  "Least confidence to act on a guess": "Confiance minimale pour suivre la déduction",
  "Below it, the ticket is blocked and asks you for its type. A doubt involving Publication or External action always blocks.":
    "En dessous, le ticket est bloqué et vous demande son type. Un doute qui touche Publication ou Action externe bloque toujours.",
  Low: "Faible",
  Medium: "Moyenne",
  High: "Élevée",
  "Model that guesses the type": "Modèle qui devine le type",
  "A light one is enough, e.g. `haiku`. Empty: Claude Code's own default.":
    "Un modèle léger suffit, par ex. `haiku`. Vide : celui de Claude Code par défaut.",
  "Name of the Code type": "Nom du type Code",
  "As written in your Type column.": "Tel qu'il s'écrit dans votre colonne Type.",
  "Name of the Writing type": "Nom du type Rédaction",
  "Name of the External action type": "Nom du type Action externe",
  "Name of the Publication type": "Nom du type Publication",

  "Recurring tickets": "Tickets récurrents",
  "Tickets created on their own from the Schedules database — hourly, daily, weekly or monthly. After the machine was off, one occurrence is created, never every one it missed.":
    "Des tickets créés tout seuls depuis la base Schedules — chaque heure, jour, semaine ou mois. Après une machine éteinte, une seule occurrence est créée, jamais toutes celles qu'elle a manquées.",
  "Create recurring tickets": "Créer les tickets récurrents",
  "Off: the Schedules database is ignored, and none of its rows is touched.":
    "Désactivé : la base Schedules est ignorée, et aucune de ses lignes n'est touchée.",

  Notifications: "Notifications",
  "How the runner reaches you: this computer's screen, Telegram or Slack. A reply on Telegram or Slack becomes a comment on the ticket — which is what restarts a blocked one.":
    "Comment le runner vous joint : l'écran de cet ordinateur, Telegram ou Slack. Une réponse sur Telegram ou Slack devient un commentaire sur le ticket — ce qui relance un ticket bloqué.",
  "Send a message when a ticket is": "Envoyer un message quand un ticket est",
  "Blocked: it asks you a question. Done: its work waits for your review. Failed: there is a log to read.":
    "Bloqué : il vous pose une question. Terminé : son travail attend votre relecture. Échoué : il y a un journal à lire.",
  "Notify on this computer's screen": "Notifier sur l'écran de cet ordinateur",
  "A desktop notification when a ticket finishes.":
    "Une notification de bureau quand un ticket se termine.",
  "Read your replies": "Lire vos réponses",
  "Your replies on Telegram or Slack become comments on the ticket. Off: messages are sent, replies are ignored.":
    "Vos réponses sur Telegram ou Slack deviennent des commentaires sur le ticket. Désactivé : les messages partent, les réponses sont ignorées.",
  "Telegram bot token": "Jeton du bot Telegram",
  "From @BotFather (/newbot). `ticket-runner notify --pair` then finds the chat ID.":
    "Chez @BotFather (/newbot). `ticket-runner notify --pair` trouve ensuite l'identifiant de la discussion.",
  "Telegram chat ID": "Identifiant de la discussion Telegram",
  "Only this chat is read: anybody can write to a bot.":
    "Seule cette discussion est lue : n'importe qui peut écrire à un bot.",
  "Slack bot token": "Jeton du bot Slack",
  "The `xoxb-…` one. Scopes: `chat:write`, and `channels:history` (`groups:history`, `im:history`) to read your replies.":
    "Celui en `xoxb-…`. Scopes : `chat:write`, et `channels:history` (`groups:history`, `im:history`) pour lire vos réponses.",
  "Slack channel ID": "Identifiant du canal Slack",
  "In Slack, ··· → View channel details, at the bottom. Then `/invite @your-bot` in the channel — the step everyone forgets.":
    "Dans Slack, ··· → Afficher les détails du canal, tout en bas. Puis `/invite @votre-bot` dans le canal — l'étape que tout le monde oublie.",
  "Desktop notification (older setting)": "Notification de bureau (ancien réglage)",
  "Kept for older files: “Notify on this computer's screen” follows it when it is not set itself.":
    "Gardé pour les anciens fichiers : « Notifier sur l'écran de cet ordinateur » le suit quand il n'est pas renseigné lui-même.",

  "Live progress": "Suivi en direct",
  "What a ticket shows while its session is running, and where the session goes after.":
    "Ce qu'un ticket montre pendant que sa session tourne, et où va la session ensuite.",
  "Show progress on the ticket": "Afficher l'avancement sur le ticket",
  "The session's steps are written on the ticket's page, the latest one in its Progress column.":
    "Les étapes de la session sont écrites sur la page du ticket, la dernière dans sa colonne Progress.",
  "File sessions under their project": "Ranger les sessions dans leur projet",
  "A finished session is moved under the project's folder, so `claude --resume` there finds it. Off: it can only be resumed by its ID.":
    "Une session terminée est déplacée sous le dossier du projet, pour que `claude --resume` l'y retrouve. Désactivé : on ne peut la reprendre que par son identifiant.",
  "Update progress every (seconds)": "Mettre à jour l'avancement toutes les (secondes)",
  "10 reads as live. 5 at the least, so two tickets at once do not spend Notion's rate limit on it.":
    "10 donne une impression de direct. 5 au minimum, pour que deux tickets à la fois n'épuisent pas la limite de requêtes de Notion.",
  "Machine the sessions run on (ssh)": "Machine où tournent les sessions (ssh)",
  "Only when the runner lives on a server, e.g. `me@server.example.com`: the ticket's Session link then opens the session over ssh.":
    "Seulement si le runner vit sur un serveur, par ex. `moi@serveur.example.com` : le lien Session du ticket ouvre alors la session par ssh.",

  "Answers in comments": "Réponses aux commentaires",
  "Reply under one of the runner's reports, or name it, and it answers in the thread — having read the ticket and the repository, and changing nothing.":
    "Répondez sous un compte rendu du runner, ou nommez-le, et il répond dans le fil — après avoir lu le ticket et le dépôt, sans rien modifier.",
  "Answer comments": "Répondre aux commentaires",
  "Off: comments get no answer. Answering a blocked ticket's question still starts it again.":
    "Désactivé : les commentaires restent sans réponse. Répondre à la question d'un ticket bloqué le relance toujours.",
  "Look for new comments every (seconds)":
    "Chercher les nouveaux commentaires toutes les (secondes)",
  "10 at the least.": "10 au minimum.",
  "Tickets looked at each time": "Tickets examinés à chaque fois",
  "One request each; the next ones are looked at the time after.":
    "Une requête chacun ; les suivants sont examinés la fois d'après.",
  "Time limit per answer (minutes)": "Durée maximale par réponse (minutes)",
  "Somebody is waiting for it: keep it short.": "Quelqu'un l'attend : gardez-la courte.",
  "What an answer may do": "Ce qu'une réponse peut faire",
  "“Read only” is the guardrail: an answer that quietly changed a repository is the last thing anybody expects.":
    "« Lecture seule » est le garde-fou : une réponse qui modifierait un dépôt en silence est bien la dernière chose qu'on attend.",

  "OpenRouter (other models)": "OpenRouter (autres modèles)",
  "One key for every other AI provider — a GPT, images, transcription. Sessions get it as `OPENROUTER_API_KEY`, and this console dictates with it.":
    "Une seule clé pour tous les autres fournisseurs d'IA — un GPT, des images, de la transcription. Les sessions la reçoivent sous le nom `OPENROUTER_API_KEY`, et cette console s'en sert pour la dictée.",
  "OpenRouter key": "Clé OpenRouter",
  "Starts with `sk-or-`, from openrouter.ai/keys. On its own it is only handed to the sessions; nothing about the runner changes.":
    "Commence par `sk-or-`, depuis openrouter.ai/keys. Seule, elle est simplement transmise aux sessions ; rien ne change pour le runner.",
  "Run the sessions through OpenRouter": "Faire passer les sessions par OpenRouter",
  "Claude Code then talks to OpenRouter instead of Anthropic: models are named the OpenRouter way (`openai/gpt-5`), the bill is OpenRouter's rather than your subscription's, and Claude in Chrome no longer loads.":
    "Claude Code parle alors à OpenRouter au lieu d'Anthropic : les modèles se nomment à la façon d'OpenRouter (`openai/gpt-5`), la facture est celle d'OpenRouter et non de votre abonnement, et Claude in Chrome ne se charge plus.",
  "Dictation model": "Modèle de dictée",
  "Turns a message dictated in the console into text.":
    "Transforme en texte un message dicté dans la console.",
  "API address": "Adresse de l'API",
  "Only for a gateway of your own that speaks the same API.":
    "Seulement pour une passerelle à vous qui parle la même API.",

  "Web console": "Console web",
  "The server behind this page. It can run code on this machine as you, so it only listens to this machine unless you set a token or a sign-in.":
    "Le serveur derrière cette page. Il peut exécuter du code sur cette machine en votre nom : il n'écoute donc que cette machine, sauf si vous fixez un jeton ou une connexion.",
  "Listen address": "Adresse d'écoute",
  "`127.0.0.1`: this machine only. Any other address needs a token, or an email and a password, below. Safer still: an ssh tunnel, `ssh -L 8787:127.0.0.1:8787 <this machine>`.":
    "`127.0.0.1` : cette machine seulement. Toute autre adresse demande un jeton, ou une adresse e-mail et un mot de passe, plus bas. Plus sûr encore : un tunnel ssh, `ssh -L 8787:127.0.0.1:8787 <cette machine>`.",
  Port: "Port",
  "The console is then at `http://127.0.0.1:<port>`.":
    "La console est alors à l'adresse `http://127.0.0.1:<port>`.",
  "Console token": "Jeton de la console",
  "Empty: one is drawn once and kept in `~/.local/state/ticket-runner/web/token`. Needed to listen beyond this machine.":
    "Vide : un jeton est tiré une fois et gardé dans `~/.local/state/ticket-runner/web/token`. Nécessaire pour écouter au-delà de cette machine.",
  "the console has to be restarted, and this page reopened with the new token":
    "la console doit être redémarrée, et cette page rouverte avec le nouveau jeton",
  "Sign-in email": "Adresse e-mail de connexion",
  "With a password, the console asks for the two instead of the token. `TICKET_RUNNER_WEB_EMAIL` wins over it.":
    "Avec un mot de passe, la console demande les deux au lieu du jeton. `TICKET_RUNNER_WEB_EMAIL` l'emporte.",
  "Sign-in password": "Mot de passe de connexion",
  "`TICKET_RUNNER_WEB_PASSWORD` wins over it. Changing it signs every browser out; the token keeps working, for scripts.":
    "`TICKET_RUNNER_WEB_PASSWORD` l'emporte. Le changer déconnecte tous les navigateurs ; le jeton continue de marcher, pour les scripts.",
  "Send a dictated message right away": "Envoyer un message dicté aussitôt",
  "Off: the transcription waits in the field, to be read over first. Dictation needs the OpenRouter key.":
    "Désactivé : la transcription attend dans le champ, pour être relue d'abord. La dictée demande la clé OpenRouter.",
  "Refresh the board every (seconds)": "Rafraîchir le tableau toutes les (secondes)",
  "Only while this page is open. 5 at the least.":
    "Seulement tant que cette page est ouverte. 5 au minimum.",
  "Time limit per discussion reply (minutes)":
    "Durée maximale d'une réponse de la discussion (minutes)",
  "For the discussion with the workspace, in this console.":
    "Pour la discussion avec l'espace de travail, dans cette console.",
  "Largest attached file (MB)": "Taille maximale d'un fichier joint (Mo)",
  "Per file sent in the discussion. A larger one is refused, with the reason.":
    "Par fichier envoyé dans la discussion. Un fichier plus gros est refusé, avec la raison.",
  "Keep attached files (days)": "Garder les fichiers joints (jours)",
  "Copies of what you sent in the discussion, deleted after this or with “new conversation”.":
    "Les copies de ce que vous avez envoyé dans la discussion, supprimées après ce délai ou avec « nouvelle conversation ».",

  Updates: "Mises à jour",
  "The runner can update itself between two checks of the board.":
    "Le runner peut se mettre à jour entre deux consultations du tableau.",
  "Update automatically": "Mettre à jour automatiquement",
  "Installs the newest version as soon as there is one.":
    "Installe la version la plus récente dès qu'il y en a une.",
  Follow: "Suivre",
  "Releases are versions that were tested; the branch brings every change as soon as it lands.":
    "Les versions publiées ont été éprouvées ; la branche apporte chaque changement dès qu'il arrive.",
  "Releases (vX.Y.Z tags)": "Les versions publiées (tags vX.Y.Z)",
  "Every commit of the installed branch": "Chaque commit de la branche installée",
  "Look for an update every (seconds)": "Chercher une mise à jour toutes les (secondes)",
  "3600 is an hour. 60 at the least.": "3600, c'est une heure. 60 au minimum.",

  "Custom instructions": "Consignes personnalisées",
  "The instructions each session is given, each replaceable by a file of your own. Empty: the built-in ones.":
    "Les consignes données à chaque session, chacune remplaçable par un fichier à vous. Vide : celles d'origine.",
  "Instructions for a ticket with a repository": "Consignes pour un ticket avec dépôt",
  "The path to a Markdown or text file.": "Le chemin d'un fichier Markdown ou texte.",
  "Instructions for a ticket without one": "Consignes pour un ticket sans dépôt",
  "Instructions for publishing a validated ticket": "Consignes pour publier un ticket validé",

  "Names of the board's columns": "Noms des colonnes du tableau",
  "Change these only if your board's columns are named differently. Leaving Blocked empty while renaming Failed means one column for both.":
    "À changer seulement si les colonnes de votre tableau portent d'autres noms. Laisser Bloqué vide en renommant Échoué, c'est une seule colonne pour les deux.",
  "The tickets the runner picks up.": "Les tickets que le runner prend en charge.",
  "Where a ticket goes while it is worked on.": "Là où va un ticket pendant qu'il est traité.",
  "Work done, waiting for your review.": "Travail fait, en attente de votre relecture.",
  "You accepted it: the runner merges, or publishes.":
    "Vous l'avez accepté : le runner fusionne, ou publie.",
  "Finished and closed.": "Fini et clos.",
  "Something broke; a log says what.": "Quelque chose a cassé ; un journal dit quoi.",
  "The runner asked you a question and is waiting.":
    "Le runner vous a posé une question et attend.",

  "Names of the ticket properties": "Noms des propriétés des tickets",
  "Change these only if your Notion properties are named differently. An optional one may be missing: what it would hold is simply not written.":
    "À changer seulement si vos propriétés Notion portent d'autres noms. Une propriété facultative peut manquer : ce qu'elle contiendrait n'est simplement pas écrit.",
  "Required.": "Obligatoire.",
  "Relation to the Projects database.": "Relation vers la base Projects.",
  Machine: "Machine",
  "Written by the runner: which machine took the ticket.":
    "Écrite par le runner : quelle machine a pris le ticket.",
  "Pull request": "Pull request",
  "Written by the runner when one is opened.":
    "Écrite par le runner quand une pull request est ouverte.",
  Session: "Session",
  "Written by the runner: the link that reopens the session.":
    "Écrite par le runner : le lien qui rouvre la session.",
  "This ticket's model, over the default one.":
    "Le modèle de ce ticket, prioritaire sur celui par défaut.",
  "Which Ready ticket goes first.": "Quel ticket prêt passe en premier.",
  "Written by the runner, in dollars.": "Écrit par le runner, en dollars.",
  Duration: "Durée",
  "Written by the runner, in minutes.": "Écrite par le runner, en minutes.",
  Progress: "Avancement",
  "Written by the runner: what the session is doing.":
    "Écrit par le runner : ce que fait la session.",
  "Scheduled for": "Prévu pour",
  "A date here holds the ticket until then.": "Une date ici retient le ticket jusque-là.",
  "Waiting for credit": "En attente de crédit",
  "Ticked while the subscription limit is reached.":
    "Cochée tant que la limite de l'abonnement est atteinte.",
  Type: "Type",
  "Code, Writing, External action or Publication; empty, it is guessed.":
    "Code, Rédaction, Action externe ou Publication ; vide, il est deviné.",
  Agent: "Agent",
  "Relation to the Agents database: who handles the ticket.":
    "Relation vers la base Agents : qui traite le ticket.",
  "Schedule: cadence": "Récurrence : cadence",
  "Hourly, Daily, Weekly or Monthly.": "Hourly, Daily, Weekly ou Monthly.",
  "Schedule: time": "Récurrence : heure",
  "The hour, written 09:00.": "L'heure, écrite 09:00.",
  "Schedule: day": "Récurrence : jour",
  "Monday… or 1 to 31.": "Monday… ou 1 à 31.",
  "Schedule: active": "Récurrence : active",
  "Unticked: paused, nothing deleted.": "Décochée : en pause, rien n'est supprimé.",
  "Schedule: next run": "Récurrence : prochaine occurrence",
  "Written by the runner.": "Écrite par le runner.",
  "Schedule: last run": "Récurrence : dernière occurrence",
  "Schedule: last ticket": "Récurrence : dernier ticket",
  "Written by the runner: what the last occurrence created.":
    "Écrit par le runner : ce qu'a créé la dernière occurrence.",

  "Names of the Notion databases": "Noms des bases Notion",
  "The titles the runner looks for under your workspace page. Only Tickets is required; the others change nothing by their absence.":
    "Les titres que le runner cherche sous votre page d'espace de travail. Seule Tickets est obligatoire ; les autres ne changent rien par leur absence.",
  "Tickets database": "Base des tickets",
  "Projects database": "Base des projets",
  "Where a ticket's repository is found.": "Là où l'on trouve le dépôt d'un ticket.",
  "Agents database": "Base des agents",
  "The roles a ticket can be handled by.": "Les rôles qui peuvent traiter un ticket.",
  "Context page": "Page de contexte",
  "Who the work is for, read by every session.":
    "Pour qui le travail est fait, lu par chaque session.",
  "Schedules database": "Base des récurrences",
  "Recurring tickets; absent, nothing recurs.":
    "Les tickets récurrents ; absente, rien ne se répète.",

  // Not said by the settings page any more, but still said elsewhere: the menu
  // and the projects' own list, and the ticket types a board's default columns
  // are written in.
  Projects: "Projets",
  Writing: "Rédaction",
  "External action": "Action externe",
  Publication: "Publication",
}
