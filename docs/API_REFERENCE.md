# 📘 API Reference - Revolution Carousel Generator

## Table des Matières

1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Rate Limiting](#rate-limiting)
4. [Endpoints](#endpoints)
   - [Générer un Carrousel](#post-carouselsgenerate)
   - [Lister les Carrousels](#get-carousels)
   - [Obtenir un Carrousel](#get-carouselsid)
   - [Modifier un Carrousel](#put-carouselsid)
   - [Supprimer un Carrousel](#delete-carouselsid)
5. [Codes d'Erreur](#codes-derreur)
6. [Exemples d'Intégration](#exemples-dintégration)
7. [Webhooks](#webhooks-à-venir)

---

## Introduction

L'API Revolution vous permet de générer des carrousels Instagram/TikTok via des requêtes HTTP simples. L'API utilise Claude Opus pour créer du contenu viral optimisé avec des images automatiquement associées depuis votre bibliothèque.

### Base URL

```
Production: https://votre-domaine.com/api/v1
Development: http://localhost:3000/api/v1
```

### Format des Données

- **Content-Type**: `application/json`
- **Encoding**: UTF-8
- **Format de Date**: ISO 8601 (`2024-01-15T10:30:00.000Z`)

---

## Authentification

Toutes les requêtes nécessitent une clé API envoyée via le header HTTP `X-API-Key`.

### Obtenir une Clé API

1. Connectez-vous à votre dashboard
2. Naviguez vers l'onglet **"CLÉ API"**
3. Cliquez sur **"Create New Key"**
4. Donnez un nom descriptif à votre clé
5. Copiez la clé générée (format: `sk_live_xxxxx`)

⚠️ **Important**: La clé n'est affichée qu'une seule fois. Stockez-la en sécurité.

### Utilisation

Incluez votre clé API dans chaque requête:

```http
GET /api/v1/carousels
Host: votre-domaine.com
X-API-Key: sk_live_votre_cle_ici
```

### Sécurité

- ✅ Les clés sont hashées avec bcrypt (10 rounds)
- ✅ Jamais stockées en clair dans la base de données
- ✅ Peuvent être révoquées instantanément
- ✅ Support optionnel d'expiration

---

## Rate Limiting

### Limites par Défaut

| Type de Compte | Requêtes/Jour | Reset |
|----------------|---------------|-------|
| Standard       | 100           | 24h   |
| Premium        | 1000          | 24h   |
| Enterprise     | Illimité      | -     |

### Headers de Réponse

Chaque réponse inclut des informations sur votre utilisation:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-16T10:30:00.000Z
```

### Dépassement de Limite

Si vous dépassez votre limite, l'API retourne:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 100,
  "resetAt": "2024-01-16T10:30:00.000Z"
}
```

**Status Code**: `429 Too Many Requests`

---

## Endpoints

### POST /carousels/generate

Génère un nouveau carrousel avec des slides et des images automatiquement associées.

#### Request

```http
POST /api/v1/carousels/generate
Content-Type: application/json
X-API-Key: sk_live_votre_cle
```

```json
{
  "topic": "5 erreurs à éviter en musculation",
  "slideCount": 7,
  "collectionId": "clxxx123",
  "profileId": "clyyy456"
}
```

#### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `topic` | string | ✅ Oui | Sujet du carrousel (1-500 caractères) |
| `slideCount` | number | ❌ Non | Nombre de slides (5-10, défaut: 7) |
| `collectionId` | string | ❌ Non | ID de la collection d'images à utiliser |
| `profileId` | string | ❌ Non | ID du profil pour personnalisation |

#### Response Success

**Status**: `200 OK`

```json
{
  "id": "clxxx789",
  "topic": "5 erreurs à éviter en musculation",
  "status": "completed",
  "slides": [
    {
      "index": 1,
      "content": "Erreur #1: Ne pas s'échauffer",
      "imageUrl": "https://storage.supabase.co/...",
      "imageHumanId": "img_abc123"
    },
    {
      "index": 2,
      "content": "Erreur #2: Mauvaise technique",
      "imageUrl": "https://storage.supabase.co/...",
      "imageHumanId": "img_def456"
    }
    // ... 5 autres slides
  ],
  "description": "🏋️ Les 5 erreurs qui bloquent ta progression...\n\n#musculation #fitness #motivation",
  "warning": null,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Response Error

```json
{
  "error": "Clé API Anthropic manquante. Configurez-la dans les paramètres.",
  "code": "BAD_REQUEST"
}
```

**Status**: `400 Bad Request`

#### Exemple cURL

```bash
curl -X POST https://api.revolution.com/v1/carousels/generate \
  -H "X-API-Key: sk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "10 astuces pour la productivité",
    "slideCount": 8
  }'
```

#### Notes

- ⏱️ **Durée**: 10-30 secondes selon la complexité
- 🎨 **Images**: Sélectionnées automatiquement depuis votre bibliothèque
- 🧠 **IA**: Utilise Claude Opus 4.5 pour la génération
- 📊 **Analytics**: Les slides sont analysées pour optimisation

---

### GET /carousels

Récupère la liste de vos carrousels avec pagination.

#### Request

```http
GET /api/v1/carousels?limit=20&offset=0&status=all
X-API-Key: sk_live_votre_cle
```

#### Paramètres de Query

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `limit` | number | 20 | Nombre de résultats (1-100) |
| `offset` | number | 0 | Position de départ (pagination) |
| `status` | string | all | Filtrer par statut: `draft`, `published`, `all` |

#### Response

**Status**: `200 OK`

```json
{
  "data": [
    {
      "id": "clxxx789",
      "topic": "5 erreurs en musculation",
      "status": "created",
      "slideCount": 7,
      "description": "🏋️ Les 5 erreurs...",
      "slides": [...],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
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

#### Exemple cURL

```bash
curl "https://api.revolution.com/v1/carousels?limit=10&status=published" \
  -H "X-API-Key: sk_live_abc123..."
```

#### Notes

- 📄 **Pagination**: Utilisez `offset` et `limit` pour naviguer
- 🔍 **Filtrage**: Filtrez par statut pour organiser vos carrousels
- ⚡ **Performance**: Les slides sont incluses dans la réponse

---

### GET /carousels/:id

Récupère les détails complets d'un carrousel spécifique.

#### Request

```http
GET /api/v1/carousels/clxxx789
X-API-Key: sk_live_votre_cle
```

#### Response Success

**Status**: `200 OK`

```json
{
  "id": "clxxx789",
  "topic": "5 erreurs en musculation",
  "status": "created",
  "slideCount": 7,
  "description": "🏋️ Les 5 erreurs qui bloquent ta progression...",
  "slides": [
    {
      "index": 1,
      "content": "Erreur #1: Ne pas s'échauffer",
      "imageUrl": "https://storage.supabase.co/...",
      "imageHumanId": "img_abc123"
    }
    // ... autres slides
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

#### Response Error

**Status**: `404 Not Found`

```json
{
  "error": "Carousel not found",
  "code": "NOT_FOUND"
}
```

**Status**: `403 Forbidden`

```json
{
  "error": "You don't have access to this carousel",
  "code": "FORBIDDEN"
}
```

#### Exemple cURL

```bash
curl https://api.revolution.com/v1/carousels/clxxx789 \
  -H "X-API-Key: sk_live_abc123..."
```

---

### PUT /carousels/:id

Met à jour un carrousel existant.

#### Request

```http
PUT /api/v1/carousels/clxxx789
Content-Type: application/json
X-API-Key: sk_live_votre_cle
```

```json
{
  "topic": "Nouveau titre du carrousel",
  "description": "Nouvelle description avec hashtags",
  "status": "published",
  "slides": [
    {
      "index": 1,
      "content": "Texte modifié de la slide 1",
      "imageUrl": "https://storage.supabase.co/...",
      "imageHumanId": "img_abc123"
    },
    {
      "index": 2,
      "content": "Texte modifié de la slide 2",
      "imageUrl": "https://storage.supabase.co/...",
      "imageHumanId": "img_def456"
    }
  ]
}
```

#### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `topic` | string | ❌ Non | Nouveau titre (1-500 caractères) |
| `description` | string | ❌ Non | Nouvelle description (max 2000 caractères) |
| `status` | string | ❌ Non | Nouveau statut: `draft` ou `published` |
| `slides` | array | ❌ Non | Nouvelles slides avec index, content, imageUrl, imageHumanId |

#### Response Success

**Status**: `200 OK`

```json
{
  "message": "Carousel updated successfully",
  "id": "clxxx789",
  "topic": "Nouveau titre du carrousel",
  "status": "published",
  "slideCount": 7,
  "description": "Nouvelle description avec hashtags",
  "slides": [
    {
      "index": 1,
      "content": "Texte modifié de la slide 1",
      "imageUrl": "https://storage.supabase.co/...",
      "imageHumanId": "img_abc123",
      "image": {
        "humanId": "img_abc123",
        "url": "https://storage.supabase.co/...",
        "description": "Description de l'image",
        "keywords": "fitness, sport, motivation",
        "mood": "energetic",
        "style": "dynamic",
        "colors": "#FF5733, #3498DB",
        "filename": "fitness.jpg"
      }
    }
  ],
  "updatedAt": "2024-01-15T10:45:00.000Z"
}
```

#### Response Error

**Status**: `400 Bad Request`

```json
{
  "error": "At least one field must be provided",
  "code": "BAD_REQUEST"
}
```

```json
{
  "error": "Can only update generated carousels",
  "code": "BAD_REQUEST"
}
```

**Status**: `404 Not Found`

```json
{
  "error": "Carousel not found",
  "code": "NOT_FOUND"
}
```

**Status**: `403 Forbidden`

```json
{
  "error": "You don't have access to this carousel",
  "code": "FORBIDDEN"
}
```

#### Exemple cURL

```bash
curl -X PUT https://api.revolution.com/v1/carousels/clxxx789 \
  -H "X-API-Key: sk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "5 erreurs à éviter en musculation (édité)",
    "status": "published",
    "slides": [
      {
        "index": 1,
        "content": "Erreur #1: Ne jamais s'\''échauffer correctement",
        "imageUrl": "https://storage.supabase.co/...",
        "imageHumanId": "img_abc123"
      }
    ]
  }'
```

#### Notes

- ✏️ **Modification flexible**: Tous les champs sont optionnels, modifiez seulement ce dont vous avez besoin
- 🔒 **Ownership**: Vous ne pouvez modifier que vos propres carrousels
- 📅 **Auto-timestamp**: Le champ `publishedAt` est automatiquement défini lors du passage au statut "published"
- 🎯 **Carrousels générés uniquement**: Seuls les carrousels avec `origin: "generated"` peuvent être modifiés (pas les importés)
- ✅ **Validation**: Les données sont validées avec Zod avant mise à jour

---

### DELETE /carousels/:id

Supprime définitivement un carrousel.

#### Request

```http
DELETE /api/v1/carousels/clxxx789
X-API-Key: sk_live_votre_cle
```

#### Response Success

**Status**: `200 OK`

```json
{
  "message": "Carousel deleted successfully"
}
```

#### Response Error

**Status**: `404 Not Found`

```json
{
  "error": "Carousel not found",
  "code": "NOT_FOUND"
}
```

**Status**: `403 Forbidden`

```json
{
  "error": "You don't have access to this carousel",
  "code": "FORBIDDEN"
}
```

#### Exemple cURL

```bash
curl -X DELETE https://api.revolution.com/v1/carousels/clxxx789 \
  -H "X-API-Key: sk_live_abc123..."
```

#### Notes

- ⚠️ **Irréversible**: La suppression est définitive
- 🔒 **Ownership**: Vous ne pouvez supprimer que vos propres carrousels
- 📊 **Metrics**: Les statistiques associées sont également supprimées

---

## Codes d'Erreur

### Codes HTTP Standards

| Code | Nom | Description |
|------|-----|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée avec succès |
| 400 | Bad Request | Paramètres invalides ou manquants |
| 401 | Unauthorized | Clé API invalide ou manquante |
| 403 | Forbidden | Accès refusé à la ressource |
| 404 | Not Found | Ressource introuvable |
| 429 | Too Many Requests | Rate limit dépassé |
| 500 | Internal Server Error | Erreur serveur |

### Format des Erreurs

Toutes les erreurs suivent ce format:

```json
{
  "error": "Message d'erreur lisible",
  "code": "ERROR_CODE",
  "details": {
    // Informations supplémentaires si applicable
  }
}
```

### Codes d'Erreur Personnalisés

| Code | Description | Action Recommandée |
|------|-------------|-------------------|
| `UNAUTHORIZED` | Clé API invalide | Vérifiez votre clé |
| `RATE_LIMIT_EXCEEDED` | Quota dépassé | Attendez le reset ou upgradez |
| `VALIDATION_ERROR` | Données invalides | Vérifiez les paramètres |
| `NOT_FOUND` | Ressource introuvable | Vérifiez l'ID |
| `FORBIDDEN` | Accès refusé | Vérifiez vos permissions |
| `INTERNAL_ERROR` | Erreur serveur | Contactez le support |

### Exemples d'Erreurs

#### Validation Error

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": ["topic"],
      "message": "Topic is required"
    },
    {
      "path": ["slideCount"],
      "message": "Number must be between 5 and 10"
    }
  ]
}
```

#### Rate Limit Error

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 100,
  "resetAt": "2024-01-16T10:30:00.000Z"
}
```

---

## Exemples d'Intégration

### JavaScript / TypeScript

#### Installation

```bash
npm install node-fetch
# ou
npm install axios
```

#### Exemple avec Fetch

```typescript
const API_KEY = 'sk_live_votre_cle';
const BASE_URL = 'https://api.revolution.com/v1';

interface GenerateCarouselRequest {
  topic: string;
  slideCount?: number;
  collectionId?: string;
}

interface Slide {
  index: number;
  content: string;
  imageUrl?: string;
  imageHumanId?: string;
}

interface Carousel {
  id: string;
  topic: string;
  status: string;
  slides: Slide[];
  description: string;
  createdAt: string;
}

async function generateCarousel(
  request: GenerateCarouselRequest
): Promise<Carousel> {
  const response = await fetch(`${BASE_URL}/carousels/generate`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

async function updateCarousel(
  id: string,
  updates: {
    topic?: string;
    description?: string;
    status?: 'draft' | 'published';
    slides?: Slide[];
  }
): Promise<Carousel> {
  const response = await fetch(`${BASE_URL}/carousels/${id}`, {
    method: 'PUT',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// Utilisation
async function main() {
  try {
    // Générer un carrousel
    const carousel = await generateCarousel({
      topic: '7 astuces pour la productivité',
      slideCount: 7,
    });

    console.log('✅ Carrousel généré:', carousel.id);
    console.log(`📊 ${carousel.slides.length} slides créées`);

    // Modifier le carrousel
    const updated = await updateCarousel(carousel.id, {
      topic: '7 astuces pour la productivité (Édition 2024)',
      status: 'published',
    });

    console.log('✏️ Carrousel mis à jour:', updated.id);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}
```

#### Exemple avec Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.revolution.com/v1',
  headers: {
    'X-API-Key': 'sk_live_votre_cle',
  },
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 429) {
      const resetAt = error.response.data.resetAt;
      console.log(`Rate limit atteint. Reset à: ${resetAt}`);
    }
    return Promise.reject(error);
  }
);

// Utilisation
async function generateCarousel(topic: string) {
  const { data } = await api.post('/carousels/generate', {
    topic,
    slideCount: 7,
  });
  return data;
}
```

### Python

#### Installation

```bash
pip install requests
```

#### Exemple Complet

```python
import requests
from typing import Optional, Dict, List
from datetime import datetime

class RevolutionAPI:
    def __init__(self, api_key: str, base_url: str = "https://api.revolution.com/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        })

    def generate_carousel(
        self,
        topic: str,
        slide_count: int = 7,
        collection_id: Optional[str] = None
    ) -> Dict:
        """Génère un nouveau carrousel"""
        payload = {
            'topic': topic,
            'slideCount': slide_count
        }
        if collection_id:
            payload['collectionId'] = collection_id

        response = self.session.post(
            f'{self.base_url}/carousels/generate',
            json=payload
        )
        response.raise_for_status()
        return response.json()

    def list_carousels(
        self,
        limit: int = 20,
        offset: int = 0,
        status: str = 'all'
    ) -> Dict:
        """Liste les carrousels avec pagination"""
        params = {
            'limit': limit,
            'offset': offset,
            'status': status
        }
        response = self.session.get(
            f'{self.base_url}/carousels',
            params=params
        )
        response.raise_for_status()
        return response.json()

    def get_carousel(self, carousel_id: str) -> Dict:
        """Récupère un carrousel spécifique"""
        response = self.session.get(
            f'{self.base_url}/carousels/{carousel_id}'
        )
        response.raise_for_status()
        return response.json()

    def update_carousel(
        self,
        carousel_id: str,
        topic: Optional[str] = None,
        description: Optional[str] = None,
        status: Optional[str] = None,
        slides: Optional[List[Dict]] = None
    ) -> Dict:
        """Met à jour un carrousel"""
        payload = {}
        if topic:
            payload['topic'] = topic
        if description:
            payload['description'] = description
        if status:
            payload['status'] = status
        if slides:
            payload['slides'] = slides

        response = self.session.put(
            f'{self.base_url}/carousels/{carousel_id}',
            json=payload
        )
        response.raise_for_status()
        return response.json()

    def delete_carousel(self, carousel_id: str) -> Dict:
        """Supprime un carrousel"""
        response = self.session.delete(
            f'{self.base_url}/carousels/{carousel_id}'
        )
        response.raise_for_status()
        return response.json()

# Utilisation
if __name__ == '__main__':
    api = RevolutionAPI('sk_live_votre_cle')

    try:
        # Générer un carrousel
        carousel = api.generate_carousel(
            topic='10 astuces pour apprendre plus vite',
            slide_count=8
        )
        print(f"✅ Carrousel généré: {carousel['id']}")

        # Modifier le carrousel
        updated = api.update_carousel(
            carousel_id=carousel['id'],
            topic='10 astuces pour apprendre plus vite (Édition 2024)',
            status='published'
        )
        print(f"✏️ Carrousel mis à jour: {updated['id']}")

        # Lister les carrousels
        carousels = api.list_carousels(limit=10)
        print(f"📋 Total: {carousels['pagination']['total']}")

        # Supprimer un carrousel
        api.delete_carousel(carousel['id'])
        print("🗑️ Carrousel supprimé")

    except requests.exceptions.HTTPError as e:
        print(f"❌ Erreur HTTP: {e.response.status_code}")
        print(e.response.json())
```

### PHP

```php
<?php

class RevolutionAPI {
    private $apiKey;
    private $baseUrl;

    public function __construct($apiKey, $baseUrl = 'https://api.revolution.com/v1') {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }

    private function request($method, $endpoint, $data = null) {
        $url = $this->baseUrl . $endpoint;

        $options = [
            'http' => [
                'method' => $method,
                'header' => [
                    'X-API-Key: ' . $this->apiKey,
                    'Content-Type: application/json'
                ]
            ]
        ];

        if ($data) {
            $options['http']['content'] = json_encode($data);
        }

        $context = stream_context_create($options);
        $result = file_get_contents($url, false, $context);

        return json_decode($result, true);
    }

    public function generateCarousel($topic, $slideCount = 7, $collectionId = null) {
        $data = [
            'topic' => $topic,
            'slideCount' => $slideCount
        ];

        if ($collectionId) {
            $data['collectionId'] = $collectionId;
        }

        return $this->request('POST', '/carousels/generate', $data);
    }

    public function listCarousels($limit = 20, $offset = 0) {
        $query = http_build_query([
            'limit' => $limit,
            'offset' => $offset
        ]);
        return $this->request('GET', '/carousels?' . $query);
    }
}

// Utilisation
$api = new RevolutionAPI('sk_live_votre_cle');

try {
    $carousel = $api->generateCarousel('5 tips fitness', 7);
    echo "✅ Carrousel généré: " . $carousel['id'] . "\n";
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
}
```

### Ruby

```ruby
require 'net/http'
require 'json'
require 'uri'

class RevolutionAPI
  def initialize(api_key, base_url = 'https://api.revolution.com/v1')
    @api_key = api_key
    @base_url = base_url
  end

  def generate_carousel(topic:, slide_count: 7, collection_id: nil)
    data = {
      topic: topic,
      slideCount: slide_count
    }
    data[:collectionId] = collection_id if collection_id

    request(:post, '/carousels/generate', data)
  end

  def list_carousels(limit: 20, offset: 0, status: 'all')
    query = URI.encode_www_form(limit: limit, offset: offset, status: status)
    request(:get, "/carousels?#{query}")
  end

  private

  def request(method, endpoint, data = nil)
    uri = URI("#{@base_url}#{endpoint}")

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = case method
              when :get
                Net::HTTP::Get.new(uri)
              when :post
                Net::HTTP::Post.new(uri)
              when :delete
                Net::HTTP::Delete.new(uri)
              end

    request['X-API-Key'] = @api_key
    request['Content-Type'] = 'application/json'
    request.body = data.to_json if data

    response = http.request(request)
    JSON.parse(response.body)
  end
end

# Utilisation
api = RevolutionAPI.new('sk_live_votre_cle')

begin
  carousel = api.generate_carousel(
    topic: '7 astuces productivité',
    slide_count: 7
  )
  puts "✅ Carrousel généré: #{carousel['id']}"
rescue => e
  puts "❌ Erreur: #{e.message}"
end
```

---

## Webhooks (À venir)

Les webhooks vous permettront de recevoir des notifications en temps réel lors d'événements.

### Événements Disponibles

- `carousel.generated` - Un carrousel a été généré
- `carousel.failed` - La génération a échoué
- `carousel.deleted` - Un carrousel a été supprimé
- `ratelimit.exceeded` - Limite de requêtes atteinte

### Configuration

```json
{
  "url": "https://votre-app.com/webhooks/revolution",
  "events": ["carousel.generated", "carousel.failed"],
  "secret": "whsec_xxxxx"
}
```

### Payload Exemple

```json
{
  "event": "carousel.generated",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "carouselId": "clxxx789",
    "topic": "5 tips fitness",
    "slideCount": 7
  }
}
```

---

## Bonnes Pratiques

### Sécurité

1. **Ne jamais exposer vos clés** dans le code client (frontend)
2. **Utiliser des variables d'environnement** pour stocker les clés
3. **Renouveler régulièrement** vos clés API
4. **Révoquer immédiatement** les clés compromises
5. **Utiliser HTTPS** en production obligatoirement

### Performance

1. **Implémenter un cache** pour les requêtes fréquentes
2. **Utiliser la pagination** pour les listes longues
3. **Gérer les timeouts** (génération peut prendre 30s)
4. **Retry avec backoff exponentiel** en cas d'erreur temporaire

### Gestion des Erreurs

```typescript
async function generateWithRetry(topic: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateCarousel({ topic });
    } catch (error) {
      if (error.status === 429) {
        // Rate limit - attendre le reset
        const resetAt = new Date(error.resetAt);
        const waitMs = resetAt.getTime() - Date.now();
        await sleep(waitMs);
        continue;
      }

      if (error.status >= 500) {
        // Erreur serveur - retry avec backoff
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }

      // Autres erreurs - ne pas retry
      throw error;
    }
  }
}
```

---

## Support

### Ressources

- 📖 **Documentation**: Cette page
- 💬 **Support**: support@revolution.com
- 🐛 **Bugs**: https://github.com/revolution/issues
- 💡 **Feature Requests**: https://revolution.canny.io

### Status API

Vérifiez le status de l'API en temps réel:
- https://status.revolution.com

### Changelog

Suivez les mises à jour de l'API:
- https://revolution.com/changelog

---

**Version**: 1.2.0
**Dernière mise à jour**: Février 2024
**Maintenu par**: Revolution Team

### Changelog

#### v1.2.0 (Février 2024)
- ✨ **Nouveau**: Endpoint `PUT /api/v1/carousels/:id` pour modifier les carousels
- 🎯 Support de la modification du topic, description, status et slides
- 📅 Mise à jour automatique du `publishedAt` lors du passage en "published"

#### v1.1.0
- Endpoint `/api/v1/account` pour gérer le compte
- Endpoint `/api/v1/settings` pour les clés API tierces
- Images enrichies avec métadonnées complètes

#### v1.0.0 (Initial)
- Génération, listing, récupération et suppression de carousels
- Authentification par clé API
- Rate limiting
