// scripts/docs-sync/lib/shared/common.mjs
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Télécharge le contenu textuel d'une URL
 */
export async function fetchText(url, userAgent = "docs-sync-pipeline/1.0") {
  const res = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, text: await res.text() };
}

/**
 * Calcule une empreinte courte pour détecter les changements de contenu
 */
export function hash(content) {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
}

/**
 * Gère une file d'attente d'exécution asynchrone (concurrence limitée)
 */
export async function pool(items, worker, size = 6) {
  const results = [];
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: size }, run));
  return results;
}

/**
 * Génère des en-têtes standardisés en Frontmatter YAML pour chaque fichier Markdown de la bibliothèque
 */
export function buildFrontmatter({ tool, source, title = null, description = null, variant = null }) {
  const lines = [
    "---",
    `tool: ${tool}`,
    `source: ${source}`,
    `generated: ${new Date().toISOString().slice(0, 10)}`
  ];
  if (title) lines.push(`title: ${JSON.stringify(title)}`);
  if (description) lines.push(`description: ${JSON.stringify(description)}`);
  if (variant) lines.push(`variant: ${variant}`);
  lines.push("---", "");
  return lines.join("\n");
}

/**
 * Retourne une fonction d'écriture de fichier prenant en compte l'option dryRun
 */
export function makeWriter(root, dryRun) {
  return async function writeFile(relPath, content) {
    const abs = path.join(root, relPath);
    if (dryRun) {
      console.log(`[dry-run] Écrirait ${relPath} (${content.length} octets)`);
      return;
    }
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
  };
}

/**
 * Compare l'état actuel de la bibliothèque avec le dernier build pour lister les modifications
 */
export async function diffManifest(root, manifest, dryRun) {
  const manifestPath = path.join(root, "_meta/manifest.json");
  let prev = {};
  try {
    prev = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    /* Premier lancement ou fichier manquant */
  }

  const added = Object.keys(manifest).filter((f) => !prev[f]);
  const updated = Object.keys(manifest).filter((f) => prev[f] && prev[f] !== manifest[f]);
  const removed = Object.keys(prev).filter((f) => !manifest[f]);

  if (!dryRun) {
    await fs.mkdir(path.join(root, "_meta"), { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  }
  return { added, updated, removed };
}

/**
 * Affiche le bilan du processus dans la console
 */
export function printSummary({ added, updated, removed }, total, root) {
  console.log("\n──────── Résumé de synchronisation ────────");
  console.log(`Nouveaux fichiers  : ${added.length}`);
  console.log(`Fichiers modifiés  : ${updated.length}`);
  console.log(`Fichiers supprimés : ${removed.length}`);
  console.log(`Total dans la lib  : ${total}`);
  console.log(`Emplacement        : ${root}`);
  
  if (updated.length) {
    console.log("\nModifiés :");
    console.log(updated.map((f) => `  ~ ${f}`).join("\n"));
  }
  if (removed.length) {
    console.log("\nSupprimés (à nettoyer manuellement dans library/) :");
    console.log(removed.map((f) => `  - ${f}`).join("\n"));
  }
}