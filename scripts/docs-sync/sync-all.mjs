#!/usr/bin/env node
// scripts/docs-sync/sync-all.mjs

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const currentDir = import.meta.dirname;
const projectRoot = path.join(currentDir, "..", "..");
const libRoot = path.join(projectRoot, "library");

const scripts = [
  "sync-next-docs.mjs",
  "sync-tailwind-docs.mjs",
  "sync-react-docs.mjs",
  "sync-shadcn-docs.mjs",
  "sync-pocketbase-docs.mjs",
];

console.log("=================================================");
console.log("🚀 Lancement de la synchronisation de la bibliothèque d'IA");
console.log("=================================================\n");

for (const script of scripts) {
  const scriptPath = path.join(currentDir, script);
  if (!fs.existsSync(scriptPath)) {
    console.warn(`⚠️ Script manquant : ${script}. Passé.`);
    continue;
  }
  
  console.log(`\n📦 Synchronisation : ${script}...`);
  try {
    execSync(`node "${scriptPath}"`, { stdio: "inherit" });
  } catch (err) {
    console.error(`❌ Erreur durant l'exécution de ${script} :`, err.message);
  }
}

// Génération de l'index maître
console.log("\n→ Génération de l'index maître de la bibliothèque...");

const tools = [
  { dir: "next", label: "Next.js" },
  { dir: "tailwind", label: "Tailwind CSS v4" },
  { dir: "react", label: "React (react.dev)" },
  { dir: "shadcn", label: "shadcn/ui" },
  { dir: "pocketbase", label: "PocketBase" },
];

const indexLines = [
  "# Bibliothèque locale Nexa Stack — Index Maître",
  "",
  `> Régénéré automatiquement le ${new Date().toISOString().slice(0, 10)}`,
  "> Règle d'usage pour l'IA : Ouvrez d'abord CE fichier d'index pour localiser la ressource,",
  "> puis ouvrez uniquement le fichier cible. Ne lisez pas l'ensemble des dossiers.",
  "",
  "## Documentations disponibles",
  ""
];

for (const tool of tools) {
  const toolIndexRelPath = path.join(tool.dir, "00-INDEX.md");
  const toolIndexAbsPath = path.join(libRoot, toolIndexRelPath);
  
  if (fs.existsSync(toolIndexAbsPath)) {
    indexLines.push(`- **${tool.label}** : [${tool.dir}/00-INDEX.md](./${toolIndexRelPath})`);
  }
}

try {
  fs.mkdirSync(libRoot, { recursive: true });
  fs.writeFileSync(path.join(libRoot, "00-INDEX.md"), indexLines.join("\n") + "\n", "utf8");
  console.log("✅ Index maître généré : library/00-INDEX.md");
} catch (err) {
  console.error("❌ Échec de génération de l'index maître :", err.message);
}

console.log("\n=================================================");
console.log("🎉 Processus de synchronisation achevé.");
console.log("=================================================");