# Nexa Stack

Starter kit **Next.js + Tailwind CSS v4 + shadcn/ui + PocketBase**, maintenu à jour en continu et pensé pour être piloté par des agents IA (OpenCode, Claude...).

---

## Stack technique

**Frontend**
- [Next.js 16+](https://nextjs.org)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

**Backend**
- [PocketBase](https://pocketbase.io)

**Outillage IA**
- `library/` — documentation officielle à jour de toute la stack, synchronisée localement pour que les agents IA ne travaillent jamais sur des connaissances obsolètes

**Automatisation**
- [Renovate](https://docs.renovatebot.com) — met à jour les dépendances et PocketBase automatiquement
- GitHub Actions — build + test de démarrage PocketBase avant chaque fusion automatique

---

## Prérequis

- **Node.js 24 (LTS)**, avec [Corepack](https://nodejs.org/api/corepack.html) activé
- **pnpm** (installé via Corepack, pas besoin de l'installer séparément)
- **git**
- Linux, macOS, ou Windows via WSL2 — `pb/install.sh` détecte automatiquement votre système

```bash
node -v        # doit afficher v24.x
corepack enable
```

---

## Démarrage rapide

### 1. Récupérer le projet

Pour démarrer un **nouveau projet** à partir de ce kit, clique sur *Use this template* en haut de la page GitHub, puis clone ton nouveau repo. Pour contribuer à Nexa Stack lui-même, clone directement ce repo :

```bash
git clone https://github.com/MarianiStudio/nexa-stack.git
cd nexa-stack
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Installer PocketBase

```bash
chmod +x pb/install.sh
./pb/install.sh
```

### 4. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Ouvre `.env.local` et personnalise si besoin :
```
PB_ADMIN_EMAIL=admin@nexa.local
PB_ADMIN_PASSWORD=change-moi
NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
```

### 5. Créer le compte administrateur PocketBase

```bash
export $(grep -v '^#' .env.local | xargs) && pnpm run pb:admin
```

### 6. (Optionnel mais recommandé) Générer la documentation locale pour l'IA

```bash
pnpm docs:sync
```
⏱️ Prend 1 à 2 minutes. Voir [`library/README.md`](./library/README.md) pour le détail.

### 7. Lancer le projet

```bash
pnpm dev
```

C'est **la seule commande nécessaire** — elle démarre Next.js et PocketBase en même temps.

- Application : [http://localhost:3000](http://localhost:3000)
- Admin PocketBase : [http://127.0.0.1:8090/_/](http://127.0.0.1:8090/_/) (connexion avec le compte créé à l'étape 5)

---

## Structure du projet

```
nexa-stack/
├── src/                      # application Next.js (App Router)
├── pb/
│   ├── install.sh            # télécharge le binaire PocketBase (non committé)
│   ├── pb_migrations/        # schéma de base de données versionné
│   └── pb_hooks/             # hooks serveur PocketBase
├── scripts/docs-sync/        # pipeline de synchronisation de documentation
├── library/                  # documentation IA générée localement (non versionnée)
├── .opencode/agent/          # subagents OpenCode (pocketbase, ...)
├── .github/workflows/        # CI + vérification hebdomadaire du pipeline de doc
├── AGENTS.md                 # instructions pour agents IA
└── renovate.json
```

---

## Commandes disponibles

| Commande | Effet |
|---|---|
| `pnpm dev` | Démarre Next.js **et** PocketBase en parallèle |
| `pnpm build` | Compile l'application pour la production |
| `pnpm start` | Lance le build de production |
| `pnpm lint` | Vérifie le code avec ESLint |
| `pnpm pb:migrate` | Applique les migrations PocketBase |
| `pnpm pb:admin` | Crée/met à jour le superuser PocketBase (nécessite les variables d'env) |
| `pnpm docs:sync` | Régénère toute la documentation locale dans `library/` |
| `pnpm docs:sync:next` / `:tailwind` / `:react` / `:shadcn` / `:pocketbase` | Régénère une seule source de doc |

---

## PocketBase — workflow

Toute évolution du schéma de données passe par une migration versionnée :
```bash
cd pb && ./pocketbase migrate create "nom_descriptif"
```
Ne jamais modifier `pb_data/` à la main — ce dossier n'est pas versionné et contient uniquement les données locales.

---

## Documentation locale pour agents IA

`library/` contient une copie normalisée de la doc officielle de Next.js, Tailwind CSS, React, shadcn/ui et PocketBase. Elle est **volontairement absente du dépôt Git** (contenu dérivé des sites officiels, question de droits) — à régénérer une fois après chaque clone via `pnpm docs:sync`. Détails complets dans [`library/README.md`](./library/README.md).

---

## Mises à jour automatiques

[Renovate](https://docs.renovatebot.com) surveille en continu :
- les dépendances npm (patch/minor fusionnées automatiquement, majeures en revue manuelle),
- la version de PocketBase (`pb/install.sh`).

Chaque mise à jour proposée passe d'abord par un test CI (compilation + démarrage effectif de PocketBase) avant fusion automatique. Si le test échoue, la mise à jour reste bloquée en attente de revue — rien n'est jamais fusionné aveuglément.