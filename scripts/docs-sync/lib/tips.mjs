// scripts/docs-sync/lib/tips.mjs
import { replaceComponentCalls } from "./tags.mjs";

const PREFIXES = {
  TipGood: "✅ **Bonne pratique**",
  TipBad: "❌ **À éviter**",
  TipInfo: "ℹ️ **Note**",
  TipCompat: "⚠️ **Compatibilité**",
};

function cleanInlineJsx(text) {
  return text
    .replace(/<p>/g, "")
    .replace(/<\/p>/g, "")
    .replace(/<code>/g, "`")
    .replace(/<\/code>/g, "`")
    .replace(/<var>/g, "<")
    .replace(/<\/var>/g, ">")
    .replace(/<a\s+href="([^"]*)">/g, "[")
    .replace(/<\/a>/g, "]")
    .trim();
}

export function renderTips(text) {
  let out = text;
  for (const [tag, prefix] of Object.entries(PREFIXES)) {
    out = replaceComponentCalls(out, tag, (attrs, children) => {
      const body = cleanInlineJsx(children || "");
      return `> ${prefix} : ${body}`;
    });
  }
  return out;
}