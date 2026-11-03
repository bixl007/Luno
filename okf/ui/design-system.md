---
type: UI Component
title: Design system
description: Warm paper neutrals, one indigo accent, serif display type, and semantic tokens that drive light, dark and system themes.
resource: ../../src/app/globals.css
tags: [ui, design-system, theme, tokens]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T14:58:00Z }
---

Every screen uses the same tokens, defined once in `src/app/globals.css`. Components use semantic Tailwind names (`bg-card`, `text-muted-foreground`, `border-border`, `text-brand`) and never raw colors, so both themes stay in step.

# Direction

Warm, editorial surfaces (a Claude-like warmth), a plain chat layout (ChatGPT-like simplicity), hairline borders and tight spacing (Linear-like precision), and one quiet indigo accent (`brand`) plus a crescent logo as Luno's own marks. No gradients on controls. The landing page alone uses soft token-coloured gradients (aurora backgrounds, one gradient accent phrase per heading).

# Tokens

* **Color:** `:root` holds the light palette and `.dark` the dark one (oklch). Names: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `muted-foreground`, `subtle-foreground`, `accent` (hover surface), `brand`, `brand-soft`, `destructive`, `success`, `border`, `border-strong`, `input`, `ring`, `sidebar*`, `code`.
* **Type:** Geist (UI), Newsreader (`font-display`, headings and greetings), Geist Mono (code), loaded with `next/font` in `src/app/layout.tsx`.
* **Shape and motion:** one `--radius` scale, shadow tokens `xs` to `lg`, and the animations `fade-up`, `fade-in`, `pop-in` and `dot`. `prefers-reduced-motion` switches animation off.
* Shadows, easing and animations sit in a plain `@theme` block, not `@theme inline`, because they are read back with `var()` (toasts, animation values). Inline tokens do not emit CSS variables.

# Themes

Light, dark and system. `ThemeProvider` (`src/components/theme/`) keeps the choice in `localStorage` under `luno-theme` (absent means system) and toggles the `dark` class on `<html>`. A small inline script in `layout.tsx` applies it before first paint, so there is no flash. `ThemeToggle` is the three-way control used on the landing page, auth screens and dashboard.

Clerk's screens follow the same tokens: `src/components/theme/clerkAppearance.ts` maps Clerk's variables onto them and `Providers.tsx` switches Clerk's base theme with the active theme. The Clerk logo is `src/app/icon.svg`.

# Shared pieces

`src/components/ui/`: `button` (variants `default`, `brand`, `outline`, `secondary`, `ghost`, `destructive`, `link`), `ConfirmDialog` (native `<dialog>`), `Toaster` with `notify` (all toasts go through it). `src/components/brand/Logo.tsx` holds the logo mark and wordmark.
