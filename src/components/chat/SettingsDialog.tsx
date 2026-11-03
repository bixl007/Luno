"use client";

import { ChevronDown, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Chopper } from "@/components/brand/Chopper";
import { Button } from "@/components/ui/button";
import { ACCENTS, LIMITS, STYLES, type Preferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { pickVoice, VOICE_KEY } from "./speech";

type SettingsDialogProps = {
  open: boolean;
  preferences: Preferences;
  onClose: () => void;
  /** Resolves once saved; rejects if saving failed. */
  onSave: (preferences: Preferences) => Promise<void>;
};

const control =
  "h-10 w-full rounded-lg border border-border-strong bg-card px-3 text-sm text-foreground outline-none transition-colors placeholder:text-subtle-foreground hover:border-ring/60 focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";
const textarea = cn(control, "h-auto min-h-24 resize-y py-2.5 leading-relaxed");

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold tracking-wide text-subtle-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="text-xs text-subtle-foreground">{hint}</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/** A select with its own chevron, so it matches the text inputs instead of the browser's default look. */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <select {...props} className={cn(control, "cursor-pointer appearance-none truncate pr-9")}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
    </div>
  );
}

/** Profile, personalisation and voice settings in one modal, built on the native <dialog> like ConfirmDialog. */
export function SettingsDialog({ open, preferences, onClose, onSave }: SettingsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDraft(preferences);
      dialog.showModal();
      // Otherwise the browser focuses the close button and draws a ring around it.
      dialog.querySelector("input")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, preferences]);

  useEffect(() => {
    if (!open || !("speechSynthesis" in window)) return;
    const load = () => {
      setVoices(window.speechSynthesis.getVoices());
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(VOICE_KEY);
      } catch {
        // Storage can be blocked; the automatic voice is used.
      }
      setVoice(saved ?? "");
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [open]);

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function chooseVoice(uri: string) {
    setVoice(uri);
    try {
      if (uri) localStorage.setItem(VOICE_KEY, uri);
      else localStorage.removeItem(VOICE_KEY);
    } catch {
      // Not remembered, but this session still uses it.
    }
  }

  function preview() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const chosen = pickVoice(synth.getVoices(), voice || null, navigator.language || "en-US");
    const utterance = new SpeechSynthesisUtterance("Hi, I'm Luno. This is how I sound.");
    if (chosen) {
      utterance.voice = chosen;
      utterance.lang = chosen.lang;
    }
    setTimeout(() => synth.speak(utterance), 60);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } catch {
      // The caller shows the error; the dialog stays open so nothing typed is lost.
    }
    setSaving(false);
  }

  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="settings-title"
      className="m-auto h-[min(44rem,calc(100dvh-2rem))] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-lg backdrop:bg-foreground/30 backdrop:backdrop-blur-[2px] open:animate-pop-in"
    >
      {/* A definite height and three grid rows: the header and footer stay put and only the middle scrolls. */}
      <form onSubmit={submit} className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 id="settings-title" className="text-base font-semibold">Personalise Luno</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Used in every chat and saved to your account.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            tabIndex={-1}
            className="-mt-1 -mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="scrollbar-quiet space-y-8 overflow-y-auto px-6 py-5">
          <Section title="About you">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="What should Luno call you?">
                <input className={control} value={draft.nickname} maxLength={LIMITS.nickname} onChange={(e) => set("nickname", e.target.value)} placeholder="Nickname" />
              </Field>
              <Field label="What do you do?">
                <input className={control} value={draft.occupation} maxLength={LIMITS.occupation} onChange={(e) => set("occupation", e.target.value)} placeholder="Student, designer, nurse…" />
              </Field>
            </div>
            <Field label="Anything else Luno should know?" hint={`${draft.about.length}/${LIMITS.about}`}>
              <textarea className={textarea} value={draft.about} maxLength={LIMITS.about} onChange={(e) => set("about", e.target.value)} placeholder="Interests, goals, the languages you code in…" />
            </Field>
          </Section>

          <Section title="How Luno answers">
            <fieldset>
              <legend className="text-sm font-medium">Response style</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STYLES.map((style) => (
                  <label
                    key={style.id}
                    className={cn(
                      "cursor-pointer rounded-lg border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                      draft.style === style.id ? "border-brand bg-brand-soft" : "border-border hover:bg-accent",
                    )}
                  >
                    <input type="radio" name="style" className="sr-only" checked={draft.style === style.id} onChange={() => set("style", style.id)} />
                    <span className="block text-sm font-medium">{style.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{style.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Custom instructions" hint={`${draft.instructions.length}/${LIMITS.instructions}`}>
              <textarea className={textarea} value={draft.instructions} maxLength={LIMITS.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="Always show code in TypeScript. Explain like I'm new to it." />
            </Field>
          </Section>

          <Section title="Look and feel">
            <fieldset>
              <legend className="text-sm font-medium">Accent colour</legend>
              <div className="mt-2 flex gap-3">
                {ACCENTS.map((accent) => (
                  <label key={accent.id} title={accent.label} className="cursor-pointer rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-popover">
                    <input type="radio" name="accent" className="sr-only" checked={draft.accent === accent.id} onChange={() => set("accent", accent.id)} aria-label={accent.label} />
                    <span
                      className={cn(
                        "block size-8 rounded-full ring-offset-2 ring-offset-popover transition-all",
                        draft.accent === accent.id ? "ring-2 ring-foreground" : "hover:scale-110",
                      )}
                      style={{ background: `oklch(0.6 0.15 ${accent.hue})` }}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
              <Chopper className="h-12 w-9 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Show Chopper</span>
                <span className="block text-xs leading-snug text-muted-foreground">Sits on the message box and shares fun facts and jokes.</span>
              </span>
              <input type="checkbox" role="switch" checked={draft.companion} onChange={(e) => set("companion", e.target.checked)} className="peer sr-only" />
              <span aria-hidden className="relative h-6 w-10 shrink-0 rounded-full bg-border-strong transition-colors peer-checked:bg-brand after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-card after:shadow-xs after:transition-transform peer-checked:after:translate-x-4" />
            </label>
          </Section>

          {english.length > 0 && (
            <Section title="Read aloud">
              <Field label="Voice" hint="saved on this device only">
                <div className="flex items-center gap-2">
                  <Select value={voice} onChange={(e) => chooseVoice(e.target.value)}>
                    <option value="">Automatic (best available)</option>
                    {english.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={preview} aria-label="Hear this voice" title="Hear this voice" className="size-10 shrink-0">
                    <Volume2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </Field>
            </Section>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-popover px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </footer>
      </form>
    </dialog>
  );
}
