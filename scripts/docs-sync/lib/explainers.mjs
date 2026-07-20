// scripts/docs-sync/lib/explainers.mjs

function htmlSnippet({ elementName = "div", attributes = {} }) {
  const attrString = Object.entries(attributes)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  if (elementName === "img" || elementName === "input") {
    return `<${elementName} ${attrString} />`;
  }
  if (elementName === "textarea") {
    return `<${elementName} ${attrString}></${elementName}>`;
  }
  return `<${elementName} ${attrString}>\n  <!-- ... -->\n</${elementName}>`;
}

function codeBlock(lang, code) {
  return "```" + lang + "\n" + code + "\n```";
}

export function renderUsingACustomValue(attrs) {
  const utility = attrs.utility || (attrs.utilities || "").split(",")[0];
  const value = attrs.value || "<value>";
  const variable = attrs.variable || utility;
  const dataType = attrs.dataType ? `${attrs.dataType}:` : "";

  const arbitrary = htmlSnippet({
    attributes: { class: `${utility}-[${value}] ...` },
  });
  const cssVar = htmlSnippet({
    attributes: { class: `${utility}-(${dataType}--my-${variable}) ...` },
  });

  return (
    `> Valeur personnalisée — voir @_shared/patterns.md#valeur-personnalisee\n\n` +
    codeBlock("html", arbitrary) +
    "\n\n" +
    codeBlock("html", cssVar)
  );
}

export function renderResponsiveDesign(attrs) {
  const breakpoint = attrs.breakpoint || "md";
  const defaultClass = attrs.defaultClass || "";
  const featuredClass = attrs.featuredClass || "";
  const example = htmlSnippet({
    attributes: { class: `${defaultClass} ${breakpoint}:${featuredClass} ...` },
  });
  return (
    `> Design responsive — voir @_shared/patterns.md#design-responsive (breakpoint: \`${breakpoint}\`)\n\n` +
    codeBlock("html", example)
  );
}

export function renderTargetingSpecificStates(attrs) {
  const variant = attrs.variant || "hover";
  const defaultClass = attrs.defaultClass || "";
  const featuredClass = attrs.featuredClass || "";
  const example = htmlSnippet({
    attributes: { class: `${defaultClass} ${variant}:${featuredClass} ...` },
  });
  return (
    `> États ciblés (hover/focus/...) — voir @_shared/patterns.md#etats-cibles (variant: \`${variant}\`)\n\n` +
    codeBlock("html", example)
  );
}

export function renderCustomizingYourTheme(attrs) {
  const themeKey = attrs.themeKey || attrs.utility;
  const customName = attrs.customName || "custom";
  const customValue = attrs.customValue || "<value>";
  const utility = attrs.utility || (attrs.utilities || "").split(",")[0];

  const css = codeBlock(
    "css",
    `@theme {\n  --${themeKey}-${customName}: ${customValue};\n}`
  );
  const usage = htmlSnippet({
    attributes: { class: `${utility}-${customName}` },
  });

  return (
    `> Personnalisation du thème — voir @_shared/patterns.md#personnaliser-le-theme\n\n` +
    css +
    "\n\n" +
    codeBlock("html", usage)
  );
}

export function renderCustomizingYourThemeColors(attrs) {
  return renderCustomizingYourTheme({
    ...attrs,
    themeKey: "color",
    customName: "regal-blue",
    customValue: "#243c5a",
  });
}

export function renderCustomizingYourSpacingScale() {
  return (
    `> Échelle d'espacement — voir @_shared/patterns.md#echelle-despacement\n\n` +
    codeBlock("css", `@theme {\n  --spacing: 1px;\n}`)
  );
}