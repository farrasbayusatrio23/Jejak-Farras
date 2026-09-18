import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceExts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];
const ignored = new Set(["node_modules", ".next", ".git", "dist", "out"]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function existsModule(base) {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return true;
  for (const ext of sourceExts) if (fs.existsSync(base + ext)) return true;
  for (const ext of sourceExts) if (fs.existsSync(path.join(base, "index" + ext))) return true;
  return false;
}

function findSameBasename(rel) {
  const wanted = path.basename(rel);
  return walk(root)
    .filter((file) => path.basename(file) === wanted)
    .map((file) => path.relative(root, file).replaceAll(path.sep, "/"));
}

const required = [
  "package.json",
  "app/layout.tsx",
  "app/page.tsx",
  "app/admin/page.tsx",
  "components/music-player.tsx",
  "components/ui/alert-dialog.tsx",
  "components/ui/attachment.tsx",
  "components/ui/button.tsx",
  "components/ui/input.tsx",
  "components/ui/progress.tsx",
  "components/ui/skeleton.tsx",
  "components/ui/sonner.tsx",
  "components/ui/switch.tsx",
  "components/ui/tabs.tsx",
  "components/ui/textarea.tsx",
  "lib/supabase/admin.ts",
  "lib/supabase/browser.ts",
  "supabase/setup.sql",
];

const problems = [];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    const alternatives = findSameBasename(rel).filter((candidate) => candidate !== rel);
    problems.push(
      alternatives.length
        ? `Missing required file: ${rel} (found similarly named file at: ${alternatives.join(", ")})`
        : `Missing required file: ${rel}`,
    );
  }
}

const importRe = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
for (const file of walk(root).filter((file) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(file))) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(importRe)) {
    const spec = match[1];
    if (spec.startsWith("@/")) {
      const target = path.join(root, spec.slice(2));
      if (!existsModule(target)) problems.push(`${path.relative(root, file)} -> ${spec}`);
    } else if (spec.startsWith("./") || spec.startsWith("../")) {
      const target = path.resolve(path.dirname(file), spec);
      if (!existsModule(target)) problems.push(`${path.relative(root, file)} -> ${spec}`);
    }
  }
}

if (problems.length) {
  console.error(`Repository verification failed. Project root: ${root}`);
  console.error(problems.map((problem) => `- ${problem}`).join("\n"));
  console.error("\nDo not remove this check. Restore/move the missing file into the exact path above so Next.js routes are complete.");
  process.exit(1);
}

console.log(`Repository verification passed (${required.length} required files checked).`);
