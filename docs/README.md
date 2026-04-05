# 📚 Documentation API Organik

Bienvenue dans la documentation de l'API Organik pour la génération de carrousels Instagram/TikTok.

## 📖 Documents Disponibles

### 1. [API Reference](./API_REFERENCE.md)
**Documentation complète de l'API**
- Authentification
- Tous les endpoints avec exemples
- Codes d'erreur
- Exemples d'intégration (JS, Python, PHP, Ruby)
- Bonnes pratiques

### 2. [Postman Collection](./POSTMAN_COLLECTION.json)
**Collection Postman prête à l'emploi**
- Tous les endpoints configurés
- Tests automatiques intégrés
- Variables d'environnement
- Exemples de réponses

### 3. [Quick Start Guide](../QUICK_START.md)
**Démarrage rapide en 5 minutes**
- Créer une clé API
- Premier appel API
- Tests de base

### 4. [Test Guide](../TEST_GUIDE.md)
**Guide de test détaillé**
- Tests manuels avec cURL
- Scripts automatisés
- Validation complète

## 🚀 Démarrage Rapide

### 1. Obtenir une Clé API

```bash
# 1. Connectez-vous au dashboard
http://localhost:3000/dashboard

# 2. Allez dans l'onglet "CLÉ API"
# 3. Créez une nouvelle clé
# 4. Copiez la clé (format: sk_live_xxx)
```

### 2. Premier Appel API

```bash
curl http://localhost:3000/api/v1/carousels \
  -H "X-API-Key: sk_live_VOTRE_CLE"
```

### 3. Générer un Carrousel

```bash
curl -X POST http://localhost:3000/api/v1/carousels/generate \
  -H "X-API-Key: sk_live_VOTRE_CLE" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "5 astuces pour la productivité",
    "slideCount": 7
  }'
```

## 📦 Collections Postman

### Importer dans Postman

1. Ouvrez Postman
2. Cliquez sur **Import**
3. Sélectionnez `POSTMAN_COLLECTION.json`
4. Configurez les variables:
   - `BASE_URL`: `http://localhost:3000/api/v1`
   - `API_KEY`: Votre clé API

### Tests Automatiques

La collection inclut des tests automatiques pour:
- ✅ Validation des status codes
- ✅ Vérification des structures de réponse
- ✅ Tests d'authentification
- ✅ Tests de rate limiting

## 🔑 Authentification

Toutes les requêtes nécessitent un header:

```http
X-API-Key: sk_live_votre_cle_ici
```

## 📊 Endpoints Disponibles

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/carousels/generate` | Générer un carrousel |
| GET | `/carousels` | Lister les carrousels |
| GET | `/carousels/:id` | Obtenir un carrousel |
| DELETE | `/carousels/:id` | Supprimer un carrousel |

## 🎯 Exemples par Langage

### JavaScript/TypeScript
```typescript
const response = await fetch('http://localhost:3000/api/v1/carousels/generate', {
  method: 'POST',
  headers: {
    'X-API-Key': 'sk_live_votre_cle',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    topic: '7 tips productivité',
    slideCount: 7
  })
});

const carousel = await response.json();
```

### Python
```python
import requests

response = requests.post(
    'http://localhost:3000/api/v1/carousels/generate',
    headers={'X-API-Key': 'sk_live_votre_cle'},
    json={
        'topic': '7 tips productivité',
        'slideCount': 7
    }
)

carousel = response.json()
```

### cURL
```bash
curl -X POST http://localhost:3000/api/v1/carousels/generate \
  -H "X-API-Key: sk_live_votre_cle" \
  -H "Content-Type: application/json" \
  -d '{"topic": "7 tips productivité", "slideCount": 7}'
```

## ⚡ Rate Limiting

- **Limite Standard**: 100 requêtes / jour
- **Reset**: Automatique après 24h
- **Header de réponse**: `X-RateLimit-Remaining`

Lorsque la limite est atteinte:
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 100,
  "resetAt": "2024-01-16T10:30:00.000Z"
}
```

## 🔒 Sécurité

### Bonnes Pratiques

1. **Ne jamais exposer** vos clés dans le code client
2. **Utiliser des variables d'environnement**
   ```bash
   ORGANIK_API_KEY=sk_live_xxx
   ```
3. **Révoquer immédiatement** les clés compromises
4. **Rotation régulière** des clés (tous les 90 jours)
5. **HTTPS uniquement** en production

### Stockage Sécurisé

```bash
# .env
ORGANIK_API_KEY=sk_live_votre_cle

# .gitignore
.env
```

## 📈 Monitoring

### Dashboard

Suivez votre utilisation dans le dashboard:
- Usage en temps réel
- Historique des requêtes
- Statistiques par endpoint

### Logs

Toutes les requêtes sont loggées avec:
- Timestamp
- Endpoint
- Status code
- Durée (ms)
- IP address
- User agent

## 🐛 Debugging

### Erreurs Communes

#### 401 Unauthorized
```json
{
  "error": "Invalid or expired API key",
  "code": "UNAUTHORIZED"
}
```
**Solution**: Vérifiez votre clé API

#### 400 Bad Request
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [...]
}
```
**Solution**: Vérifiez les paramètres de votre requête

#### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED"
}
```
**Solution**: Attendez le reset ou upgradez votre plan

### Mode Debug

Activez les logs détaillés:
```javascript
const DEBUG = true;

if (DEBUG) {
  console.log('Request:', {
    url,
    method,
    headers,
    body
  });
}
```

## 📞 Support

### Ressources

- 📧 **Email**: support@organik.com
- 💬 **Discord**: [Rejoindre](https://discord.gg/organik)
- 📖 **Documentation**: Ce dossier
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/organik/issues)

### Status API

Vérifiez le status en temps réel:
- https://status.organik.com

### Changelog

Suivez les mises à jour:
- https://organik.com/changelog

## 🎓 Tutoriels

### Débutant
1. [Première requête API](./tutorials/first-request.md)
2. [Gérer l'authentification](./tutorials/authentication.md)
3. [Pagination des résultats](./tutorials/pagination.md)

### Avancé
1. [Optimiser les performances](./tutorials/performance.md)
2. [Gestion des erreurs](./tutorials/error-handling.md)
3. [Webhooks (à venir)](./tutorials/webhooks.md)

## 📝 Exemples de Projets

### Exemples Complets

- [TypeScript + Express](./examples/typescript-express/)
- [Python + Flask](./examples/python-flask/)
- [PHP + Laravel](./examples/php-laravel/)
- [Next.js App](./examples/nextjs-app/)

## 🔄 Mises à Jour

### v1.0.0 (Actuel)
- ✅ Génération de carrousels
- ✅ Listing et pagination
- ✅ Suppression
- ✅ Rate limiting
- ✅ Authentification par clé API

### Roadmap v1.1.0
- 🔜 Webhooks
- 🔜 Génération asynchrone
- 🔜 Analytics détaillées
- 🔜 Batch generation

## 📄 Licence

Cette API est propriétaire. Consultez les [Terms of Service](../TERMS.md) pour les conditions d'utilisation.

---

**Version**: 1.0.0
**Dernière mise à jour**: Janvier 2024
**Maintenu par**: Organik Team

💡 **Astuce**: Commencez par le [Quick Start Guide](../QUICK_START.md) pour être opérationnel en 5 minutes!
