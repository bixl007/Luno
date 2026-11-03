// Validates the okf/ bundle against OKF v0.2 (§11): every concept has frontmatter with a non-empty `type`,
// reserved files follow §8/§9, and (stricter than the spec) every internal link and `resource` path resolves.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve("okf");
const errors = [];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return name.endsWith(".md") ? [path] : [];
  });

for (const file of walk(root)) {
  const rel = file.slice(root.length + 1);
  const name = rel.split("/").pop();
  const text = readFileSync(file, "utf8");
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1];

  if (name === "index.md") {
    if (frontmatter && rel !== "index.md") errors.push(`${rel}: only the root index.md may have frontmatter`);
  } else if (name === "log.md") {
    if (frontmatter) errors.push(`${rel}: log.md takes no frontmatter`);
    for (const [, heading] of text.matchAll(/^## (.*)$/gm)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(heading.trim())) errors.push(`${rel}: date heading must be YYYY-MM-DD, got "${heading}"`);
    }
  } else if (!frontmatter) {
    errors.push(`${rel}: missing frontmatter`);
  } else if (!/^type:[ \t]*\S/m.test(frontmatter)) {
    errors.push(`${rel}: missing non-empty type`);
  }

  // `resource` may be a URL or a path; a path must point at a file or folder that exists.
  const resource = frontmatter?.match(/^resource:[ \t]*(\S+)/m)?.[1];
  if (resource && !/^(https?:|mailto:)/.test(resource) && !existsSync(resolve(dirname(file), resource))) {
    errors.push(`${rel}: resource not found ${resource}`);
  }

  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = target.split("#")[0];
    const resolved = path.startsWith("/") ? join(root, path) : resolve(dirname(file), path);
    if (!existsSync(resolved)) errors.push(`${rel}: broken link ${target}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`okf: ${walk(root).length} files OK`);
