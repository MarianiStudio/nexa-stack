// scripts/docs-sync/lib/apitable.mjs
import ivm from "isolated-vm";

/**
 * Trouve la position du <ApiTable ... /> et extrait le contenu de rows={...}
 * par comptage de profondeur d'accolades (robuste aux expressions complexes).
 */
function extractRowsExpr(text, apiTableStart) {
  const roughEnd = text.indexOf("/>", apiTableStart);
  const rowsKeyIdx = text.indexOf("rows={", apiTableStart);
  if (rowsKeyIdx === -1 || (roughEnd !== -1 && rowsKeyIdx > roughEnd)) return null;

  let i = rowsKeyIdx + "rows={".length;
  let depth = 1;
  const start = i;
  while (depth > 0 && i < text.length) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") depth--;
    if (depth === 0) break;
    i++;
  }
  const expr = text.slice(start, i);
  const tagEnd = text.indexOf("/>", i);
  return {
    expr,
    fullTagStart: apiTableStart,
    fullTagEnd: tagEnd === -1 ? i + 1 : tagEnd + 2,
  };
}

/**
 * Évalue l'expression de manière hermétique dans un isolat V8 isolé d'isolated-vm.
 */
function evalRowsInSandbox(expr, globals = {}) {
  // Crée un isolat avec une limite stricte de mémoire (16 Mo suffisent amplement)
  const isolate = new ivm.Isolate({ memoryLimit: 16 });
  const context = isolate.createContextSync();

  // On sérialise l'objet colors pour l'injecter proprement comme constante globale
  const colorsJson = JSON.stringify(globals.colors || {});
  
  // Script d'évaluation sécurisé
  const code = `
    const colors = ${colorsJson};
    const result = (() => { return (${expr}); })();
    JSON.stringify(result);
  `;

  try {
    const script = isolate.compileScriptSync(code);
    const resultJson = script.runSync(context, { timeout: 200 }); // timeout de 200ms
    isolate.dispose(); // Libère proprement les ressources C++ de l'isolat
    return JSON.parse(resultJson);
  } catch (err) {
    isolate.dispose();
    throw err;
  }
}

function formatRow(row) {
  const [cls, css] = row;
  let cssText = Array.isArray(css) ? css.join("; ") : String(css);
  cssText = cssText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("<br>");
  return `| \`${cls}\` | \`${cssText}\` |`;
}

const SHADE_SUFFIX_RE = /-(50|100|200|300|400|500|600|700|800|900|950)$/;

function renderMarkdownTable(rows, { maxRows = 40 } = {}) {
  if (rows.length <= maxRows) {
    return ["| Classe | Styles CSS |", "| --- | --- |", ...rows.map(formatRow)].join("\n");
  }

  const special = [];
  const shadeRows = [];
  for (const row of rows) {
    if (SHADE_SUFFIX_RE.test(row[0])) shadeRows.push(row);
    else special.push(row);
  }

  const lines = ["| Classe | Styles CSS |", "| --- | --- |"];
  special.forEach((row) => lines.push(formatRow(row)));

  if (shadeRows.length) {
    const firstClass = shadeRows[0][0].replace(SHADE_SUFFIX_RE, "");
    const sampleColorName = firstClass.split("-").pop();
    const sample = shadeRows.filter((r) => r[0].includes(`-${sampleColorName}-`));
    sample.forEach((row) => lines.push(formatRow(row)));
    lines.push(
      `| \`...\` | *(${shadeRows.length - sample.length} lignes omises : même patron pour ` +
        `chaque couleur du thème × chaque nuance 50-950, voir @_shared/patterns.md#palette-de-couleurs)* |`
    );
  }
  return lines.join("\n");
}

export function renderApiTables(text, { filenameForErrors = "?", globals = {} } = {}) {
  let out = "";
  let cursor = 0;
  while (true) {
    const idx = text.indexOf("<ApiTable", cursor);
    if (idx === -1) {
      out += text.slice(cursor);
      break;
    }
    out += text.slice(cursor, idx);
    const extracted = extractRowsExpr(text, idx);
    if (!extracted) {
      const fallbackEnd = text.indexOf("/>", idx);
      cursor = fallbackEnd === -1 ? text.length : fallbackEnd + 2;
      continue;
    }
    try {
      const rows = evalRowsInSandbox(extracted.expr, globals);
      out += "\n" + renderMarkdownTable(rows) + "\n";
    } catch (err) {
      out += `\n<!-- ApiTable non évaluable automatiquement dans ${filenameForErrors} (${err.message}). -->\n`;
    }
    cursor = extracted.fullTagEnd;
  }
  return out;
}