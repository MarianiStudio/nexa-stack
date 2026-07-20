#!/usr/bin/env node
// scripts/docs-sync/normalize.mjs

import fs from "node:fs";
import path from "node:path";

import { stripTagBlocks, unwrapTag } from "./lib/tags.mjs";
import { renderApiTables } from "./lib/apitable.mjs";
import { loadOfficialColors } from "./lib/colors.mjs";
import { parseTaxonomy, buildCategoryPlan } from "./lib/taxonomy.mjs";
import { renderTips } from "./lib/tips.mjs";
import { SHARED_PATTERNS_MD } from "./lib/shared-patterns-content.mjs";
import { hash, makeWriter, diffManifest, printSummary, buildFrontmatter } from "./lib/shared/common.mjs";
import {
  renderUsingACustomValue,
  renderResponsiveDesign,
  renderTargetingSpecificStates,
  renderCustomizingYourTheme,
  renderCustomizingYourThemeColors,
  renderCustomizingYourSpacingScale,
} from "./lib/explainers.mjs";

const [, , srcDocsDir, navFilePath, outDir, nodeModulesDir = "./node_modules"] = process.argv;

if (!srcDocsDir || !navFilePath || !outDir) {
  console.error(
    "Usage: node normalize.mjs <src-docs-dir> <nav-index-tsx> <out-dir> [node-modules-dir]"
  );
  process.exit(1);
}

const EXPLAINER_RENDERERS = {
  UsingACustomValue: renderUsingACustomValue,
  ResponsiveDesign: renderResponsiveDesign,
  TargetingSpecificStates: renderTargetingSpecificStates,
  CustomizingYourTheme: renderCustomizingYourTheme,
  CustomizingYourThemeColors: renderCustomizingYourThemeColors,
  CustomizingYourSpacingScale: renderCustomizingYourSpacingScale,
};

function extractFrontmatterFields(src) {
  const title = src.match(/export const title\s*=\s*"([^"]*)"/)?.[1] ?? null;
  const description = src.match(/export const description\s*=\s*"([^"]*)"/)?.[1] ?? null;
  return { title, description };
}

function stripImportsExports(src) {
  return src
    .replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/^export const (title|description)\s*=.*$/gm, "");
}

function stripCodeAnnotations(src) {
  return src.replace(/<!--\s*\[!code[^\]]*\]\s*-->\n?/g, "");
}

function normalizeExplainerComponents(src) {
  let out = src;
  for (const [tag, render] of Object.entries(EXPLAINER_RENDERERS)) {
    const re = new RegExp(`<${tag}([\\s\\S]*?)(/>|>)`, "g");
    out = out.replace(re, (match) => {
      // Extraction basique d'attributs
      const attrs = {};
      const attrRe = /(\w+)=(?:"([^"]*)"|\{([^}]*)\})/g;
      let m;
      while ((m = attrRe.exec(match))) {
        attrs[m[1]] = m[2] !== undefined ? m[2] : m[3].trim();
      }
      return render(attrs);
    });
  }
  return out;
}

function transformOutsideCodeFences(src, fn) {
  const parts = src.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part, i) => (i % 2 === 0 ? fn(part) : part))
    .join("");
}

function stripStrayJsxBraces(text) {
  return text
    .replace(/\{\s*\n\s*\}/g, "")
    .replace(/^\s*\{\s*$/gm, "")
    .replace(/^\s*\}\s*$/gm, "");
}

function inlineCodeTagsToBackticks(text) {
  return text.replace(/<code>([\s\S]*?)<\/code>/g, "`$1`");
}

function finalCleanup(src) {
  let out = transformOutsideCodeFences(src, (segment) =>
    inlineCodeTagsToBackticks(stripStrayJsxBraces(segment))
  );
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim() + "\n";
}

function normalizeMdxFile(rawSrc, { filename, colors, slug }) {
  const { title, description } = extractFrontmatterFields(rawSrc);

  let out = rawSrc;
  out = stripImportsExports(out);
  out = stripTagBlocks(out, "Example");
  out = stripTagBlocks(out, "Stripes");
  out = unwrapTag(out, "Figure");
  out = renderApiTables(out, { filenameForErrors: filename, globals: { colors } });
  out = normalizeExplainerComponents(out);
  out = renderTips(out);
  out = stripCodeAnnotations(out);
  out = finalCleanup(out);

  const frontmatter = buildFrontmatter({
    tool: "tailwind",
    source: `tailwindlabs/tailwindcss.com/src/docs/${filename}`,
    title,
    description
  });

  return frontmatter + out;
}

function buildLocalIndex(categoryName, items) {
  const lines = [`# ${categoryName}`, ""];
  for (const item of items) {
    lines.push(`- [${item.title}](./${item.slug}.md)`);
  }
  return lines.join("\n") + "\n";
}

function buildRootIndex(plan) {
  const lines = [
    "# Tailwind CSS v4 — Index local",
    "",
    "> Méthode : ouvrir ce fichier en premier, repérer le fichier ciblé, puis l'ouvrir seul.",
    ""
  ];
  for (const cat of plan) {
    lines.push(`## ${cat.name}`);
    lines.push(`→ [${cat.folder}/00-INDEX.md](./${cat.folder}/00-INDEX.md)`);
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
}

// ---- Exécution principale ----

async function run() {
  const colors = loadOfficialColors(nodeModulesDir);
  const taxonomy = parseTaxonomy(navFilePath);
  const plan = buildCategoryPlan(taxonomy);
  const write = makeWriter(outDir, false);

  const manifest = {};
  const processedSlugs = new Set();

  // Écrit le patron partagé anti-duplication
  const patternsRelPath = path.join("_shared", "patterns.md");
  await write(patternsRelPath, SHARED_PATTERNS_MD);
  manifest[patternsRelPath] = hash(SHARED_PATTERNS_MD);

  for (const cat of plan) {
    const catDir = cat.folder;
    const catItems = [];

    for (const item of cat.items) {
      const mdxPath = path.join(srcDocsDir, `${item.slug}.mdx`);
      if (!fs.existsSync(mdxPath)) {
        continue;
      }
      const raw = fs.readFileSync(mdxPath, "utf8");
      let normalized;
      try {
        normalized = normalizeMdxFile(raw, { filename: `${item.slug}.mdx`, colors, slug: item.slug });
      } catch (err) {
        console.error(`❌ Échec normalisation ${item.slug}.mdx: ${err.message}`);
        continue;
      }
      
      const fileRelPath = path.join(catDir, `${item.slug}.md`);
      await write(fileRelPath, normalized);
      manifest[fileRelPath] = hash(normalized);
      processedSlugs.add(item.slug);
      catItems.push(item);
    }

    if (catItems.length > 0) {
      const indexRelPath = path.join(catDir, "00-INDEX.md");
      const indexContent = buildLocalIndex(cat.name, catItems);
      await write(indexRelPath, indexContent);
      manifest[indexRelPath] = hash(indexContent);
    }
  }

  // Écrit l'index racine de Tailwind
  const rootIndexContent = buildRootIndex(plan);
  await write("00-INDEX.md", rootIndexContent);
  manifest["00-INDEX.md"] = hash(rootIndexContent);

  // Compare avec le manifest précédent et affiche le bilan
  const diff = await diffManifest(outDir, manifest, false);
  printSummary(diff, Object.keys(manifest).length, outDir);
}

run().catch((err) => {
  console.error("❌ Erreur critique lors de la normalisation :", err);
  process.exit(1);
});