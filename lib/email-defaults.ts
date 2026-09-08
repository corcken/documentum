export interface DefaultTemplate {
  event: string
  name: string
  subject: string
  bodyHtml: string
  bodyText: string
}

export const DEFAULT_TEMPLATES: Record<string, DefaultTemplate> = {
  REVIEW_SUBMITTED: {
    event: "REVIEW_SUBMITTED",
    name: "Zur Prüfung eingereicht",
    subject: "[Documentum] Dokument {{documentNumber}} zur Prüfung eingereicht",
    bodyHtml: `<p>Hallo {{name}},</p>
<p>das Dokument <strong>{{documentNumber}} - {{title}}</strong> (v{{version}}) wurde zur Prüfung eingereicht.</p>
<p><a href="{{link}}">Dokument öffnen und prüfen</a></p>
<p>Mit freundlichen Grüßen,<br/>Dein Documentum-System</p>`,
    bodyText: `Hallo {{name}},

das Dokument {{documentNumber}} - {{title}} (v{{version}}) wurde zur Prüfung eingereicht.

Link zum Dokument: {{link}}

Mit freundlichen Grüßen,
Dein Documentum-System`,
  },
  REVIEW_APPROVED: {
    event: "REVIEW_APPROVED",
    name: "Prüfung bestanden / Freigabe erforderlich",
    subject: "[Documentum] Dokument {{documentNumber}} bereit zur Freigabe",
    bodyHtml: `<p>Hallo {{name}},</p>
<p>die Prüfung für das Dokument <strong>{{documentNumber}} - {{title}}</strong> (v{{version}}) wurde erfolgreich abgeschlossen. Die finale Freigabe steht aus.</p>
<p><a href="{{link}}">Dokument öffnen und freigeben</a></p>
<p>Mit freundlichen Grüßen,<br/>Dein Documentum-System</p>`,
    bodyText: `Hallo {{name}},

die Prüfung für das Dokument {{documentNumber}} - {{title}} (v{{version}}) wurde erfolgreich abgeschlossen. Die finale Freigabe steht aus.

Link zum Dokument: {{link}}

Mit freundlichen Grüßen,
Dein Documentum-System`,
  },
  VERSION_APPROVED: {
    event: "VERSION_APPROVED",
    name: "Dokument freigegeben",
    subject: "[Documentum] Dokument {{documentNumber}} freigegeben",
    bodyHtml: `<p>Hallo {{name}},</p>
<p>das Dokument <strong>{{documentNumber}} - {{title}}</strong> wurde in Version {{version}} offiziell freigegeben.</p>
<p><a href="{{link}}">Dokument ansehen</a></p>
<p>Mit freundlichen Grüßen,<br/>Dein Documentum-System</p>`,
    bodyText: `Hallo {{name}},

das Dokument {{documentNumber}} - {{title}} wurde in Version {{version}} offiziell freigegeben.

Link zum Dokument: {{link}}

Mit freundlichen Grüßen,
Dein Documentum-System`,
  },
  VERSION_RETURNED: {
    event: "VERSION_RETURNED",
    name: "Dokument zurückgewiesen",
    subject: "[Documentum] Dokument {{documentNumber}} zurück an Ersteller",
    bodyHtml: `<p>Hallo {{name}},</p>
<p>das Dokument <strong>{{documentNumber}} - {{title}}</strong> (v{{version}}) wurde mit folgendem Kommentar an dich zurückgewiesen:</p>
<blockquote style="border-left: 3px solid #cbd5e1; padding-left: 10px; margin: 10px 0; color: #475569;">{{comment}}</blockquote>
<p><a href="{{link}}">Dokument bearbeiten</a></p>
<p>Mit freundlichen Grüßen,<br/>Dein Documentum-System</p>`,
    bodyText: `Hallo {{name}},

das Dokument {{documentNumber}} - {{title}} (v{{version}}) wurde mit folgendem Kommentar an dich zurückgewiesen:

{{comment}}

Link zum Dokument: {{link}}

Mit freundlichen Grüßen,
Dein Documentum-System`,
  },
  REVIEW_DUE: {
    event: "REVIEW_DUE",
    name: "Prüffrist fällig / überfällig",
    subject: "[Documentum] Prüffrist für Dokument {{documentNumber}} fällig",
    bodyHtml: `<p>Hallo {{name}},</p>
<p>für das Dokument <strong>{{documentNumber}} - {{title}}</strong> ist die periodische Prüfung fällig bzw. überfällig.</p>
<p><a href="{{link}}">Dokument öffnen</a></p>
<p>Mit freundlichen Grüßen,<br/>Dein Documentum-System</p>`,
    bodyText: `Hallo {{name}},

für das Dokument {{documentNumber}} - {{title}} ist die periodische Prüfung fällig bzw. überfällig.

Link zum Dokument: {{link}}

Mit freundlichen Grüßen,
Dein Documentum-System`,
  },
  USER_CREATED: {
    event: "USER_CREATED",
    name: "Benutzerkonto angelegt",
    subject: "[Documentum] Dein Benutzerkonto wurde angelegt",
    bodyHtml: `<p>Hallo {{name}},</p>
<p>für deine E-Mail-Adresse <strong>{{email}}</strong> wurde ein Benutzerkonto in Documentum angelegt.</p>
<p><a href="{{link}}">Jetzt anmelden</a></p>
<p>Mit freundlichen Grüßen,<br/>Dein Documentum-System</p>`,
    bodyText: `Hallo {{name}},

für deine E-Mail-Adresse {{email}} wurde ein Benutzerkonto in Documentum angelegt.

Link zur Anmeldung: {{link}}

Mit freundlichen Grüßen,
Dein Documentum-System`,
  },
}
