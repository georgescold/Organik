# 🚀 Déployer sur Vercel - Guide Rapide

## ✅ Code Pushé avec Succès!

Vos commits ont été pushés sur GitHub :
- Commit 1: API REST complète implémentée
- Commit 2: Adaptations pour URLs dynamiques (Vercel)

## 🎯 Déploiement en 5 Minutes

### 1. Connecter à Vercel

```bash
# Option A: Via l'interface web (Recommandé)
https://vercel.com/new

# Option B: Via CLI
npm i -g vercel
vercel login
vercel
```

### 2. Configurer les Variables d'Environnement

Dans **Vercel Dashboard → Settings → Environment Variables**, ajoutez :

```bash
# REQUIS
DATABASE_URL=postgresql://...  # Votre Supabase URL
AUTH_SECRET=...                # Générez avec: openssl rand -base64 32

# OPTIONNEL (détecté automatiquement)
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
```

### 3. Déployer

```bash
git push origin main
```

Vercel déploie automatiquement ! 🎉

## 🔧 Configuration Automatique

L'API s'adapte automatiquement :

✅ **En local** : `http://localhost:3000/api/v1`
✅ **Sur Vercel** : `https://your-project.vercel.app/api/v1`
✅ **Domaine custom** : `https://your-domain.com/api/v1`

### Comment ça marche ?

1. **api-tester.html** : Utilise `window.location.origin`
2. **lib/api/config.ts** : Détecte automatiquement l'environnement
3. **Ordre de priorité** :
   - `NEXT_PUBLIC_API_URL` (si définie)
   - `VERCEL_URL` (auto par Vercel)
   - `NEXT_PUBLIC_SITE_URL` (manuelle)
   - `window.location.origin` (client-side)
   - `localhost:3000` (fallback dev)

## 📝 Variables d'Environnement

### Requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase PostgreSQL | `postgresql://...` |
| `AUTH_SECRET` | Secret NextAuth | `openssl rand -base64 32` |

### Optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `NEXT_PUBLIC_SITE_URL` | URL du site | Auto-détecté |
| `ANTHROPIC_API_KEY` | Clé par défaut | Les users peuvent configurer la leur |
| `APIFY_API_KEY` | Scraping TikTok | Les users peuvent configurer la leur |

## 🧪 Tester en Production

### 1. Via l'Interface Web

```
https://your-project.vercel.app/docs/api-tester.html
```

L'URL s'auto-détecte automatiquement !

### 2. Via cURL

```bash
# Créez d'abord une clé API dans le dashboard
curl https://your-project.vercel.app/api/v1/carousels \
  -H "X-API-Key: sk_live_your_key"
```

### 3. Via Postman

Importez la collection et mettez à jour :
```json
{
  "SITE_URL": "https://your-project.vercel.app"
}
```

## 📊 Après le Déploiement

### 1. Vérifier que ça fonctionne

```bash
# Test endpoint (devrait retourner 401)
curl https://your-project.vercel.app/api/v1/carousels

# Résultat attendu:
# {"error":"Missing X-API-Key header","code":"UNAUTHORIZED"}
```

### 2. Créer une Clé API

1. Allez sur `https://your-project.vercel.app/dashboard`
2. Connectez-vous
3. Cliquez sur **"CLÉ API"**
4. Créez une nouvelle clé
5. Copiez-la (format: `sk_live_...`)

### 3. Tester la Génération

```bash
curl -X POST https://your-project.vercel.app/api/v1/carousels/generate \
  -H "X-API-Key: sk_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "5 astuces productivité",
    "slideCount": 7
  }'
```

## 🔒 Sécurité en Production

### ✅ Déjà Configuré

- HTTPS automatique (Vercel)
- Clés API hashées (bcrypt)
- Rate limiting (100 req/jour)
- Audit logging
- CORS headers
- Ownership checks

### 🔧 Optionnel : Restreindre CORS

Pour plus de sécurité, éditez `app/api/v1/carousels/route.ts` :

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin":
    process.env.NODE_ENV === "production"
      ? "https://your-domain.com"  // Votre domaine uniquement
      : "*",
  // ...
};
```

## 🌐 Domaine Personnalisé

### Ajouter un Domaine

1. **Vercel Dashboard → Settings → Domains**
2. Ajoutez `revolution.com` (exemple)
3. Configurez vos DNS
4. Mettez à jour (optionnel) :
   ```bash
   NEXT_PUBLIC_SITE_URL=https://revolution.com
   ```

L'API sera disponible à :
```
https://revolution.com/api/v1
```

## 📚 Documentation

Toute la documentation s'adapte automatiquement :

- ✅ `docs/api-tester.html` - Auto-détecte l'URL
- ✅ `docs/API_REFERENCE.md` - Exemples génériques
- ✅ `docs/POSTMAN_COLLECTION.json` - Variable `SITE_URL`

## 🐛 Troubleshooting

### Erreur : "Cannot connect to database"

**Solution** : Vérifiez `DATABASE_URL` dans Vercel

```bash
vercel env pull
cat .env.local  # Vérifier DATABASE_URL
```

### Erreur : "Prisma Client not generated"

**Solution** : Ajoutez à votre build script

```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

### Erreur : "Tables don't exist"

**Solution** : Lancez la migration

```bash
vercel env pull
npx prisma db push
```

### L'URL n'est pas la bonne

**Solution** : Définissez explicitement

```bash
# Dans Vercel Environment Variables
NEXT_PUBLIC_SITE_URL=https://your-exact-url.vercel.app
```

## 📋 Checklist de Déploiement

- [x] Code pushé sur GitHub
- [ ] Projet créé sur Vercel
- [ ] Variables d'environnement configurées
- [ ] Premier déploiement réussi
- [ ] Base de données migrée
- [ ] Test endpoint `/api/v1/carousels` (401)
- [ ] Clé API créée dans le dashboard
- [ ] Test génération de carrousel
- [ ] Documentation testée (api-tester.html)
- [ ] Domaine personnalisé configuré (optionnel)

## 🎉 Prochaines Étapes

1. **Maintenant** :
   ```bash
   # Déployez sur Vercel
   vercel
   ```

2. **Ensuite** :
   ```
   # Testez l'API
   https://your-project.vercel.app/docs/api-tester.html
   ```

3. **Enfin** :
   ```
   # Partagez la documentation
   https://your-project.vercel.app/docs/
   ```

## 📖 Documentation Complète

Pour plus de détails, consultez :

- **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** - Guide complet
- **[docs/README.md](docs/README.md)** - Documentation API
- **[QUICK_START.md](QUICK_START.md)** - Démarrage rapide

## 🚀 Commandes Rapides

```bash
# Déployer sur Vercel
vercel

# Voir les logs
vercel logs

# Ouvrir le dashboard
vercel open

# Ajouter des variables
vercel env add

# Voir toutes les variables
vercel env ls
```

---

**Votre API est prête pour la production !** 🎊

Déployez maintenant avec `vercel` ou via l'interface web : https://vercel.com/new
