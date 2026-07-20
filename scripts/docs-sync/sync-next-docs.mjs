#!/usr/bin/env node
// scripts/docs-sync/sync-next-docs.mjs

import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { hash, makeWriter, diffManifest, printSummary, buildFrontmatter } from "./lib/shared/common.mjs";

const currentDir = import.meta.dirname;
const projectRoot = path.join(currentDir, "..", "..");
const nextDocsSource = path.join(projectRoot, "node_modules", "next", "dist", "docs");
const ROOT = path.join(projectRoot, "library", "next");

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Parcourt récursivement le dossier pour trouver les fichiers markdown
 */
async function getFilesRecursively(dir) {
  const entries = await fsPromises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const res = path.resolve(dir, entry.name);
    return entry.isDirectory() ? getFilesRecursively(res) : res;
  }));
  return files.flat().filter(f => f.endsWith(".md") || f.endsWith(".mdx"));
}

/**
 * Formate le nom du fichier pour en faire un titre lisible
 */
function formatTitle(filename) {
  return path.basename(filename, path.extname(filename))
    .replace(/^\d+-/, "")
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Extrait et nettoie le nom de la catégorie (ex: "01-app/02-guides" -> "APP / GUIDES")
 */
function formatCategory(relPath) {
  return path.dirname(relPath)
    .split(path.sep)
    .map(p => p.replace(/^\d+-/, "").toUpperCase())
    .join(" / ");
}

async function main() {
  console.log("→ Analyse de la documentation Next.js intégrée...");

  if (!fs.existsSync(nextDocsSource)) {
    console.warn("⚠️  Dossier de documentation Next.js introuvable dans node_modules/next/dist/docs.");
    console.warn("   La documentation intégrée nécessite Next.js v16.2.0 ou supérieur.");
    console.warn("   Assurez-vous d'avoir exécuté 'pnpm install' dans votre projet.");
    return;
  }

  const files = await getFilesRecursively(nextDocsSource);
  console.log(`  ✓ ${files.length} fichiers de documentation Next.js détectés.`);

  const write = makeWriter(ROOT, DRY_RUN);
  const manifest = {};
  const tree = {};

  for (const file of files) {
    const relPath = path.relative(nextDocsSource, file);
    const rawContent = await fsPromises.readFile(file, "utf8");

    const title = formatTitle(relPath);
    const frontmatter = buildFrontmatter({
      tool: "next",
      source: `node_modules/next/dist/docs/${relPath}`,
      title: title
    });

    const content = frontmatter + rawContent;
    await write(relPath, content);
    manifest[relPath] = hash(content);

    const category = formatCategory(relPath);
    tree[category] ??= [];
    tree[category].push({ title, relPath });
  }

  // Génération de l'index local Next.js
  const indexLines = [
    "# Next.js — Index local",
    "",
    `> Extrait localement depuis node_modules/next/dist/docs/`,
    "> Méthode : ouvrir ce fichier en premier, repérer le fichier ciblé, puis l'ouvrir seul.",
    "",
    "## ⚠️ App Router vs Pages Router",
    "",
    "Next.js recommande l'usage de l'**App Router** (`01-app/`) pour les nouveaux projets.",
    "Le **Pages Router** (`02-pages/`) reste disponible pour la compatibilité.",
    ""
  ];

  const categories = Object.keys(tree).sort();
  for (const category of categories) {
    if (category === ".") continue; // Fichiers racine (comme index.md)
    indexLines.push(`\n## ${category}\n`);
    for (const item of tree[category].sort((a, b) => a.title.localeCompare(b.title))) {
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
  console.error("❌ Erreur lors de la synchronisation Next.js :", err);
  process.exit(1);
});