# Organik

> **"Ne suis pas la tendance. Crée-la."**

**Organik** est une application SaaS premium conçue pour créer des carrousels TikTok/Instagram viraux en exploitant vos données statistiques et une IA avancée (Claude Sonnet 4.6).

## Fonctionnalités Clés

- **Authentification & Onboarding** : Profilage du créateur (Persona, Objectifs).
- **Collections Intelligentes** : Upload d'images analysées par Vision AI (Description, Mood, Keywords).
- **Analyse Statistique** : Dashboard de performance, calcul d'engagement et suggestions ML basiques.
- **Studio de Création** :
  - Génération de Hooks viraux (basés sur vos stats).
  - Rédaction de Slides (Scripting).
  - Matching intelligent Images <-> Slides (sans répétition).
- **Design Premium** : UI "TikTok-like" (Dark mode, Néon, Glassmorphism).

## Tech Stack

- **Framework** : Next.js 16 (App Router)
- **Langage** : TypeScript
- **Style** : Tailwind CSS v4 + shadcn/ui
- **Base de données** : PostgreSQL (Supabase) via Prisma ORM
- **IA** : Anthropic Claude Sonnet 4.6 + Haiku 4.5 (via SDK)
- **Auth** : NextAuth.js (v5 Beta)

## Installation & Démarrage

### Pré-requis
- Node.js 18+
- Une clé API Anthropic (`sk-...`)

### 1. Cloner et Installer
```bash
git clone <repo>
cd organik
npm install
```

### 2. Configuration (.env)
> **Important** : Ce fichier contient les secrets (Base de données, Auth). Ne le committez jamais.
> **Pour rejoindre le projet** : Demandez le fichier `.env` à l'administrateur.

Exemple de structure `.env` :
```env
# Connection Supabase / Postgres
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Auth (NextAuth)
AUTH_SECRET="générer-une-clé-aléatoire-ici"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Clé API & IA
L'application **n'utilise plus** de clé API globale dans le `.env`.
Chaque utilisateur doit renseigner sa propre clé Anthropic (`sk-...`) dans les **Réglages** de l'application une fois connecté.

### 4. Lancer le serveur
```bash
npx prisma generate
npm run dev
```
Rendez-vous sur [http://localhost:3000](http://localhost:3000).

## Structure du Projet

```
/app
  /(auth)      # Pages de Login/Register
  /dashboard   # Application principale (Tabs Analysis, Collections, Creation)
  /api         # Routes API (Auth)
/components
  /ui          # Composants Shadcn (Button, Card, etc.)
  /auth        # Formulaires
  /analytics   # Tableaux et Graphiques
  /collections # Upload et Grille
  /creation    # Wizard de génération
/lib
  /ai          # Client Claude & Prompts
  auth.ts      # Config NextAuth
  prisma.ts    # Client DB
/server
  /actions     # Server Actions (Backend Logic)
```

## Modèle de Données (Prisma)

- **User** : Compte utilisateur.
- **Profile** : Données TikTok (Bio, Persona).
- **Post** : Carrousels générés et leurs stats.
- **Image** : Bibliothèque d'assets avec métadonnées IA.
- **Metrics** : Vues, Likes, Saves pour le ML.

---
**Note** : L'application utilise `turbopack` par défaut avec Next.js 16. Si vous rencontrez des erreurs de build sur Windows liées aux symlinks, utilisez `npm run dev` pour le développement.
