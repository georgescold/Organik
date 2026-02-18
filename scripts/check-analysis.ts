
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: { profiles: true }
    });

    console.log(`Total Users: ${users.length}`);

    for (const user of users) {
        console.log('-----------------------------------');
        console.log(`User ID: ${user.id} (${user.email})`);
        console.log(`Active Profile ID: ${user.activeProfileId}`);
        const profile = user.activeProfileId
            ? user.profiles.find(p => p.id === user.activeProfileId)
            : user.profiles[0];

        if (!profile) {
            console.log('No profile found');
            continue;
        }
        console.log(`Target Profile ID: ${profile.id}`);

        const analysesCount = await prisma.contentAnalysis.count({
            where: { profileId: profile.id }
        });
        console.log(`User Analyses: ${analysesCount}`);

        const compAnalysesCount = await prisma.competitorAnalysis.count({
            where: { competitor: { profileId: profile.id, isActive: true } }
        });
        console.log(`Competitor Analyses: ${compAnalysesCount}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
