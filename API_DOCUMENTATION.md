# API REST - Génération de Carrousels

## Vue d'ensemble

Cette API REST vous permet de générer des carrousels via des requêtes HTTP, idéal pour des intégrations externes ou des automations.

## Authentification

Toutes les requêtes nécessitent une clé API envoyée via le header `X-API-Key`.

```bash
X-API-Key: sk_live_votre_cle_ici
```

### Obtenir une clé API

1. Connectez-vous à votre dashboard
2. Cliquez sur l'onglet "CLÉ API"
3. Cliquez sur "Create New Key"
4. Donnez un nom à votre clé
5. Copiez la clé générée (elle ne sera affichée qu'une seule fois)

## Rate Limiting

- **Limite par défaut** : 100 requêtes par jour
- **Reset** : Automatique après 24 heures
- En cas de dépassement, vous recevrez une erreur `429` avec la date de reset

## Endpoints

### 1. Obtenir les informations du compte

Récupère les informations de votre compte utilisateur.

**Endpoint** : `GET /api/v1/account`

**Response** :
```json
{
  "id": "clxxx...",
  "name": "John Doe",
  "email": "john@example.com",
  "image": "https://...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "hasAnthropicKey": true,
  "hasApifyKey": true,
  "stats": {
    "carousels": 42,
    "images": 156,
    "collections": 5,
    "profiles": 3,
    "apiKeys": 2
  },
  "metrics": {
    "total": {
      "views": 150000,
      "likes": 8500,
      "saves": 1200,
      "comments": 450,
      "shares": 300
    },
    "average": {
      "views": 5000,
      "likes": 283,
      "saves": 40,
      "comments": 15,
      "shares": 10
    }
  }
}
```

**Champs de réponse** :
- `stats` : Statistiques générales du compte (nombre de carousels, images, collections, etc.)
- `metrics.total` : Métriques agrégées totales de tous vos posts (vues, likes, saves, commentaires, partages)
- `metrics.average` : Métriques moyennes par post

**Exemple** :
```bash
curl -X GET https://your-domain.com/api/v1/account \
  -H "X-API-Key: sk_live_votre_cle"
```

### 2. Mettre à jour le compte

Met à jour les informations de votre compte.

**Endpoint** : `PUT /api/v1/account`

**Body** :
```json
{
  "name": "John Doe",
  "email": "newemail@example.com"
}
```

**Paramètres** :
- `name` (string, optionnel) : Nom d'utilisateur (1-100 caractères)
- `email` (string, optionnel) : Adresse email (doit être valide et unique)

**Response** :
```json
{
  "message": "Account updated successfully",
  "id": "clxxx...",
  "name": "John Doe",
  "email": "newemail@example.com",
  "image": "https://...",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Exemple** :
```bash
curl -X PUT https://your-domain.com/api/v1/account \
  -H "X-API-Key: sk_live_votre_cle" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "newemail@example.com"
  }'
```

### 3. Obtenir les clés API configurées

Récupère l'état de vos clés API tierces (Anthropic et Apify).

**Endpoint** : `GET /api/v1/settings`

**Response** :
```json
{
  "anthropicApiKey": "sk-ant-a...xyz",
  "apifyApiKey": "apify_a...xyz",
  "hasAnthropicKey": true,
  "hasApifyKey": true
}
```

**Note** : Les clés sont masquées pour des raisons de sécurité (seuls les premiers et derniers caractères sont affichés).

**Exemple** :
```bash
curl -X GET https://your-domain.com/api/v1/settings \
  -H "X-API-Key: sk_live_votre_cle"
```

### 4. Configurer les clés API

Configure vos clés API Anthropic et Apify pour la génération de contenu.

**Endpoint** : `PUT /api/v1/settings`

**Body** :
```json
{
  "anthropicApiKey": "sk-ant-api03-xxx",
  "apifyApiKey": "apify_api_xxx"
}
```

**Paramètres** :
- `anthropicApiKey` (string, optionnel) : Votre clé API Anthropic (pour la génération de texte)
- `apifyApiKey` (string, optionnel) : Votre clé API Apify (pour le scraping de données)

**Response** :
```json
{
  "message": "Settings updated successfully",
  "anthropicApiKey": "sk-ant-a...xyz",
  "apifyApiKey": "apify_a...xyz",
  "hasAnthropicKey": true,
  "hasApifyKey": true
}
```

**Exemple** :
```bash
curl -X PUT https://your-domain.com/api/v1/settings \
  -H "X-API-Key: sk_live_votre_cle" \
  -H "Content-Type: application/json" \
  -d '{
    "anthropicApiKey": "sk-ant-api03-xxx",
    "apifyApiKey": "apify_api_xxx"
  }'
