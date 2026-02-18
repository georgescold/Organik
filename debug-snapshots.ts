
import { prisma } from './lib/prisma';

async function main() {
    // Hardcoded user email or find first user
    // We'll just grab the first user's active profile
    const user = await prisma.user.findFirst({
        include: { profiles: true }
    });

    if (!user) {
        console.log("No user found");
        return;
    }

    const activeProfileId = user.activeProfileId || user.profiles[0]?.id;
    if (!activeProfileId) {
        console.log("No active profile");
        return;
    }

    console.log(`Checking snapshots for profile: ${activeProfileId}`);

    const snapshots = await prisma.analyticsSnapshot.findMany({
        where: {
            profileId: activeProfileId,
            metric: 'followers'
        },
        orderBy: { date: 'desc' },
        take: 20
    });

    console.log("Recent snapshots:");
    snapshots.forEach(s => {
        console.log(`ID: ${s.id} | Date: ${s.date.toISOString()} | Value: ${s.value}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
