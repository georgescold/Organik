'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ============= PANEL CRUD =============

export async function getAdminPanels() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Shared across all users — no userId filter
        const panels = await prisma.adminPanel.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                productName: true,
                createdAt: true,
                _count: { select: { selectedProfiles: true } }
            }
        });
        return { success: true, panels };
    } catch (e) {
        console.error("Fetch admin panels error:", e);
        return { error: 'Failed to fetch panels' };
    }
}

export async function getAdminPanel(panelId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const panel = await prisma.adminPanel.findUnique({
            where: { id: panelId },
            include: {
                selectedProfiles: {
                    orderBy: [{ groupLabel: 'asc' }, { sortOrder: 'asc' }],
                    include: {
                        profile: {
                            select: {
                                id: true,
                                displayName: true,
                                username: true,
                                platform: true,
                                avatarUrl: true,
                                niche: true,
                                followersCount: true,
                                likesCount: true,
                                videoCount: true,
                                lastSyncAt: true,
                                userId: true,
                                user: { select: { email: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!panel) return { error: 'Panel not found' };
        return { success: true, panel };
    } catch (e) {
        console.error("Fetch admin panel error:", e);
        return { error: 'Failed to fetch panel' };
    }
}

export async function createAdminPanel(name: string = 'Mon Panel') {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const panel = await prisma.adminPanel.create({
            data: {
                name,
                userId: session.user.id
            }
        });
        revalidatePath('/dashboard/admin', 'page');
        return { success: true, panelId: panel.id };
    } catch (e) {
        console.error("Create admin panel error:", e);
        return { error: 'Failed to create panel' };
    }
}

export async function updateAdminPanel(panelId: string, data: {
    name?: string;
    productName?: string;
    productDescription?: string;
    productUrl?: string;
    targetAudience?: string;
    positioning?: string;
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.adminPanel.update({
            where: { id: panelId },
            data
        });
        revalidatePath(`/dashboard/admin/${panelId}`, 'page');
        return { success: true };
    } catch (e) {
        console.error("Update admin panel error:", e);
        return { error: 'Failed to update panel' };
    }
}

export async function deleteAdminPanel(panelId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.adminPanel.delete({
            where: { id: panelId }
        });
        revalidatePath('/dashboard/admin', 'page');
        return { success: true };
    } catch (e) {
        console.error("Delete admin panel error:", e);
        return { error: 'Failed to delete panel' };
    }
}

// ============= PROFILE MANAGEMENT =============

export async function getAllProfiles() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Cross-user: fetch ALL profiles from ALL users (internal tool)
        const profiles = await prisma.profile.findMany({
            orderBy: [{ user: { email: 'asc' } }, { displayName: 'asc' }],
            select: {
                id: true,
                displayName: true,
                username: true,
                platform: true,
                avatarUrl: true,
                niche: true,
                followersCount: true,
                likesCount: true,
                videoCount: true,
                lastSyncAt: true,
                user: { select: { email: true } }
            }
        });
        return { success: true, profiles };
    } catch (e) {
        console.error("Fetch all profiles error:", e);
        return { error: 'Failed to fetch profiles' };
    }
}

export async function addProfilesToPanel(panelId: string, profileIds: string[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Upsert to avoid duplicates
        await prisma.$transaction(
            profileIds.map(profileId =>
                prisma.adminPanelProfile.upsert({
                    where: {
                        adminPanelId_profileId: { adminPanelId: panelId, profileId }
                    },
                    create: { adminPanelId: panelId, profileId },
                    update: {} // No-op if already exists
                })
            )
        );
        revalidatePath(`/dashboard/admin/${panelId}`, 'page');
        return { success: true };
    } catch (e) {
        console.error("Add profiles to panel error:", e);
        return { error: 'Failed to add profiles' };
    }
}

export async function removeProfileFromPanel(panelId: string, profileId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.adminPanelProfile.delete({
            where: {
                adminPanelId_profileId: { adminPanelId: panelId, profileId }
            }
        });
        revalidatePath(`/dashboard/admin/${panelId}`, 'page');
        return { success: true };
    } catch (e) {
        console.error("Remove profile from panel error:", e);
        return { error: 'Failed to remove profile' };
    }
}

// ============= AGGREGATED METRICS =============

export async function getPanelMetrics(panelId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Get all profile IDs in this panel
        const panelProfiles = await prisma.adminPanelProfile.findMany({
            where: { adminPanelId: panelId },
            select: { profileId: true }
        });

        const profileIds = panelProfiles.map(pp => pp.profileId);
        if (profileIds.length === 0) {
            return { success: true, metrics: { totalFollowers: 0, totalLikes: 0, totalVideos: 0, totalPosts: 0, profiles: [], topPosts: [] } };
        }

        // Get profiles with metrics
        const profiles = await prisma.profile.findMany({
            where: { id: { in: profileIds } },
            select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true,
                followersCount: true,
                likesCount: true,
                videoCount: true,
                lastSyncAt: true,
                _count: { select: { posts: true } }
            }
        });

        // Get top posts across all profiles (metrics are in the Metrics relation)
        const topPosts = await prisma.post.findMany({
            where: {
                profileId: { in: profileIds },
                metrics: { views: { gt: 0 } }
            },
            orderBy: { metrics: { views: 'desc' } },
            take: 10,
            select: {
                id: true,
                hookText: true,
                description: true,
                publishedAt: true,
                coverUrl: true,
                metrics: {
                    select: { views: true, likes: true, comments: true, shares: true, saves: true }
                },
                profile: {
                    select: { displayName: true, username: true, avatarUrl: true }
                }
            }
        });

        const totalFollowers = profiles.reduce((sum, p) => sum + p.followersCount, 0);
        const totalLikes = profiles.reduce((sum, p) => sum + p.likesCount, 0);
        const totalVideos = profiles.reduce((sum, p) => sum + p.videoCount, 0);
        const totalPosts = profiles.reduce((sum, p) => sum + p._count.posts, 0);

        return {
            success: true,
            metrics: {
                totalFollowers,
                totalLikes,
                totalVideos,
                totalPosts,
                profiles: profiles.map(p => ({
                    ...p,
                    postsCount: p._count.posts
                })),
                topPosts
            }
        };
    } catch (e) {
        console.error("Fetch panel metrics error:", e);
        return { error: 'Failed to fetch metrics' };
    }
}
