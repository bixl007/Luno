# Data

PostgreSQL through Prisma; schema in `prisma/schema.prisma`, client generated to `src/generated/prisma` (git-ignored, created by `prisma generate`).

* [User](user.md) - A Clerk user, plus the synthetic `luno-ai` assistant.
* [Chat](chat.md) - One conversation, with a stored text history.
* [Message](message.md) - One message in a chat.
* [Chat context](chat-context.md) - The text history sent back to the model.
