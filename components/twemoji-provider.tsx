'use client';

import { useTwemoji } from '@/lib/use-twemoji';

/**
 * Global Twemoji provider - renders emojis as Twitter-style SVG images
 * for consistent mobile-like appearance on all platforms.
 * Place this component once at the app root (layout).
 */
export function TwemojiProvider() {
    useTwemoji();
    return null;
}
