export type Chat = { id: number; title: string; messages?: Message[] };
export type Message = { id?: number; content?: string; text?: string; role: string; status?: string };
