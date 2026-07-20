// scripts/docs-sync/lib/colors.mjs
import fs from "node:fs";
import path from "node:path";

export function loadOfficialColors(nodeModulesDir) {
  const themeCssPath = path.join(nodeModulesDir, "tailwindcss", "theme.css");
  if (!fs.existsSync(themeCssPath)) {
    throw new Error(
      `Fichier theme.css introuvable. Assurez-vous que tailwindcss est installé localement.`
    );
  }
  const styles = fs.readFileSync(themeCssPath, "utf8");
  let colors = {};
  for (const line of styles.split("\n")) {
    if (line.startsWith("  --color-")) {
      const [key, value] = line
        .split(":")
        .map((part) => part.trim().replace(";", ""));
      const name = key.replace("--color-", "");
      colors[name] = value;
    }
  }
  colors = { black: colors.black, white: colors.white, ...colors };
  return colors;
}