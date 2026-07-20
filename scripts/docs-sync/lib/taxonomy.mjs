// scripts/docs-sync/lib/taxonomy.mjs
import fs from "node:fs";
import ivm from "isolated-vm";

/**
 * Parse l'index de navigation Tailwind de manière sécurisée en évaluant l'objet TS
 * dans un isolat V8 déconnecté de l'environnement Node.js principal.
 */
export function parseTaxonomy(navFilePath) {
  let src = fs.readFileSync(navFilePath, "utf8");
  
  // Transforme l'export par défaut ES6 en assignation lisible par l'isolat
  src = src.replace(/export\s+default/, "const navData =");
  src = src.replace(/\bas const\b/g, "");

  const code = `
    ${src}
    JSON.stringify(navData);
  `;

  const isolate = new ivm.Isolate({ memoryLimit: 16 });
  const context = isolate.createContextSync();

  try {
    const script = isolate.compileScriptSync(code);
    const resultJson = script.runSync(context, { timeout: 1000 });
    isolate.dispose();
    return JSON.parse(resultJson); // Retourne l'objet { Catégorie: [[Titre, Chemin], ...] }
  } catch (err) {
    isolate.dispose();
    throw new Error(`Échec de lecture de la taxonomie : ${err.message}`);
  }
}

export function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCategoryPlan(taxonomy) {
  return Object.entries(taxonomy).map(([name, entries], index) => {
    const folder = `${String(index + 1).padStart(2, "0")}-${slugify(name)}`;
    const items = entries.map(([title, docPath]) => {
      const slug = docPath.replace(/^\/docs\//, "");
      return { title, slug };
    });
    return { name, folder, items };
  });
}