```

### 5. Générer un carrousel

Génère un nouveau carrousel avec des slides et des images automatiquement associées.

**Endpoint** : `POST /api/v1/carousels/generate`

**Body** :
```json
{
  "topic": "5 tips pour mieux dormir",
  "slideCount": 7,
  "collectionId": "optional_collection_id",
  "profileId": "optional_profile_id"
}
```

**Paramètres** :
- `topic` (string, requis) : Le sujet du carrousel (max 500 caractères)
- `slideCount` (number, optionnel) : Nombre de slides (entre 5 et 10, défaut: 7)
- `collectionId` (string, optionnel) : ID de la collection d'images à utiliser
- `profileId` (string, optionnel) : ID du profil à utiliser

**Response** :
```json
{
  "id": "clxxx...",
  "topic": "5 tips pour mieux dormir",
  "status": "completed",
  "slides": [
    {
      "index": 1,
      "content": "Le texte de la slide",
      "imageUrl": "https://...",
      "imageHumanId": "img_xxx",
      "image": {
        "humanId": "img_xxx",
        "url": "https://...",
        "description": "Description complète de l'image",
        "keywords": "sommeil, repos, nuit",
        "mood": "calm",
        "style": "minimalist",
        "colors": "#3B82F6, #8B5CF6",
        "filename": "sleep-tips.jpg"
      }
    }
  ],
  "description": "Description avec hashtags",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Exemple avec cURL** :
```bash
curl -X POST https://your-domain.com/api/v1/carousels/generate \
  -H "X-API-Key: sk_live_votre_cle" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "3 erreurs à éviter en musculation",
    "slideCount": 7
  }'
```

### 6. Lister les carrousels

Récupère la liste de vos carrousels avec les détails complets des images.

**Endpoint** : `GET /api/v1/carousels`

**Query Parameters** :
- `limit` (number, optionnel) : Nombre de résultats (1-100, défaut: 20)
- `offset` (number, optionnel) : Pagination (défaut: 0)
- `status` (string, optionnel) : Filtrer par statut ("draft", "published", "all", défaut: "all")

**Response** :
```json
{
  "data": [
    {
      "id": "clxxx...",
      "topic": "5 tips fitness",
      "status": "created",
      "slideCount": 7,
      "description": "...",
      "slides": [
        {
          "index": 1,
          "content": "...",
          "imageUrl": "https://...",
          "imageHumanId": "img_xxx",
          "image": {
            "humanId": "img_xxx",
            "url": "https://...",
            "description": "Description de l'image",
            "keywords": "fitness, sport",
            "mood": "energetic",
            "style": "dynamic",
            "colors": "#FF5733, #3498DB",
            "filename": "fitness.jpg"
          }
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**Exemple** :
```bash
curl -X GET "https://your-domain.com/api/v1/carousels?limit=10&offset=0" \
  -H "X-API-Key: sk_live_votre_cle"
```

### 7. Obtenir un carrousel

Récupère les détails complets d'un carrousel spécifique avec les informations enrichies des images.

**Endpoint** : `GET /api/v1/carousels/:id`

**Response** :
```json
{
  "id": "clxxx...",
  "topic": "5 tips fitness",
  "status": "created",
  "slideCount": 7,
  "description": "...",
  "slides": [
    {
      "index": 1,
      "content": "...",
      "imageUrl": "https://...",
      "imageHumanId": "img_xxx",
      "image": {
        "humanId": "img_xxx",
        "url": "https://...",
        "description": "Description de l'image",
        "keywords": "fitness, sport",
        "mood": "energetic",
        "style": "dynamic",
        "colors": "#FF5733, #3498DB",
        "filename": "fitness.jpg"
      }
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Exemple** :
```bash
curl -X GET https://your-domain.com/api/v1/carousels/clxxx... \
  -H "X-API-Key: sk_live_votre_cle"
```

### 8. Modifier un carrousel

Met à jour un carrousel existant (seulement les carousels générés, pas les importés).

**Endpoint** : `PUT /api/v1/carousels/:id`

**Body** :
```json
{
  "topic": "Nouveau titre du carrousel",
  "description": "Nouvelle description",
  "status": "published",
  "slides": [
    {
      "index": 1,
      "content": "Texte modifié de la slide 1",
      "imageUrl": "https://...",
      "imageHumanId": "img_xxx"
    },
    {
      "index": 2,
      "content": "Texte modifié de la slide 2",
      "imageUrl": "https://...",
      "imageHumanId": "img_yyy"
    }
  ]
}
```

**Paramètres** :
- `topic` (string, optionnel) : Nouveau titre du carrousel (max 500 caractères)
- `description` (string, optionnel) : Nouvelle description (max 2000 caractères)
- `status` (string, optionnel) : Nouveau statut ("draft" ou "published")
- `slides` (array, optionnel) : Nouvelles slides avec index, content, imageUrl, imageHumanId

**Response** :
```json
{
  "message": "Carousel updated successfully",
  "id": "clxxx...",
  "topic": "Nouveau titre du carrousel",
  "status": "published",
  "slideCount": 7,
  "description": "Nouvelle description",
  "slides": [
    {
      "index": 1,
      "content": "Texte modifié de la slide 1",
      "imageUrl": "https://...",
      "imageHumanId": "img_xxx",
      "image": {
        "humanId": "img_xxx",
        "url": "https://...",
        "description": "Description de l'image",
        "keywords": "mots-clés",
        "mood": "calm",
        "style": "minimalist",
        "colors": "#3B82F6, #8B5CF6",
        "filename": "image.jpg"
      }
    }
  ],
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Exemple** :
```bash
curl -X PUT https://your-domain.com/api/v1/carousels/clxxx... \
  -H "X-API-Key: sk_live_votre_cle" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Nouveau titre",
    "status": "published",
    "slides": [
      {
        "index": 1,
        "content": "Nouveau texte",
        "imageUrl": "https://...",
        "imageHumanId": "img_xxx"
      }
    ]
  }'
```

**Notes** :
- Au moins un champ doit être fourni
- Tous les champs sont optionnels
- Le `publishedAt` est automatiquement défini quand le status passe à "published"
- Seulement les carousels avec `origin: "generated"` peuvent être modifiés
- La vérification ownership est appliquée

### 9. Supprimer un carrousel

Supprime un carrousel définitivement.

**Endpoint** : `DELETE /api/v1/carousels/:id`

**Response** :
```json
{
  "message": "Carousel deleted successfully"
}
```

**Exemple** :
```bash
curl -X DELETE https://your-domain.com/api/v1/carousels/clxxx... \
  -H "X-API-Key: sk_live_votre_cle"
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| 400  | Bad Request - Paramètres invalides |
| 401  | Unauthorized - Clé API invalide ou expirée |
| 403  | Forbidden - Accès refusé |
| 404  | Not Found - Ressource introuvable |
| 429  | Too Many Requests - Rate limit dépassé |
| 500  | Internal Server Error - Erreur serveur |

## Format des erreurs

```json
{
  "error": "Message d'erreur",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Exemples d'intégration

### JavaScript/TypeScript

```typescript
const API_KEY = 'sk_live_votre_cle';
const BASE_URL = 'https://your-domain.com/api/v1';

async function generateCarousel(topic: string) {
  const response = await fetch(`${BASE_URL}/carousels/generate`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic,
      slideCount: 7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Utilisation
try {
  const carousel = await generateCarousel('5 astuces productivité');
  console.log('Carrousel généré:', carousel.id);
} catch (error) {
  console.error('Erreur:', error.message);
}
```

### Python

```python
import requests

API_KEY = 'sk_live_votre_cle'
BASE_URL = 'https://your-domain.com/api/v1'

def generate_carousel(topic):
    response = requests.post(
        f'{BASE_URL}/carousels/generate',
        headers={
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json',
        },
        json={
            'topic': topic,
            'slideCount': 7,
        }
    )
    response.raise_for_status()
    return response.json()

# Utilisation
try:
    carousel = generate_carousel('5 astuces productivité')
    print(f"Carrousel généré: {carousel['id']}")
except requests.exceptions.HTTPError as e:
    print(f"Erreur: {e.response.json()['error']}")
```

## Bonnes pratiques

1. **Stockage sécurisé** : Ne jamais commit les clés API dans Git
2. **Variables d'environnement** : Utiliser `.env` pour stocker les clés
3. **Gestion des erreurs** : Toujours gérer les erreurs 429 (rate limit)
4. **Retry logic** : Implémenter un système de retry avec backoff exponentiel
5. **Rotation des clés** : Renouveler régulièrement vos clés API
6. **Environnements séparés** : Utiliser des clés différentes pour dev/prod

## Support

Pour toute question ou problème :
- Consultez la documentation dans le dashboard
- Vérifiez vos logs de requêtes dans l'onglet "CLÉ API"
- Assurez-vous que votre clé Anthropic est configurée dans les paramètres

## Changelog

### v1.2.1 (Latest)
- **Amélioration** : L'endpoint `GET /api/v1/account` retourne maintenant les métriques d'engagement (vues, likes, saves, commentaires, partages)
- **Nouveau** : Métriques totales et moyennes agrégées de tous vos posts

### v1.2.0
- **Nouveau** : Endpoint `PUT /api/v1/carousels/:id` pour modifier les carousels existants
- **Amélioration** : Support de la modification du topic, description, status et slides
- **Amélioration** : Mise à jour automatique du `publishedAt` lors du passage en "published"

### v1.1.0
- **Nouveau** : Endpoint `/api/v1/account` pour gérer le compte utilisateur
- **Nouveau** : Endpoint `/api/v1/settings` pour configurer les clés API tierces
- **Amélioration** : Les carrousels incluent maintenant les détails complets des images (description, keywords, mood, style, colors)
- **Amélioration** : Optimisation des requêtes pour les listes de carrousels

### v1.0.0 (Initial Release)
- Génération de carrousels
- Listing et récupération
- Suppression
- Rate limiting (100/jour)
- Authentification par clé API
