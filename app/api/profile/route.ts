import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profiles: {
                    where: { platform: 'tiktok' },
                    take: 1
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Use active profile or fallback to first tiktok profile
        let profile = null;
        if (user.activeProfileId) {
            profile = await prisma.profile.findUnique({
                where: { id: user.activeProfileId }
            });
        }

        if (!profile && user.profiles.length > 0) {
            profile = user.profiles[0];
        }

        return NextResponse.json({ profile });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
