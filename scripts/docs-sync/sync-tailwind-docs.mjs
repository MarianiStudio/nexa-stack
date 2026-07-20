#!/usr/bin/env node
// scripts/docs-sync/sync-tailwind-docs.mjs

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const currentDir = import.meta.dirname;
const CACHE_DIR = path.join(currentDir, ".cache", "tailwindcss.com");
const OUT_DIR = path.join(currentDir, "..", "..", "library", "tailwind");

console.log("→ Vérification et mise à jour de la documentation source Tailwind CSS v4...");

if (!fs.existsSync(CACHE_DIR)) {
  console.log("  (Premier lancement : clonage du dépôt officiel. Cela peut prendre quelques instants...)");
  fs.mkdirSync(path.dirname(CACHE_DIR), { recursive: true });
  // Clonage superficiel (depth 1) pour gagner du temps et de la bande passante
  execSync(`git clone --depth 1 https://github.com/tailwindlabs/tailwindcss.com.git "${CACHE_DIR}"`, { stdio: "inherit" });
} else {
  console.log("  (Mise à jour du dépôt local via git pull...)");
  execSync(`git -C "${CACHE_DIR}" pull --depth 1`, { stdio: "inherit" });
}

const srcDocsDir = path.join(CACHE_DIR, "src", "docs");
const navFilePath = path.join(CACHE_DIR, "src", "app", "(docs)", "docs", "index.tsx");
const projectRoot = path.join(currentDir, "..", "..");

console.log("→ Exécution de la normalisation...");

execSync(
  `node "${path.join(currentDir, "normalize.mjs")}" "${srcDocsDir}" "${navFilePath}" "${OUT_DIR}" "${path.join(projectRoot, "node_modules")}"`,
  { stdio: "inherit" }
);