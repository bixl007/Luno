// Prints one rendered chat message as a PDF through the browser's print dialog ("Save as PDF"). The browser lays the
// page out itself, so tables, code, links and every language print correctly, which a hand-drawn PDF cannot do.

const PRINT_CSS = `
  @page { margin: 18mm 16mm; }
  html, body { background: #fff !important; }
  body { margin: 0; color: #1c1917; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif; }
  .doc-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 1px solid #d6d3d1; }
  .doc-head strong { font-family: var(--font-newsreader), Georgia, serif; font-size: 22px; font-weight: 600; }
  .doc-head span { font-size: 12px; color: #78716c; }
  .doc-body { font-size: 14px; line-height: 1.65; }
  .doc-body > div { font-size: 14px !important; line-height: 1.65 !important; color: #1c1917 !important; }
  .doc-body a { color: #3f4bb8 !important; text-decoration: underline; word-break: break-word; }
  code, pre { white-space: pre-wrap !important; word-break: break-word; }
  pre, table, tr, blockquote, img { break-inside: avoid; }
  h1, h2, h3, h4 { break-after: avoid; }
  table { width: 100%; }
`;

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A complete, light-themed HTML page holding a copy of `source`, ready to print. */
export function printableHtml(source: HTMLElement, head: string, bodyClass: string, date: string): string {
  const copy = source.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("button").forEach((button) => button.remove());
  // Code is coloured for the on-screen theme (pale on dark); on white paper it must be plain dark text.
  copy.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    for (const property of ["color", "background", "background-color", "text-shadow"]) el.style.removeProperty(property);
  });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Luno chat</title>${head}<style>${PRINT_CSS}</style></head><body class="${escapeHtml(bodyClass)}"><header class="doc-head"><strong>Luno</strong><span>${escapeHtml(date)}</span></header><main class="doc-body">${copy.outerHTML}</main></body></html>`;
}

/** Opens the print dialog for a message element. Rejects if the browser cannot print it. */
export async function printMessage(source: HTMLElement): Promise<void> {
  // The page's own stylesheets are reused so the message looks as it does on screen. The copy has no `dark` class,
  // so it always prints with the light theme.
  const head = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map((node) => node.outerHTML).join("");
  const html = printableHtml(source, head, document.body.className, new Date().toLocaleDateString(undefined, { dateStyle: "long" }));

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  const loaded = new Promise<void>((resolve) => {
    frame.onload = () => resolve();
  });
  frame.srcdoc = html;
  document.body.appendChild(frame);
  await loaded;

  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    throw new Error("Print frame unavailable");
  }
  await win.document.fonts?.ready;
  // Chrome blocks inside print() until the dialog closes; others return at once, so cleanup also waits for afterprint.
  win.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => frame.remove(), 5 * 60_000);
  win.focus();
  win.print();
}
