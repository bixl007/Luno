---
okf_version: "0.2"
---

# Luno knowledge bundle

An [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) (v0.2) description of this repository, for people and AI agents. Start with the overview, then follow links. Check conformance with `npm run okf:check`.

# Start here

* [Luno overview](overview.md) - What the app is, its stack and a map of the repo.
* [Request flow](request-flow.md) - What happens, step by step, when a user sends a chat message.
* [Authentication](auth.md) - Clerk sign-in, route protection and the user-sync webhook.

# Areas

* [AI](ai/) - Gemini chat model, system prompt, tool-calling loop and web search.
* [API](api/) - The three HTTP endpoints.
* [Data](data/) - Prisma models and how chat history is stored.
* [UI](ui/) - Dashboard chat interface and landing page.
* [Operations](operations/) - Environment variables, local development, limits and quotas.

# Decisions

* [Gemini model and search choice](decisions/gemini-model-and-search.md) - Why the chat model and the search model differ.
