---
type: UI Component
title: Landing page
description: Public home page made of Nav, Main, Feats, About and Parall sections; signed-in users are redirected to the dashboard.
resource: ../../src/components/landing/Landing.tsx
tags: [ui, marketing, react]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T13:06:00Z }
---

`src/app/page.tsx` is a client component. Once Clerk has loaded ([auth](/auth.md)), a signed-in user is sent to `/dashboard` ([chat interface](/ui/chat-ui.md)); everyone else sees the page after a short fade-in delay.

# Parts

All in `src/components/landing/`, composed by `Landing.tsx`: `Nav` (navigation), `Main` (hero with a "Get Started" button to `/signup`), `Feats`, `About` and `Parall` (a parallax showcase). Reusable visual pieces (sparkles, tracing beam, cover, resizable navbar, hero parallax) are in `src/components/ui/`. `src/components/landing/demos/` holds three feature-section demos that no page uses yet. Hero artwork is loaded from Cloudinary URLs.
