# 🚀 Quick Start - Test de l'API REST

## Étapes Rapides (5 minutes)

### 1. Créer une clé API via l'interface

1. Ouvrez votre navigateur: http://localhost:3000/dashboard
2. Connectez-vous si ce n'est pas déjà fait
3. Cliquez sur l'onglet **"CLÉ API"** dans la barre de navigation
4. Cliquez sur **"Create New Key"**
5. Entrez un nom (ex: "Test Key")
6. Cliquez sur **"Create Key"**
7. **IMPORTANT**: Copiez la clé complète qui commence par `sk_live_...`

### 2. Tester l'API immédiatement

Remplacez `YOUR_API_KEY` par votre clé dans les commandes ci-dessous:

#### Test 1: Lister les carrousels
```bash
curl http://localhost:3000/api/v1/carousels \
  -H "X-API-Key: YOUR_API_KEY"
```

✅ **Attendu**: Status 200, liste vide `{"data":[],"pagination":{...}}`

#### Test 2: Générer un carrousel
```bash
curl -X POST http://localhost:3000/api/v1/carousels/generate \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "5 astuces pour mieux dormir",
    "slideCount": 7
  }'
```

✅ **Attendu**: Status 200, carrousel complet avec slides et images

⏱️ **Durée**: ~10-20 secondes (génération IA)

#### Test 3: Vérifier dans le dashboard

1. Retournez sur l'onglet "CLÉ API"
2. Vérifiez que le compteur "Usage" a augmenté: `2 / 100`
3. La date "Last Used" est mise à jour

## Tests Automatisés

### Avec le script bash (rapide)
```bash
./test-api-simple.sh YOUR_API_KEY
```

### Avec le script Node.js (détaillé)
```bash
node test-api.js YOUR_API_KEY
```

## Résultats Attendus

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

## Troubleshooting

### ❌ Erreur "Clé API manquante"
**Solution**: Configurez votre clé Anthropic
- Allez dans Settings (icône engrenage en haut à droite)
- Entrez votre clé API Anthropic (commence par `sk-ant-`)
- Sauvegardez

### ❌ Erreur 401 "Invalid API key"
**Solution**:
- Vérifiez que vous avez copié la clé complète
- La clé doit commencer par `sk_live_`
- Vérifiez qu'elle n'est pas révoquée dans le dashboard

### ❌ Erreur 429 "Rate limit exceeded"
**Solution**:
- Attendez 24h OU
- Supprimez et recréez une nouvelle clé API

### ❌ Pas d'images dans les slides
**Solution**:
- Ajoutez des images dans Collections
- Les images sont réutilisées, uploadez-en plusieurs

## Prochaines Étapes

1. ✅ Tester tous les endpoints
2. ✅ Vérifier le rate limiting (faire 101 requêtes)
3. ✅ Tester la révocation de clés
4. ✅ Intégrer l'API dans votre application
5. 📖 Lire API_DOCUMENTATION.md pour les détails complets

## Support

- Documentation complète: `API_DOCUMENTATION.md`
- Guide de test: `TEST_GUIDE.md`
- Résumé d'implémentation: `IMPLEMENTATION_SUMMARY.md`

🎉 **Félicitations! Votre API REST est fonctionnelle!**
