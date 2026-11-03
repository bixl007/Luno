type Row = Record<string, any>;

/**
 * A small in-memory stand-in for the Prisma client, covering only the calls the API routes make.
 * Timestamps come from a clock that always moves forward, so ordering is testable.
 */
export function createFakeDb() {
  const users = new Map<string, Row>();
  const chats: Row[] = [];
  const messages: Row[] = [];
  let chatSeq = 1;
  let messageSeq = 1;
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 0, 1) + ++tick * 1000);

  const withMessages = (chat: Row, include?: { messages?: boolean }): Row =>
    include?.messages ? { ...chat, messages: messages.filter((m) => m.chatId === chat.id) } : { ...chat };
  const findChat = (id: number) => chats.find((c) => c.id === id);

  const prisma = {
    user: {
      findUnique: async ({ where }: Row) => users.get(where.id) ?? null,
      create: async ({ data }: Row) => {
        const row = { createdAt: now(), ...data };
        users.set(data.id, row);
        return row;
      },
      upsert: async ({ where, update, create }: Row) => {
        const existing = users.get(where.id);
        const row = existing ? { ...existing, ...update } : { createdAt: now(), ...create };
        users.set(where.id, row);
        return row;
      },
    },
    chat: {
      findMany: async ({ where, orderBy }: Row) => {
        const rows = chats.filter((c) => c.userId === where.userId);
        if (orderBy?.updatedAt === "desc") rows.sort((a, b) => b.updatedAt - a.updatedAt);
        return rows.map(({ id, title }) => ({ id, title }));
      },
      findUnique: async ({ where, include }: Row) => {
        const chat = findChat(where.id);
        return chat ? withMessages(chat, include) : null;
      },
      create: async ({ data, include }: Row) => {
        const { messages: nested, ...rest } = data;
        const chat = { id: chatSeq++, title: null, context: null, createdAt: now(), updatedAt: now(), ...rest };
        chats.push(chat);
        for (const message of nested?.create ?? []) {
          messages.push({ id: messageSeq++, chatId: chat.id, createdAt: now(), ...message });
        }
        return withMessages(chat, include);
      },
      update: async ({ where, data }: Row) => {
        const chat = findChat(where.id)!;
        Object.assign(chat, data, { updatedAt: now() });
        return { ...chat };
      },
      delete: async ({ where }: Row) => {
        chats.splice(chats.findIndex((c) => c.id === where.id), 1);
      },
    },
    message: {
      create: async ({ data }: Row) => {
        const row = { id: messageSeq++, createdAt: now(), ...data };
        messages.push(row);
        return row;
      },
      findMany: async ({ where, orderBy }: Row) => {
        const rows = messages.filter((m) => m.chatId === where.chatId);
        if (orderBy?.createdAt === "asc") rows.sort((a, b) => a.createdAt - b.createdAt);
        return rows;
      },
      deleteMany: async ({ where }: Row) => {
        for (let i = messages.length - 1; i >= 0; i--) if (messages[i].chatId === where.chatId) messages.splice(i, 1);
      },
    },
  };

  const reset = () => {
    users.clear();
    chats.length = 0;
    messages.length = 0;
  };

  return { prisma, users, chats, messages, reset };
}
