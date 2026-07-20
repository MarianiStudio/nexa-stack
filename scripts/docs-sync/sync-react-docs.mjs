#!/usr/bin/env node
// scripts/docs-sync/sync-react-docs.mjs

import path from "node:path";
import { fetchText, hash, pool, makeWriter, diffManifest, printSummary, buildFrontmatter } from "./lib/shared/common.mjs";

const INDEX_URL = "https://react.dev/llms.txt";

const currentDir = import.meta.dirname;
const ROOT = process.env.REACT_LIB_DIR || path.join(currentDir, "..", "..", "library", "react");

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");
const ONLY = (ARGS.find((a) => a.startsWith("--only="))?.split("=")[1]) || null;
const CONCURRENCY = 8;

const TOP_CATEGORY_DIRS = {
  "Learn React": "01-learn",
  "API Reference": "02-api-reference",
};

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "index";
}

function parseLlmsTxt(raw) {
  const lines = raw.split("\n");
  const entries = [];
  let h2 = null;
  let h3 = null;
  let h4 = null;

  for (const line of lines) {
    const m2 = line.match(/^##\s+(.*)/);
    const m3 = line.match(/^###\s+(.*)/);
    const m4 = line.match(/^####\s+(.*)/);
    const item = line.match(/^-\s+\[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?/);

    if (m2) {
      h2 = m2[1].trim();
      h3 = null;
      h4 = null;
      continue;
    }
    if (m3) {
      h3 = m3[1].trim();
      h4 = null;
      continue;
    }
    if (m4) {
      h4 = m4[1].trim();
      continue;
    }
    if (item && h2) {
      entries.push({
        h2,
        h3,
        h4,
        title: item[1].trim(),
        url: item[2].trim(),
        description: (item[3] || "").trim(),
      });
    }
  }
  return entries;
}

function dirFor(entry) {
  const parts = [TOP_CATEGORY_DIRS[entry.h2] || `99-${slugify(entry.h2)}`];
  if (entry.h3) parts.push(slugify(entry.h3));
  if (entry.h4 && entry.h4 !== entry.h3) parts.push(slugify(entry.h4));
  return path.join(...parts);
}

async function main() {
  console.log(`→ Téléchargement de l'index officiel de React : ${INDEX_URL}`);
  const idx = await fetchText(INDEX_URL, "react-doc-sync/1.0");
  if (!idx.ok) {
    console.error(`Impossible de récupérer llms.txt (HTTP ${idx.status})`);
    process.exit(1);
  }

  let entries = parseLlmsTxt(idx.text);
  if (ONLY) {
    const wantDir = ONLY === "learn" ? "01-learn" : ONLY === "api-reference" ? "02-api-reference" : null;
    entries = entries.filter((e) => (wantDir ? dirFor(e).startsWith(wantDir) : true));
  }

  const write = makeWriter(ROOT, DRY_RUN);
  const manifest = {};
  const tree = {};

  await pool(entries, async (entry) => {
    const mdUrl = entry.url.endsWith(".md") ? entry.url : `${entry.url}.md`;
    const res = await fetchText(mdUrl, "react-doc-sync/1.0");
    if (!res.ok) return;

    const dir = dirFor(entry);
    const fileSlug = slugify(entry.title);
    const relPath = path.join(dir, `${fileSlug}.md`);

    const frontmatter = buildFrontmatter({
      tool: "react",
      source: entry.url,
      title: entry.title,
      description: entry.description,
    });

    const content = frontmatter + res.text;
    await write(relPath, content);
    manifest[relPath] = hash(content);

    tree[dir] ??= [];
    tree[dir].push({ title: entry.title, relPath, description: entry.description });
    console.log(`  ✓ Page : ${entry.title}`);
  }, CONCURRENCY);

  const indexLines = [
    "# React (react.dev) — Index local",
    "",
    `> Régénéré le ${new Date().toISOString().slice(0, 10)} depuis ${INDEX_URL}`,
    "> Méthode : ouvrir ce fichier en premier, repérer le fichier ciblé, puis l'ouvrir seul.",
    "",
    "## ⚠️ Learn vs API Reference",
    "",
    "`01-learn/` contient les guides explicatifs en prose.",
    "`02-api-reference/` documente la référence précise de chaque composant ou hook (courte et technique).",
    ""
  ];

  const dirs = Object.keys(tree).sort();
  for (const dir of dirs) {
    const heading = dir.replace(/^\d+-/, "").replace(/\//g, " / ").replace(/-/g, " ");
    indexLines.push(`\n## ${heading}\n`);
    for (const item of tree[dir]) {
      const desc = item.description ? ` — ${item.description}` : "";
      indexLines.push(`- [${item.title}](${item.relPath})${desc}`);
    }
  }

  const indexContent = indexLines.join("\n") + "\n";
  await write("00-INDEX.md", indexContent);
  manifest["00-INDEX.md"] = hash(indexContent);

  const diff = await diffManifest(ROOT, manifest, DRY_RUN);
  printSummary(diff, Object.keys(manifest).length, ROOT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});