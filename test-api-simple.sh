#!/bin/bash

# Simple bash test script for API
# Usage: ./test-api-simple.sh YOUR_API_KEY

if [ -z "$1" ]; then
  echo "❌ Usage: ./test-api-simple.sh YOUR_API_KEY"
  exit 1
fi

API_KEY=$1
BASE_URL="http://localhost:3000/api/v1"

echo "🚀 Testing API with key: ${API_KEY:0:15}..."
echo ""

# Test 1: Generate Carousel
echo "1️⃣  Testing POST /carousels/generate"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/carousels/generate" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic": "3 tips fitness", "slideCount": 6}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ Generate: SUCCESS (200)"
  CAROUSEL_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   Carousel ID: $CAROUSEL_ID"
else
  echo "❌ Generate: FAILED ($HTTP_CODE)"
  echo "$BODY" | head -c 200
  exit 1
fi

echo ""

# Test 2: List Carousels
echo "2️⃣  Testing GET /carousels"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/carousels?limit=5" \
  -H "X-API-Key: $API_KEY")

if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ List: SUCCESS (200)"
else
  echo "❌ List: FAILED ($HTTP_CODE)"
fi

echo ""

# Test 3: Get Single
echo "3️⃣  Testing GET /carousels/:id"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/carousels/$CAROUSEL_ID" \
  -H "X-API-Key: $API_KEY")

if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ Get Single: SUCCESS (200)"
else
  echo "❌ Get Single: FAILED ($HTTP_CODE)"
fi

echo ""

# Test 4: Delete
echo "4️⃣  Testing DELETE /carousels/:id"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/carousels/$CAROUSEL_ID" \
  -H "X-API-Key: $API_KEY")

if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ Delete: SUCCESS (200)"
else
  echo "❌ Delete: FAILED ($HTTP_CODE)"
fi

echo ""

# Test 5: Invalid Auth
echo "5️⃣  Testing Invalid Authentication"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/carousels" \
  -H "X-API-Key: sk_live_invalid")

if [ "$HTTP_CODE" == "401" ]; then
  echo "✅ Auth Validation: SUCCESS (401)"
else
  echo "❌ Auth Validation: FAILED (expected 401, got $HTTP_CODE)"
fi

echo ""
echo "🎉 All tests completed!"
