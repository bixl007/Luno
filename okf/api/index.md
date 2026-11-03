# API

All routes live under `src/app/api/` and set `maxDuration = 60` where they call the model.

* [/api/chat](chat.md) - List, create (optionally with a first message) and delete chats.
* [/api/message](message.md) - List a chat's messages and send a new one.
* [/api/webhooks/clerk](clerk-webhook.md) - Mirrors new Clerk users into the database.
