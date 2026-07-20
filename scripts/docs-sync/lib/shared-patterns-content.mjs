// scripts/docs-sync/lib/shared-patterns-content.mjs

export const SHARED_PATTERNS_MD = `# Patrons partagés (Tailwind v4)

Ces patrons reviennent sur des dizaines de pages de la doc officielle de Tailwind CSS. Ils sont documentés ici une seule fois pour réduire l'empreinte en jetons (tokens).

## Valeur personnalisée

Pour toute utility à valeur variable (\`rounded\`, \`w\`, \`text\`, ...), Tailwind expose deux syntaxes :
1. \`{utility}-[<valeur>]\` — valeur arbitraire directe (ex: \`rounded-[2vw]\`)
2. \`{utility}-(<custom-property>)\` — raccourci pour une variable CSS (ex: \`rounded-(--my-radius)\`)

## Design responsive

Préfixer une classe par un breakpoint (\`sm:\`, \`md:\`, \`lg:\`, \`xl:\`, \`2xl:\`) applique l'effet uniquement à partir de cette taille d'écran.
Ex: \`md:rounded-lg\` — s'applique à partir des écrans moyens.

## États ciblés (hover / focus / etc.)

Préfixer une classe par un état (\`hover:\`, \`focus:\`, \`active:\`, \`disabled:\`, ...) applique la classe uniquement lors de cet état.
Ex: \`hover:bg-blue-700\` — s'applique lors du survol.

## Personnaliser le thème

Toute valeur par défaut peut être étendue via la directive \`@theme\` dans le CSS global, en définissant une variable dans le bon espace de nom (\`--color-*\`, \`--radius-*\`, \`--spacing\`, etc.).

## Palette de couleurs

Le thème par défaut expose environ 22 couleurs × 11 nuances (\`50\` à \`950\`), toutes accessibles via \`var(--color-{nom}-{nuance})\`.

## Échelle d'espacement

Toutes les utilities numériques d'espacement (\`p-4\`, \`gap-2\`, ...) sont dérivées de la variable unique \`--spacing\` (par défaut \`0.25rem\`).
`;