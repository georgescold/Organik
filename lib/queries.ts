import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * Cached user query — deduplicated per request lifecycle.
 * React's cache() ensures this runs only ONCE per server render,
 * even if called from both layout.tsx and page.tsx.
 */
export const getCurrentUser = cache(async () => {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { profiles: true }
    });

    return user;
});
