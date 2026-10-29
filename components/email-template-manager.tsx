"use client"

import React, { useState, useActionState } from "react"
import { saveTemplateAction } from "@/app/[locale]/admin/email/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, Mail, Code, FileText, Info } from "lucide-react"

interface Template {
  id: string
  event: string
  name: string
  subject: string
  bodyHtml: string
  bodyText: string
}

const PLACEHOLDERS: Record<string, string[]> = {
  REVIEW_SUBMITTED: ["{{name}}", "{{documentNumber}}", "{{title}}", "{{version}}", "{{link}}", "{{actorName}}"],
  REVIEW_APPROVED: ["{{name}}", "{{documentNumber}}", "{{title}}", "{{version}}", "{{link}}", "{{actorName}}"],
  VERSION_APPROVED: ["{{name}}", "{{documentNumber}}", "{{title}}", "{{version}}", "{{link}}", "{{actorName}}"],
  VERSION_RETURNED: ["{{name}}", "{{documentNumber}}", "{{title}}", "{{version}}", "{{comment}}", "{{link}}", "{{actorName}}"],
  REVIEW_DUE: ["{{name}}", "{{documentNumber}}", "{{title}}", "{{link}}"],
  USER_CREATED: ["{{name}}", "{{email}}", "{{link}}"],
}

export function EmailTemplateManager({ templates }: { templates: Template[] }) {
  const [activeEvent, setActiveEvent] = useState<string>(templates[0]?.event || "REVIEW_SUBMITTED")
  const activeTemplate = templates.find((t) => t.event === activeEvent) || templates[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Event-Auswahlliste */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">Workflow-Events</Label>
        <div className="space-y-1">
          {templates.map((t) => {
            const isActive = t.event === activeEvent
            return (
              <button
                key={t.event}
                type="button"
                onClick={() => setActiveEvent(t.event)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between border ${
                  isActive
                    ? "bg-primary/10 border-primary/30 text-primary font-medium shadow-sm"
                    : "bg-card border-border text-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Mail className={`size-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="truncate">{t.name}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Editor für das ausgewählte Event */}
      <div className="lg:col-span-2">
        {activeTemplate && <TemplateEditor key={activeTemplate.event} template={activeTemplate} />}
      </div>
    </div>
  )
}

function TemplateEditor({ template }: { template: Template }) {
  const [state, formAction, pending] = useActionState(saveTemplateAction, null)
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit")
  const [subject, setSubject] = useState(template.subject)
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml)
  const [bodyText, setBodyText] = useState(template.bodyText)

  const placeholders = PLACEHOLDERS[template.event] || ["{{name}}", "{{link}}"]

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            <CardDescription className="font-mono text-xs text-muted-foreground">
              Event: {template.event}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-muted">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              HTML Vorschau
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {state?.ok && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4" /> {state.ok}
          </div>
        )}
        {state?.error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4" /> {state.error}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md border border-border bg-muted p-2.5 text-xs text-muted-foreground">
          <Info className="size-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-foreground">Verfügbare Platzhalter: </span>
            <span className="font-mono text-primary">{placeholders.join("  ")}</span>
          </div>
        </div>

        {viewMode === "preview" ? (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground font-medium">Betreff: {subject}</div>
            <div
              className="rounded-lg border border-border p-4 bg-background text-sm prose prose-sm max-w-none min-h-[220px]"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="event" value={template.event} />
            <input type="hidden" name="name" value={template.name} />

            <div className="space-y-2">
              <Label htmlFor="subject">E-Mail-Betreff</Label>
              <Input
                id="subject"
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                <Code className="size-3.5 text-primary" />
                <Label htmlFor="bodyHtml">HTML-Inhalt</Label>
              </div>
              <textarea
                id="bodyHtml"
                name="bodyHtml"
                rows={8}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                <FileText className="size-3.5 text-muted-foreground" />
                <Label htmlFor="bodyText">Plaintext-Inhalt (Fallback für reine Text-Clients)</Label>
              </div>
              <textarea
                id="bodyText"
                name="bodyText"
                rows={6}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <Button type="submit" disabled={pending}>
              {pending ? "Wird gespeichert…" : "Vorlage speichern"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
