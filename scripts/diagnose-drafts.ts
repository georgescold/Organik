#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseDrafts() {
    console.log('🔍 Diagnostic des brouillons...\n');

    const drafts = await prisma.post.findMany({
        where: {
            status: 'draft'
        },
        orderBy: {
            createdAt: 'desc'
        },
        select: {
            id: true,
            hookText: true,
            slides: true,
            slideCount: true,
            description: true,
            createdAt: true,
            updatedAt: true
        }
    });

    console.log(`✅ Trouvé ${drafts.length} brouillon(s)\n`);

    if (drafts.length === 0) {
        console.log('❌ Aucun brouillon trouvé. Créez-en un d\'abord.\n');
        await prisma.$disconnect();
        return;
    }

    drafts.forEach((draft, index) => {
        console.log(`${'='.repeat(60)}`);
        console.log(`BROUILLON #${index + 1}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`ID: ${draft.id}`);
        console.log(`Hook: ${draft.hookText?.substring(0, 60)}...`);
        console.log(`\nDescription présente: ${!!draft.description}`);
        console.log(`Description longueur: ${draft.description?.length || 0} chars`);

        console.log(`\n📊 ANALYSE DES SLIDES:`);
        console.log(`  - Champ slides existe: ${draft.slides !== null && draft.slides !== undefined}`);
        console.log(`  - Type: ${typeof draft.slides}`);
        console.log(`  - Est vide: ${draft.slides === ''}`);
        console.log(`  - Est null: ${draft.slides === null}`);
        console.log(`  - Longueur: ${draft.slides?.length || 0} chars`);
        console.log(`  - Taille: ${draft.slides ? (Buffer.byteLength(draft.slides, 'utf8') / 1024).toFixed(2) : 0} KB`);
        console.log(`  - Slide count (metadata): ${draft.slideCount || 'N/A'}`);

        if (draft.slides) {
            console.log(`\n  Aperçu des premières 150 chars:`);
            console.log(`  ${draft.slides.substring(0, 150)}...`);

            try {
                const parsed = JSON.parse(draft.slides);
                console.log(`\n  ✅ JSON valide`);
                console.log(`  ✅ Est un array: ${Array.isArray(parsed)}`);
                console.log(`  ✅ Nombre de slides parsées: ${Array.isArray(parsed) ? parsed.length : 'N/A'}`);

                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`\n  📝 Première slide:`);
                    console.log(`     - Texte: ${parsed[0].text?.substring(0, 50)}...`);
                    console.log(`     - Intention: ${parsed[0].intention}`);
                    console.log(`     - Image ID: ${parsed[0].image_id || 'N/A'}`);
                    console.log(`     - Image URL présente: ${!!parsed[0].image_url}`);
                }

                // Vérifier la cohérence
                if (Array.isArray(parsed)) {
                    if (draft.slideCount && parsed.length !== draft.slideCount) {
                        console.log(`\n  ⚠️  INCOHÉRENCE: slideCount (${draft.slideCount}) ≠ parsed.length (${parsed.length})`);
                    }
                }
            } catch (e: any) {
                console.log(`\n  ❌ ERREUR DE PARSING: ${e.message}`);
                console.log(`     Données brutes:`);
                console.log(`     ${draft.slides.substring(0, 200)}`);
            }
        } else {
            console.log(`\n  ❌ PROBLÈME: Le champ slides est ${draft.slides === null ? 'NULL' : 'undefined ou vide'}`);
        }

        console.log(`\n📅 Dates:`);
        console.log(`  - Créé: ${draft.createdAt}`);
        console.log(`  - Modifié: ${draft.updatedAt}`);
        console.log('');
    });

    console.log(`${'='.repeat(60)}`);
    console.log('🎯 RÉSUMÉ');
    console.log(`${'='.repeat(60)}`);

    const withSlides = drafts.filter(d => d.slides && d.slides !== '');
    const withoutSlides = drafts.filter(d => !d.slides || d.slides === '');

    console.log(`✅ Brouillons avec slides: ${withSlides.length}`);
    console.log(`❌ Brouillons sans slides: ${withoutSlides.length}`);

    if (withoutSlides.length > 0) {
        console.log(`\n⚠️  ATTENTION: ${withoutSlides.length} brouillon(s) n'ont pas de slides!`);
        console.log(`   IDs concernés:`);
        withoutSlides.forEach(d => {
            console.log(`   - ${d.id} (${d.hookText?.substring(0, 40)}...)`);
        });
    }

    await prisma.$disconnect();
}

diagnoseDrafts().catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
});
