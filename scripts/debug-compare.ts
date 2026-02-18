
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compareWithCompetitors(userId: string) {
    console.log(`Analyzing for User ID: ${userId}`);
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profiles: {
                    where: { platform: 'tiktok' },
                    take: 1,
                    include: {
                        contentAnalyses: true
                    }
                },
            },
        });

        const profile = user?.profiles[0];
        if (!profile) {
            console.log('No profile found (logic returned null)');
            return null;
        }
        console.log(`Using Profile ID: ${profile.id}`);

        const userAnalyses = await prisma.contentAnalysis.findMany({
            where: { profileId: profile.id },
        });
        console.log(`User Analyses: ${userAnalyses.length}`);

        const competitors = await prisma.competitor.findMany({
            where: { profileId: profile.id, isActive: true },
            select: { id: true },
        });

        const competitorIds = competitors.map(c => c.id);
        console.log(`Competitor IDs: ${competitorIds}`);

        const competitorAnalyses = await prisma.competitorAnalysis.findMany({
            where: { competitorId: { in: competitorIds } },
        });
        console.log(`Competitor Analyses: ${competitorAnalyses.length}`);

        if (userAnalyses.length === 0 || competitorAnalyses.length === 0) {
            console.log('One of the arrays is empty, returning null');
            return null;
        }

        // Calculate averages
        try {
            const avgUser = {
                qualityScore: userAnalyses.reduce((a, b) => a + b.qualityScore, 0) / userAnalyses.length,
                performanceScore: userAnalyses.reduce((a, b) => a + b.performanceScore, 0) / userAnalyses.length,
                intelligentScore: userAnalyses.reduce((a, b) => a + b.intelligentScore, 0) / userAnalyses.length,
                hookScore: userAnalyses.reduce((a, b) => a + b.qsHookTotal, 0) / userAnalyses.length,
                bodyScore: userAnalyses.reduce((a, b) => a + b.qsBodyTotal, 0) / userAnalyses.length,
                ctaScore: userAnalyses.reduce((a, b) => a + b.qsCtaTotal, 0) / userAnalyses.length,
                visualScore: userAnalyses.reduce((a, b) => a + b.qsVisualTotal, 0) / userAnalyses.length,
                musicScore: userAnalyses.reduce((a, b) => a + b.qsMusicTotal, 0) / userAnalyses.length,
                timingScore: userAnalyses.reduce((a, b) => a + b.qsTimingTotal, 0) / userAnalyses.length,
                personaScore: userAnalyses.reduce((a, b) => a + b.qsPersonaTotal, 0) / userAnalyses.length,
                analyzedCount: userAnalyses.length,
            };
            console.log('Avg User Calculated:', avgUser);

            const avgComp = {
                qualityScore: competitorAnalyses.reduce((a, b) => a + b.qualityScore, 0) / competitorAnalyses.length,
                performanceScore: competitorAnalyses.reduce((a, b) => a + b.performanceScore, 0) / competitorAnalyses.length,
                intelligentScore: competitorAnalyses.reduce((a, b) => a + b.intelligentScore, 0) / competitorAnalyses.length,
                hookScore: competitorAnalyses.reduce((a, b) => a + b.qsHookTotal, 0) / competitorAnalyses.length,
                bodyScore: competitorAnalyses.reduce((a, b) => a + b.qsBodyTotal, 0) / competitorAnalyses.length,
                ctaScore: competitorAnalyses.reduce((a, b) => a + b.qsCtaTotal, 0) / competitorAnalyses.length,
                visualScore: competitorAnalyses.reduce((a, b) => a + b.qsVisualTotal, 0) / competitorAnalyses.length,
                musicScore: competitorAnalyses.reduce((a, b) => a + b.qsMusicTotal, 0) / competitorAnalyses.length,
                timingScore: competitorAnalyses.reduce((a, b) => a + b.qsTimingTotal, 0) / competitorAnalyses.length,
                personaScore: competitorAnalyses.reduce((a, b) => a + b.qsPersonaTotal, 0) / competitorAnalyses.length,
                analyzedCount: competitorAnalyses.length,
            };
            console.log('Avg Competitor Calculated:', avgComp);

            return {
                user: avgUser,
                competitors: avgComp,
            };
        } catch (calcError) {
            console.error('Calculation Error:', calcError);
            throw calcError;
        }

    } catch (error) {
        console.error('Error comparing with competitors:', error);
        return null;
    }
}

async function main() {
    // Hardcoded ID from previous check
    const userId = "cmkcu6h0z00006pbtc6418gll";
    await compareWithCompetitors(userId);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
