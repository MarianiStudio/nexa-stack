#!/usr/bin/env node
// scripts/docs-sync/sync-pocketbase-docs.mjs

import path from "node:path";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { fetchText, hash, pool, makeWriter, diffManifest, printSummary, buildFrontmatter } from "./lib/shared/common.mjs";

const SITE = "https://pocketbase.io";
const DOCS_INDEX_URL = `${SITE}/docs/`;

const currentDir = import.meta.dirname;
const ROOT = process.env.POCKETBASE_LIB_DIR || path.join(currentDir, "..", "..", "library", "pocketbase");

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");
const ONLY = (ARGS.find((a) => a.startsWith("--only="))?.split("=")[1]) || null;
const CONCURRENCY = 5;

const GETTING_STARTED_SLUGS = new Set([
  "",
  "how-to-use",
  "collections",
  "api-rules-and-filters",
  "authentication",
  "files-handling",
  "working-with-relations",
  "use-as-framework",
  "going-to-production",
]);

const SDKS = [
  {
    name: "js-sdk",
    label: "JavaScript SDK",
    url: "https://raw.githubusercontent.com/pocketbase/js-sdk/master/README.md",
  },
  {
    name: "dart-sdk",
    label: "Dart SDK",
    url: "https://raw.githubusercontent.com/pocketbase/dart-sdk/master/README.md",
  },
];

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

function discoverDocSlugs(html) {
  const slugs = new Set([""]);
  const re = /href="\/docs\/([a-z0-9-]*)\/?"/g;
  let m;
  while ((m = re.exec(html))) {
    slugs.add(m[1]);
  }
  return [...slugs];
}

function htmlToMarkdown(html, url) {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  if (!article) return null;
  const md = turndown.turndown(article.content);
  return { title: article.title, markdown: md };
}

function categoryFor(slug) {
  if (GETTING_STARTED_SLUGS.has(slug)) return { dir: "01-getting-started", label: "Getting Started" };
  if (slug.startsWith("go-")) return { dir: "03-extend-with-go", label: "Extend with Go" };
  if (slug.startsWith("js-")) return { dir: "04-extend-with-js", label: "Extend with JS" };
  if (slug.startsWith("api-")) return { dir: "02-web-api-reference", label: "Web API reference" };
  return { dir: "99-other", label: "Other" };
}

function titleCase(slug) {
  if (slug === "") return "Introduction";
  return slug
    .replace(/^(go|js|api)-/, "")
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

async function main() {
  console.log(`→ Téléchargement de la page de documentation de PocketBase : ${DOCS_INDEX_URL}`);
  const idxRes = await fetchText(DOCS_INDEX_URL, "pocketbase-doc-sync/1.0");
  if (!idxRes.ok) {
    console.error(`Impossible de récupérer l'index PocketBase (HTTP ${idxRes.status})`);
    process.exit(1);
  }

  const slugs = discoverDocSlugs(idxRes.text).filter((s) => {
    if (!ONLY) return true;
    if (ONLY === "getting-started") return GETTING_STARTED_SLUGS.has(s);
    return s.startsWith(`${ONLY}-`) || s === ONLY;
  });

  const write = makeWriter(ROOT, DRY_RUN);
  const manifest = {};
  const byCategory = {};

  await pool(slugs, async (slug) => {
    const url = slug === "" ? DOCS_INDEX_URL : `${SITE}/docs/${slug}`;
    const res = await fetchText(url, "pocketbase-doc-sync/1.0");
    if (!res.ok) return;

    const extracted = htmlToMarkdown(res.text, url);
    if (!extracted) return;

    const { dir, label } = categoryFor(slug);
    const fileSlug = slug === "" ? "introduction" : slug;
    const relPath = path.join(dir, `${fileSlug}.md`);

    const frontmatter = buildFrontmatter({
      tool: "pocketbase",
      source: url,
      title: extracted.title || titleCase(slug),
    });

    const content = frontmatter + extracted.markdown;
    await write(relPath, content);
    manifest[relPath] = hash(content);

    byCategory[dir] ??= { label, items: [] };
    byCategory[dir].items.push({
      title: extracted.title || titleCase(slug),
      relPath,
    });
    console.log(`  ✓ Page : ${slug || "(introduction)"}`);
  }, CONCURRENCY);

  if (!ONLY || ONLY === "sdks") {
    for (const sdk of SDKS) {
      const res = await fetchText(sdk.url, "pocketbase-doc-sync/1.0");
      if (!res.ok) continue;

      const relPath = path.join("05-sdks", `${sdk.name}.md`);
      const frontmatter = buildFrontmatter({
        tool: "pocketbase",
        source: sdk.url,
        title: sdk.label,
      });

      const content = frontmatter + res.text;
      await write(relPath, content);
      manifest[relPath] = hash(content);

      byCategory["05-sdks"] ??= { label: "SDKs officiels", items: [] };
      byCategory["05-sdks"].items.push({ title: sdk.label, relPath });
      console.log(`  ✓ SDK : ${sdk.name}`);
    }
  }

  const indexLines = [
    "# PocketBase — Index local",
    "",
    `> Régénéré le ${new Date().toISOString().slice(0, 10)} depuis ${SITE}/docs/`,
    "> Méthode : ouvrir ce fichier en premier, repérer le fichier ciblé, puis l'ouvrir seul.",
    "",
    "## ⚠️ Go vs JS",
    "",
    "PocketBase peut être étendu en **Go** ou en **JavaScript** (via le moteur JSVM embarqué).",
    "Ce sont deux façons de faire différentes. Vérifiez votre structure de projet avant d'ouvrir un dossier.",
    ""
  ];

  const order = [
    "01-getting-started",
    "02-web-api-reference",
    "03-extend-with-go",
    "04-extend-with-js",
    "05-sdks",
    "99-other",
  ];

  for (const dir of order) {
    const cat = byCategory[dir];
    if (!cat || cat.items.length === 0) continue;
    indexLines.push(`\n## ${cat.label}\n`);
    for (const item of cat.items.sort((a, b) => a.title.localeCompare(b.title))) {
      indexLines.push(`- [${item.title}](${item.relPath})`);
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