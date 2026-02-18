/**
 * Script de test pour l'API REST
 * Usage: node test-api.js YOUR_API_KEY
 */

const API_KEY = process.argv[2];
const BASE_URL = 'http://localhost:3000/api/v1';

if (!API_KEY) {
  console.error('❌ Usage: node test-api.js YOUR_API_KEY');
  process.exit(1);
}

async function testAPI() {
  console.log('🚀 Starting API Tests...\n');

  // Test 1: Generate Carousel
  console.log('1️⃣  Testing POST /api/v1/carousels/generate');
  try {
    const generateRes = await fetch(`${BASE_URL}/carousels/generate`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: '5 erreurs à éviter en musculation',
        slideCount: 7,
      }),
    });

    if (!generateRes.ok) {
      const error = await generateRes.json();
      console.error('❌ Generate failed:', error);
      return;
    }

    const carousel = await generateRes.json();
    console.log('✅ Carousel generated successfully!');
    console.log(`   ID: ${carousel.id}`);
    console.log(`   Slides: ${carousel.slides?.length || 0}`);
    console.log(`   Status: ${carousel.status}`);

    const carouselId = carousel.id;

    // Test 2: List Carousels
    console.log('\n2️⃣  Testing GET /api/v1/carousels');
    const listRes = await fetch(`${BASE_URL}/carousels?limit=5`, {
      headers: { 'X-API-Key': API_KEY },
    });

    if (!listRes.ok) {
      const error = await listRes.json();
      console.error('❌ List failed:', error);
      return;
    }

    const list = await listRes.json();
    console.log('✅ List retrieved successfully!');
    console.log(`   Total: ${list.pagination?.total || 0}`);
    console.log(`   Returned: ${list.data?.length || 0}`);

    // Test 3: Get Single Carousel
    console.log('\n3️⃣  Testing GET /api/v1/carousels/:id');
    const getRes = await fetch(`${BASE_URL}/carousels/${carouselId}`, {
      headers: { 'X-API-Key': API_KEY },
    });

    if (!getRes.ok) {
      const error = await getRes.json();
      console.error('❌ Get failed:', error);
      return;
    }

    const single = await getRes.json();
    console.log('✅ Carousel retrieved successfully!');
    console.log(`   ID: ${single.id}`);
    console.log(`   Topic: ${single.topic}`);

    // Test 4: Delete Carousel
    console.log('\n4️⃣  Testing DELETE /api/v1/carousels/:id');
    const deleteRes = await fetch(`${BASE_URL}/carousels/${carouselId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': API_KEY },
    });

    if (!deleteRes.ok) {
      const error = await deleteRes.json();
      console.error('❌ Delete failed:', error);
      return;
    }

    const deleteResult = await deleteRes.json();
    console.log('✅ Carousel deleted successfully!');
    console.log(`   Message: ${deleteResult.message}`);

    // Test 5: Invalid Authentication
    console.log('\n5️⃣  Testing Invalid Authentication');
    const invalidRes = await fetch(`${BASE_URL}/carousels`, {
      headers: { 'X-API-Key': 'sk_live_invalid' },
    });

    if (invalidRes.status === 401) {
      console.log('✅ Authentication validation working!');
      console.log(`   Status: 401 Unauthorized`);
    } else {
      console.error('❌ Authentication should have failed');
    }

    console.log('\n🎉 All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testAPI();
