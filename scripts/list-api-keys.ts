/**
 * Script pour lister les clés API existantes
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        status: true,
        dailyLimit: true,
        userId: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (apiKeys.length === 0) {
      console.log('❌ Aucune clé API trouvée.');
      console.log('\n💡 Créez-en une avec:');
      console.log('   npx tsx scripts/create-test-api-key.ts USER_ID');

      // Essayer de trouver un user
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true },
        take: 5,
      });

      if (users.length > 0) {
        console.log('\n👤 Utilisateurs disponibles:');
        users.forEach(u => {
          console.log(`   - ${u.id} (${u.email || u.name || 'Sans nom'})`);
        });
      }
    } else {
      console.log(`✅ ${apiKeys.length} clé(s) API trouvée(s):\n`);
      apiKeys.forEach((key, idx) => {
        console.log(`${idx + 1}. ${key.name}`);
        console.log(`   ID: ${key.id}`);
        console.log(`   Préfixe: ${key.keyPrefix}...`);
        console.log(`   Statut: ${key.status}`);
        console.log(`   Limite: ${key.dailyLimit}/jour`);
        console.log(`   User ID: ${key.userId}`);
        console.log(`   Créée: ${key.createdAt.toLocaleString('fr-FR')}`);
        console.log(`   Dernière utilisation: ${key.lastUsedAt ? key.lastUsedAt.toLocaleString('fr-FR') : 'Jamais'}`);
        console.log('');
      });
    }
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
