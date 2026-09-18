import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sourceExts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const ignored = new Set(['node_modules', '.next', '.git', 'dist', 'out']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function existsModule(base) {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return true;
  for (const ext of sourceExts) if (fs.existsSync(base + ext)) return true;
  for (const ext of sourceExts) if (fs.existsSync(path.join(base, 'index' + ext))) return true;
  return false;
}

const required = [
  'package.json',
  'app/page.tsx',
  'app/admin/page.tsx',
  'components/music-player.tsx',
  'components/ui/alert-dialog.tsx',
  'components/ui/attachment.tsx',
  'components/ui/button.tsx',
  'components/ui/input.tsx',
  'components/ui/progress.tsx',
  'components/ui/skeleton.tsx',
  'components/ui/sonner.tsx',
  'components/ui/switch.tsx',
  'components/ui/tabs.tsx',
  'components/ui/textarea.tsx',
  'lib/supabase/admin.ts',
  'lib/supabase/browser.ts',
  'supabase/setup.sql',
];

const problems = [];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) problems.push(`Missing required file: ${rel}`);
}

const importRe = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(importRe)) {
    const spec = match[1];
    if (spec.startsWith('@/')) {
      const target = path.join(root, spec.slice(2));
      if (!existsModule(target)) problems.push(`${path.relative(root, file)} -> ${spec}`);
    } else if (spec.startsWith('./') || spec.startsWith('../')) {
      const target = path.resolve(path.dirname(file), spec);
      if (!existsModule(target)) problems.push(`${path.relative(root, file)} -> ${spec}`);
    }
  }
}

if (problems.length) {
  console.error('Repository verification failed:\n' + problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}
console.log('Repository verification passed: all required local modules are present.');
