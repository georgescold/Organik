/**
 * Script pour créer une clé API de test
 * Usage: npx tsx scripts/create-test-api-key.ts USER_ID
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('❌ Usage: npx tsx scripts/create-test-api-key.ts USER_ID');
    console.error('\nPour obtenir votre USER_ID, connectez-vous et regardez dans l\'URL ou la base de données.');
    process.exit(1);
  }

  // Generate API key
  const randomString = randomBytes(24).toString("base64url");
  const apiKey = `sk_live_${randomString}`;
  const keyPrefix = apiKey.substring(0, 12);

  // Hash the key
  const salt = await bcrypt.genSalt(10);
  const keyHash = await bcrypt.hash(apiKey, salt);

  // Create in database
  try {
    const created = await prisma.apiKey.create({
      data: {
        userId,
        name: 'Test API Key',
        keyHash,
        keyPrefix,
        status: 'active',
        dailyLimit: 100,
      },
    });

    console.log('✅ API Key créée avec succès!\n');
    console.log('📋 Détails:');
    console.log(`   ID: ${created.id}`);
    console.log(`   Nom: ${created.name}`);
    console.log(`   Statut: ${created.status}`);
    console.log(`   Limite quotidienne: ${created.dailyLimit}`);
    console.log('\n🔑 Votre clé API:');
    console.log(`   ${apiKey}`);
    console.log('\n⚠️  Copiez cette clé maintenant, elle ne sera plus affichée!');
    console.log('\n🧪 Test rapide:');
    console.log(`   curl http://localhost:3000/api/v1/carousels \\ `);
    console.log(`     -H "X-API-Key: ${apiKey}"`);
  } catch (error: any) {
    console.error('❌ Erreur lors de la création:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
