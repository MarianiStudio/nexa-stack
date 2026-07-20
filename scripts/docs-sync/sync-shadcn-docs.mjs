#!/usr/bin/env node
// scripts/docs-sync/sync-shadcn-docs.mjs

import path from "node:path";
import { fetchText, hash, pool, makeWriter, diffManifest, printSummary, buildFrontmatter } from "./lib/shared/common.mjs";

const BASE_SITE = "https://ui.shadcn.com";
const INDEX_URL = `${BASE_SITE}/llms.txt`;

const currentDir = import.meta.dirname;
const ROOT = process.env.SHADCN_LIB_DIR || path.join(currentDir, "..", "..", "library", "shadcn");

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");
const ONLY = (ARGS.find((a) => a.startsWith("--only="))?.split("=")[1]) || null;
const CONCURRENCY = 6;

const CATEGORY_DIRS = {
  "Overview": "01-overview",
  "Installation": "02-installation",
  "Components": "03-components",
  "Dark Mode": "04-dark-mode",
  "RTL": "05-rtl",
  "Forms": "06-forms",
  "Advanced": "07-advanced",
  "MCP Server": "08-mcp-server",
  "Registry": "09-registry",
  "Registry Schemas": "09-registry",
};

const COMPONENT_VARIANTS = [
  { slug: "base", label: "Base UI" },
  { slug: "radix", label: "Radix UI" },
  { slug: "aria", label: "React Aria" },
];

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchMarkdown(pageUrl) {
  const mdUrl = pageUrl.endsWith(".md") ? pageUrl : `${pageUrl}.md`;
  return fetchText(mdUrl, "shadcn-doc-sync/1.0");
}

function parseLlmsTxt(raw) {
  const lines = raw.split("\n");
  const entries = [];
  let category = null;
  let subcategory = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    const item = line.match(/^-\s+\[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?/);

    if (h2) {
      category = h2[1].trim();
      subcategory = null;
      continue;
    }
    if (h3) {
      subcategory = h3[1].trim();
      continue;
    }
    if (item && category) {
      entries.push({
        category,
        subcategory,
        title: item[1].trim(),
        url: item[2].trim(),
        description: (item[3] || "").trim(),
      });
    }
  }
  return entries;
}

function componentSlugFromUrl(url) {
  return url.replace(/\/+$/, "").split("/").pop();
}

async function fetchComponentVariants(slug) {
  const results = [];
  for (const variant of COMPONENT_VARIANTS) {
    const url = `${BASE_SITE}/docs/components/${variant.slug}/${slug}.md`;
    const res = await fetchText(url, "shadcn-doc-sync/1.0");
    if (res.ok && res.text && !res.text.startsWith("<!DOCTYPE")) {
      results.push({ ...variant, content: res.text });
    }
  }
  if (results.length === 0) {
    const generic = await fetchText(`${BASE_SITE}/docs/components/${slug}.md`, "shadcn-doc-sync/1.0");
    if (generic.ok) results.push({ slug: "base", label: "Base UI", content: generic.text });
  }
  return results;
}

async function main() {
  console.log(`→ Téléchargement de l'index officiel shadcn : ${INDEX_URL}`);
  const idx = await fetchText(INDEX_URL, "shadcn-doc-sync/1.0");
  if (!idx.ok) {
    console.error(`Impossible de récupérer llms.txt (HTTP ${idx.status})`);
    process.exit(1);
  }

  const entries = parseLlmsTxt(idx.text);
  const write = makeWriter(ROOT, DRY_RUN);
  const manifest = {};
  
  const indexLines = [
    "# shadcn/ui — Index local",
    "",
    `> Régénéré le ${new Date().toISOString().slice(0, 10)} depuis ${INDEX_URL}`,
    "> Méthode : ouvrir ce fichier en premier, repérer le fichier ciblé, puis l'ouvrir seul.",
    "",
    "## ⚠️ Bases de composants",
    "",
    "shadcn/ui propose 3 implémentations par composant : `base` (Base UI, **défaut par défaut**), ",
    "`radix` (Radix UI, ancien défaut) et `aria` (React Aria).",
    "Avant d'ouvrir un fichier de composant, vérifiez votre configuration ou `components.json` du projet.",
    ""
  ];

  let lastCategory = null;
  let lastSubcategory = null;

  for (const entry of entries) {
    if (ONLY && slugify(entry.category) !== ONLY) continue;

    const catDir = CATEGORY_DIRS[entry.category] || `99-${slugify(entry.category)}`;

    if (entry.category !== lastCategory) {
      indexLines.push(`\n## ${entry.category}\n`);
      lastCategory = entry.category;
      lastSubcategory = null;
    }
    if (entry.subcategory && entry.subcategory !== lastSubcategory) {
      indexLines.push(`\n### ${entry.subcategory}\n`);
      lastSubcategory = entry.subcategory;
    }

    if (entry.category === "Components") {
      const slug = componentSlugFromUrl(entry.url);
      const subDir = entry.subcategory ? slugify(entry.subcategory) : "misc";
      const dirRel = path.join(catDir, subDir, slug);

      const variants = await fetchComponentVariants(slug);
      if (variants.length === 0) {
        continue;
      }
      for (const v of variants) {
        const relPath = path.join(dirRel, `${v.slug}.md`);
        const frontmatter = buildFrontmatter({
          tool: "shadcn",
          source: `${BASE_SITE}/docs/components/${v.slug}/${slug}`,
          title: `${entry.title} (${v.label})`,
          variant: v.slug
        });
        const content = frontmatter + v.content;
        await write(relPath, content);
        manifest[relPath] = hash(content);
      }
      const variantList = variants.map((v) => v.slug).join(",");
      indexLines.push(`- **${entry.title}** — \`${dirRel}/{${variantList}}.md\` — ${entry.description}`);
      console.log(`  ✓ Composant : ${slug} (${variantList})`);
    } else {
      const res = await fetchMarkdown(entry.url);
      if (!res.ok) {
        continue;
      }
      const fileSlug = slugify(entry.title);
      const relPath = path.join(catDir, `${fileSlug}.md`);
      const frontmatter = buildFrontmatter({
        tool: "shadcn",
        source: entry.url,
        title: entry.title,
        description: entry.description
      });
      const content = frontmatter + res.text;
      await write(relPath, content);
      manifest[relPath] = hash(content);
      indexLines.push(`- [${entry.title}](${relPath}) — ${entry.description}`);
      console.log(`  ✓ Guide : ${entry.title}`);
    }
  }

  await write("00-INDEX.md", indexLines.join("\n") + "\n");
  manifest["00-INDEX.md"] = hash(indexLines.join("\n") + "\n");

  const diff = await diffManifest(ROOT, manifest, DRY_RUN);
  printSummary(diff, Object.keys(manifest).length, ROOT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});