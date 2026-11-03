import { MAX_TOTAL_BYTES, kindOf, mimeTypeOf, type Attachment } from "@/lib/attachments";

const MAX_SIDE = 1600;
// Photos from a phone are several MB; anything under this goes through untouched.
const KEEP_AS_IS_BYTES = 400_000;

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });

/** Shrinks a large photo to at most 1600 px as JPEG, so it uploads fast and fits the size limit. Returns null if the browser can't. */
async function shrinkImage(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#fff"; // JPEG has no transparency
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  } catch {
    return null;
  }
}

/** Reads a picked file into what the API takes. Throws an Error with a message fit to show the user. */
export async function prepareFile(file: File): Promise<Attachment> {
  const mimeType = mimeTypeOf(file);
  const kind = kindOf(mimeType);
  if (!kind) throw new Error(`${file.name} isn't a type Luno can read. Try an image, PDF or text file.`);

  let blob: Blob = file;
  let type = mimeType;
  if (kind === "image" && file.size > KEEP_AS_IS_BYTES) {
    const smaller = await shrinkImage(file);
    if (smaller && smaller.size < file.size) {
      blob = smaller;
      type = "image/jpeg";
    }
  }
  if (blob.size > MAX_TOTAL_BYTES) throw new Error(`${file.name} is too large. Keep files under 3 MB.`);
  return { name: file.name, mimeType: type, data: await toBase64(blob) };
}

/** Approximate size of an attachment before base64 was added. */
export const sizeOf = (a: Attachment) => Math.floor((a.data.length * 3) / 4);
