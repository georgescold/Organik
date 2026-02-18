# Guide de Test - API REST

## Prérequis

1. Le serveur doit être en cours d'exécution : `npm run dev`
2. Vous devez être connecté au dashboard
3. Une clé API Anthropic doit être configurée dans vos paramètres

## Étape 1 : Créer une clé API

1. Ouvrez http://localhost:3000/dashboard
2. Cliquez sur l'onglet **"CLÉ API"** en haut
3. Cliquez sur **"Create New Key"**
4. Entrez un nom (ex: "Test Key")
5. Cliquez sur **"Create Key"**
6. **IMPORTANT** : Copiez immédiatement la clé générée (format `sk_live_...`)

## Étape 2 : Tester avec le script bash

```bash
./test-api-simple.sh sk_live_VOTRE_CLE_ICI
```

## Étape 3 : Tester avec le script Node.js

```bash
node test-api.js sk_live_VOTRE_CLE_ICI
```

## Étape 4 : Tests manuels avec cURL

### Test 1 : Générer un carrousel

```bash
curl -X POST http://localhost:3000/api/v1/carousels/generate \
  -H "X-API-Key: sk_live_VOTRE_CLE" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "5 erreurs en musculation",
    "slideCount": 7
  }' | jq
```

**Résultat attendu** : Status 200, carrousel avec slides et images

### Test 2 : Lister les carrousels

```bash
curl http://localhost:3000/api/v1/carousels?limit=10 \
  -H "X-API-Key: sk_live_VOTRE_CLE" | jq
```

**Résultat attendu** : Liste de carrousels avec pagination

### Test 3 : Obtenir un carrousel spécifique

```bash
# Remplacez CAROUSEL_ID par un ID réel
curl http://localhost:3000/api/v1/carousels/CAROUSEL_ID \
  -H "X-API-Key: sk_live_VOTRE_CLE" | jq
```

**Résultat attendu** : Détails du carrousel

### Test 4 : Supprimer un carrousel

```bash
# Remplacez CAROUSEL_ID par un ID réel
curl -X DELETE http://localhost:3000/api/v1/carousels/CAROUSEL_ID \
  -H "X-API-Key: sk_live_VOTRE_CLE" | jq
```

**Résultat attendu** : Message de confirmation

### Test 5 : Authentification invalide

```bash
curl http://localhost:3000/api/v1/carousels \
  -H "X-API-Key: sk_live_invalid" | jq
```

**Résultat attendu** : Status 401, message d'erreur

### Test 6 : Rate limiting

Exécutez ce script pour tester le rate limiting (101 requêtes) :

```bash
for i in {1..101}; do
  echo "Request #$i"
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/v1/carousels/generate \
    -H "X-API-Key: sk_live_VOTRE_CLE" \
    -H "Content-Type: application/json" \
    -d "{\"topic\": \"Test $i\", \"slideCount\": 6}"

  if [ $i -eq 100 ]; then
    echo "--- Limite atteinte, prochaine devrait être 429 ---"
  fi
done
```

**Résultat attendu** :
- Requêtes 1-100 : Status 200
- Requête 101+ : Status 429

## Vérifications dans le Dashboard

Après les tests, vérifiez dans l'onglet "CLÉ API" :

1. ✅ Le compteur de requêtes a augmenté
2. ✅ La date "Last Used" est mise à jour
3. ✅ L'usage affiche "X / 100"

## Résolution des Problèmes

### Erreur 401 "Invalid or expired API key"
- Vérifiez que vous avez copié la clé complète
- Assurez-vous que la clé commence par `sk_live_`
- Vérifiez que la clé n'a pas été révoquée dans le dashboard

### Erreur 400 "Clé API manquante"
- Assurez-vous d'avoir configuré votre clé Anthropic dans les paramètres
- Allez dans Settings → Clé API Anthropic

### Erreur 429 "Rate limit exceeded"
- Attendez 24h ou supprimez et recréez votre clé
- Vérifiez la date de reset dans la réponse

### La génération ne retourne pas d'images
- Vérifiez que vous avez des images dans votre bibliothèque
- Vérifiez que les images ne sont pas toutes utilisées récemment

## Tests Automatisés Complets

Pour un test complet automatisé, lancez :

```bash
# Avec bash
./test-api-simple.sh sk_live_VOTRE_CLE

# Avec Node.js
node test-api.js sk_live_VOTRE_CLE
```

Ces scripts testent :
1. ✅ Génération de carrousel
2. ✅ Listing avec pagination
3. ✅ Récupération d'un carrousel
4. ✅ Suppression d'un carrousel
5. ✅ Validation de l'authentification

## Résultats Attendus

Tous les tests devraient afficher ✅ :

```
🚀 Testing API with key: sk_live_abc123...

1️⃣  Testing POST /carousels/generate
✅ Generate: SUCCESS (200)
   Carousel ID: clxxx...

2️⃣  Testing GET /carousels
✅ List: SUCCESS (200)

3️⃣  Testing GET /carousels/:id
✅ Get Single: SUCCESS (200)

4️⃣  Testing DELETE /carousels/:id
✅ Delete: SUCCESS (200)

5️⃣  Testing Invalid Authentication
✅ Auth Validation: SUCCESS (401)

🎉 All tests completed!
```
