// Files sent with a message. Pure rules shared by the composer (which prepares files) and the API (which checks them).

export const MAX_ATTACHMENTS = 4;
/** Total size of all files before base64 (which adds a third). Keeps the request under common 4.5 MB platform limits. */
export const MAX_TOTAL_BYTES = 3_000_000;

/** A file as it travels in the request body. */
export type Attachment = { name: string; mimeType: string; data: string };
/** What is kept in the database: the files themselves are not stored. */
export type AttachmentMeta = { name: string; mimeType: string };

export type AttachmentKind = "image" | "pdf" | "text";

const TEXT_TYPES = new Set(["application/json", "application/xml", "application/x-yaml", "application/javascript", "application/typescript"]);
const TEXT_EXTENSIONS = /\.(txt|md|markdown|csv|tsv|json|ya?ml|xml|html?|css|jsx?|tsx?|py|rb|go|rs|java|c|h|cpp|cs|php|sh|sql|log|toml|ini|env)$/i;

/** What Luno can read from a file, or null if it can't read it. */
export function kindOf(mimeType: string): AttachmentKind | null {
  if (/^image\/(png|jpeg|webp|heic|heif)$/.test(mimeType)) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/") || TEXT_TYPES.has(mimeType)) return "text";
  return null;
}

/** Browsers leave `type` empty for many source files, so fall back to the extension. */
export function mimeTypeOf(file: { name: string; type: string }): string {
  if (file.type) return file.type;
  return TEXT_EXTENSIONS.test(file.name) ? "text/plain" : "";
}

/** What the non-Gemini vision providers accept: PNG, JPEG and WebP images and text. PDFs and HEIC photos need Gemini. */
export const isVisionReadable = (a: { mimeType: string }) => /^image\/(png|jpeg|webp)$/.test(a.mimeType) || kindOf(a.mimeType) === "text";

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const bytesOf = (data: string) => Math.floor((data.length * 3) / 4);

export const attachmentMeta = ({ name, mimeType }: Attachment): AttachmentMeta => ({ name, mimeType });

/** Checks the attachments a client sent. Returns them cleaned, or the reason they were refused. */
export function parseAttachments(input: unknown): { attachments: Attachment[] } | { error: string } {
  if (input === undefined || input === null) return { attachments: [] };
  if (!Array.isArray(input)) return { error: "Attachments must be a list." };
  if (input.length > MAX_ATTACHMENTS) return { error: `You can attach up to ${MAX_ATTACHMENTS} files.` };

  let total = 0;
  const attachments: Attachment[] = [];
  for (const item of input) {
    const { name, mimeType, data } = (item ?? {}) as Record<string, unknown>;
    if (typeof name !== "string" || typeof mimeType !== "string" || typeof data !== "string" || !name.trim() || !data) {
      return { error: "An attachment is malformed." };
    }
    if (!kindOf(mimeType)) return { error: `${name} is not a supported file type.` };
    if (!BASE64.test(data)) return { error: `${name} could not be read.` };
    total += bytesOf(data);
    if (total > MAX_TOTAL_BYTES) return { error: "Those files are too large. Keep them under 3 MB in total." };
    attachments.push({ name: name.trim().slice(0, 120), mimeType, data });
  }
  return { attachments };
}
