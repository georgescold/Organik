'use client';

import { useEffect, useRef } from 'react';
import { checkAndAutoSync } from '@/server/actions/scrape-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

/**
 * AutoSync — invisible component that triggers TikTok sync automatically.
 *
 * Mounts on dashboard load and on profile switch (via key={activeProfileId}).
 * Checks if a sync is needed (>30min since last sync or never synced).
 * Runs the sync in background with a subtle toast notification.
 *
 * This ensures the AI generation prompts always have fresh data
 * (viral analysis, linguistic fingerprint, etc.) without the user
 * having to manually click "Sync TikTok" every time.
 */
export function AutoSync() {
    const hasRun = useRef(false);
    const router = useRouter();

    useEffect(() => {
        // Only run once per mount (per profile)
        if (hasRun.current) return;
        hasRun.current = true;

        // Small delay to let the dashboard render first
        const timer = setTimeout(async () => {
            try {
                const result = await checkAndAutoSync();

                if (result.synced) {
                    toast.success(
                        `Sync auto: ${result.newPosts || 0} nouveaux, ${result.updatedPosts || 0} mis à jour`,
                        { duration: 4000 }
                    );
                    // Refresh to show updated data
                    router.refresh();
                }
                // If skipped, stay silent (no toast needed)
            } catch (error) {
                // Silent fail — auto-sync should never disrupt the user
                console.error('[AutoSync] Error:', error);
            }
        }, 2000); // 2s delay after mount

        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // This component renders nothing
    return null;
}
