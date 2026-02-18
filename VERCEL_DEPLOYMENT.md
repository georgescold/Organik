# 🚀 Déploiement sur Vercel

## Configuration Automatique

L'API s'adapte automatiquement à l'environnement de déploiement grâce à la détection automatique des URLs.

## Variables d'Environnement Vercel

### 1. Variables Requises

Allez dans **Vercel Dashboard → Your Project → Settings → Environment Variables** et ajoutez :

```bash
# Database (Supabase)
DATABASE_URL=postgresql://...

# Authentication
AUTH_SECRET=your-secret-key-generate-with-openssl

# Site URL (optionnel - détecté automatiquement)
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

### 2. Variables Optionnelles

```bash
# API Keys par défaut (les utilisateurs peuvent configurer les leurs)
ANTHROPIC_API_KEY=sk-ant-xxx
APIFY_API_KEY=apify_api_xxx
```

### 3. Variables Auto-Configurées par Vercel

Ces variables sont automatiquement définies par Vercel :

- `VERCEL_URL` - URL de votre déploiement
- `VERCEL_ENV` - Environnement (production, preview, development)
- `NEXT_PUBLIC_VERCEL_URL` - URL publique

## Détection Automatique des URLs

Le système détecte automatiquement l'URL de base pour l'API :

### Ordre de Priorité

1. **`NEXT_PUBLIC_API_URL`** - Si définie (pour API séparée)
2. **`VERCEL_URL`** - Auto-détectée par Vercel
3. **`NEXT_PUBLIC_SITE_URL`** - Définie manuellement
4. **`window.location.origin`** - Détection côté client
5. **`localhost:3000`** - Fallback pour développement

### Exemple de Configuration

#### Production (Vercel)
```bash
# Vercel auto-détecte, mais vous pouvez forcer :
NEXT_PUBLIC_SITE_URL=https://revolution.vercel.app

# L'API sera disponible à :
# https://revolution.vercel.app/api/v1
```

#### Domaine Personnalisé
```bash
NEXT_PUBLIC_SITE_URL=https://revolution.com

# L'API sera disponible à :
# https://revolution.com/api/v1
```

#### API Séparée (Optionnel)
```bash
NEXT_PUBLIC_API_URL=https://api.revolution.com/v1

# L'API sera disponible à :
# https://api.revolution.com/v1
```

## Étapes de Déploiement

### 1. Push sur GitHub

```bash
git push origin main
```

### 2. Connecter à Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"Add New Project"**
3. Importez votre repo GitHub
4. Configurez les variables d'environnement

### 3. Configurer la Base de Données

```bash
# Dans Vercel, ajoutez :
DATABASE_URL=postgresql://...
AUTH_SECRET=...
```

### 4. Déployer

Vercel déploie automatiquement à chaque push sur `main`.

## Tester l'API en Production

### 1. Via l'Interface Web

```
https://your-domain.vercel.app/docs/api-tester.html
```

L'URL de l'API sera auto-détectée.

### 2. Via cURL

```bash
curl https://your-domain.vercel.app/api/v1/carousels \
  -H "X-API-Key: sk_live_your_key"
```

### 3. Via Postman

Mettez à jour la variable `SITE_URL` :
```
SITE_URL=https://your-domain.vercel.app
```

## Configuration de la Documentation

### api-tester.html

Auto-détecte l'URL :
```javascript
const baseUrl = window.location.origin + '/api/v1';
```

Pas de configuration nécessaire !

### Postman Collection

Mettez à jour la variable :
```json
{
  "key": "SITE_URL",
  "value": "https://your-domain.vercel.app"
}
```

## CORS Configuration

Les endpoints API incluent déjà les headers CORS :

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};
```

### Restreindre les Origins en Production

Pour plus de sécurité, vous pouvez restreindre les origins :

```typescript
// app/api/v1/carousels/route.ts
const corsHeaders = {
  "Access-Control-Allow-Origin":
    process.env.NODE_ENV === "production"
      ? "https://your-domain.com"
      : "*",
  // ...
};
```

## Migration de Base de Données

### Lors du Premier Déploiement

Vercel Build Command peut inclure la migration :

```json
{
  "scripts": {
    "build": "prisma generate && prisma db push && next build"
  }
}
```

### Alternative : Migrations Manuelles

```bash
# En local
npx prisma migrate deploy

# Ou via Vercel CLI
vercel env pull
npx prisma migrate deploy
```

## Monitoring en Production

### 1. Vérifier le Status

```bash
curl https://your-domain.vercel.app/api/v1/carousels \
  -H "X-API-Key: sk_live_test"

# Devrait retourner 401 (authentification requise)
```

### 2. Logs Vercel

- **Vercel Dashboard → Your Project → Deployments**
- Cliquez sur le déploiement
- Onglet **"Functions"** pour voir les logs

### 3. Monitoring des Erreurs

Les erreurs sont loggées dans :
- Vercel Functions logs
- Table `ApiRequest` (audit DB)

## Troubleshooting

### Problème : URL incorrecte détectée

**Solution** : Définir explicitement `NEXT_PUBLIC_SITE_URL`

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

### Problème : CORS errors

**Solution** : Vérifier les headers CORS dans les route handlers

### Problème : Database connection

**Solution** : Vérifier `DATABASE_URL` dans Vercel

```bash
# Test connection
vercel env pull
npx prisma db execute --stdin <<< "SELECT 1;"
```

### Problème : API Key authentication fails

**Solution** : Vérifier que la migration Prisma a été exécutée

```bash
npx prisma migrate deploy
```

## Performance

### Edge Functions

Les routes API peuvent être déployées en Edge pour de meilleures performances :

```typescript
// app/api/v1/carousels/route.ts
export const runtime = 'edge'; // Optionnel
```

⚠️ **Note** : Prisma ne supporte pas encore complètement Edge Runtime.
Gardez le Node.js runtime par défaut pour l'instant.

### Caching

Utilisez les headers de cache pour les endpoints de listing :

```typescript
export async function GET(request: NextRequest) {
  // ...
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
    }
  });
}
```

## Sécurité en Production

### 1. Rate Limiting

✅ Déjà implémenté (100 req/jour par clé)

### 2. Variables Sensibles

✅ Utilisez Vercel Environment Variables (chiffrées)

### 3. HTTPS

✅ Automatiquement configuré par Vercel

### 4. API Key Rotation

Recommandé : Renouveler les clés tous les 90 jours

## Domaines Personnalisés

### Ajouter un Domaine

1. **Vercel Dashboard → Your Project → Settings → Domains**
2. Ajoutez votre domaine
3. Configurez les DNS
4. Mettez à jour `NEXT_PUBLIC_SITE_URL`

```bash
NEXT_PUBLIC_SITE_URL=https://revolution.com
```

L'API sera disponible à :
```
https://revolution.com/api/v1
```

## Checklist de Déploiement

- [ ] Variables d'environnement configurées
- [ ] `DATABASE_URL` définie
- [ ] `AUTH_SECRET` définie
- [ ] Migration Prisma exécutée
- [ ] Premier déploiement réussi
- [ ] Créer une clé API de test
- [ ] Tester `/api/v1/carousels` avec la clé
- [ ] Tester la génération de carrousel
- [ ] Vérifier les logs Vercel
- [ ] Configurer le domaine personnalisé (optionnel)
- [ ] Mettre à jour la documentation avec la nouvelle URL

## Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs Vercel
2. Testez en local d'abord
3. Vérifiez les variables d'environnement
4. Consultez la [documentation Vercel](https://vercel.com/docs)

---

**L'API est maintenant prête pour la production !** 🚀
