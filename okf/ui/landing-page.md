---
type: UI Component
title: Landing page
description: Public home page made of a header, an aurora hero with an animated chat preview, a bento features grid, a how-it-works strip, a closing call to action and a footer; signed-in users are redirected to the dashboard.
resource: ../../src/components/landing/Landing.tsx
tags: [ui, marketing, react]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T14:58:00Z }
---

`src/app/page.tsx` is a server component. It reads the Clerk session with `auth()` and redirects a signed-in user to `/dashboard` ([chat interface](/ui/chat-ui.md), [auth](/auth.md)); everyone else gets the page. Visual rules are in the [design system](/ui/design-system.md).

# Parts

All in `src/components/landing/`, composed by `Landing.tsx` in this order:

* `SiteHeader`: sticky, blurred; logo, Features and How it works links (hidden on small screens), theme toggle, Log in, Get started.
* `Hero`: a drifting aurora of three blurred token-coloured gradients over a faded grid, a "Meet Chopper" badge, the headline with a gradient italic accent (`text-gradient-brand`), calls to action to `/signup` and `/signin`, three short points, and `ProductPreview`.
* `ProductPreview` (client): a drawing of the chat that plays once on load: the question, a "Searching the web" chip that turns into "Searched the web", the answer typed out with a caret, then the source chips and a Chopper speech bubble fade in. The unwritten text stays in the layout, invisible, so nothing jumps. The whole drawing is `role="img"` with a label; its contents are `aria-hidden`.
* `Features`: a bento grid (`id="features"`) of eight tiles: web search with sources, Chopper, files and photos, model choice, read aloud (animated bars), personalisation, and everyday features (streaming, saved chats, copy and PDF export). Each tile has an `<h3>` and a small decorative visual.
* `HowItWorks` (`id="how-it-works"`): three numbered steps in an ordered list.
* `ClosingCta`: a rounded panel with the aurora and grid, Chopper and a call to action to `/signup`.
* `SiteFooter`: logo and tagline, Product and Account link lists, credit link to https://xyrix.fun/, theme toggle.
* `Chopper` (in `src/components/brand/`): the reindeer mascot, shown from `public/chopper.png` ([personalisation](/ui/personalisation.md)). `Reveal`: a client wrapper using `motion` (`whileInView`, once) for scroll reveal; with `prefers-reduced-motion` it renders without animation.

The tile and preview copy about files and photos, model choice, personalisation and Chopper matches what the dashboard ships, see [models and files](/ai/models-and-files.md) and [personalisation](/ui/personalisation.md). Only `ThemeToggle`, `ProductPreview` and `Reveal` are client code; the other sections are server components.

The aurora, gradient text, grid, caret, float and wave animations are plain CSS at the end of `src/app/globals.css` (section "Landing page extras"), built from the design tokens.

# Sign-in and sign-up

`src/app/signin` and `src/app/signup` wrap Clerk's `SignIn` and `SignUp` in `src/components/auth/AuthShell.tsx` (brand panel beside the form on wide screens). Clerk's own UI is themed through the tokens, see the [design system](/ui/design-system.md).

# Other screens

`src/app/not-found.tsx` (404), `src/app/error.tsx` (runtime error with a retry button) and `src/app/dashboard/loading.tsx`.
