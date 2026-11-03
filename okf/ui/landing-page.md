---
type: UI Component
title: Landing page
description: Public home page made of a header, hero with a product illustration, features, a closing call to action and a footer; signed-in users are redirected to the dashboard.
resource: ../../src/components/landing/Landing.tsx
tags: [ui, marketing, react]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T14:40:00Z }
---

`src/app/page.tsx` is a server component. It reads the Clerk session with `auth()` and redirects a signed-in user to `/dashboard` ([chat interface](/ui/chat-ui.md), [auth](/auth.md)); everyone else gets the page. Visual rules are in the [design system](/ui/design-system.md).

# Parts

All in `src/components/landing/`, composed by `Landing.tsx`: `SiteHeader` (logo, Features link, theme toggle, Log in, Get started), `Hero` (headline, the two calls to action to `/signup` and `/signin`, and `ProductPreview`, a static drawing of the chat built from the same tokens), `Features` (six capabilities the app really has), `ClosingCta` and `SiteFooter` (credit link to https://xyrix.fun/, theme toggle). The sections are server components; only the theme toggle is client code.

# Sign-in and sign-up

`src/app/signin` and `src/app/signup` wrap Clerk's `SignIn` and `SignUp` in `src/components/auth/AuthShell.tsx` (brand panel beside the form on wide screens). Clerk's own UI is themed through the tokens, see the [design system](/ui/design-system.md).

# Other screens

`src/app/not-found.tsx` (404), `src/app/error.tsx` (runtime error with a retry button) and `src/app/dashboard/loading.tsx`.
