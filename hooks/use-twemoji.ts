'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Twemoji - replaces native emojis with Twitter-style SVG images.
 * This ensures consistent mobile-style emoji rendering across all platforms.
 * Uses Twemoji CDN (jdecked fork - maintained, MIT licensed).
 *
 * IMPORTANT: We avoid parsing the entire document.body to prevent React
 * DOM conflicts (removeChild errors). Instead, we only parse elements
 * that have the `data-twemoji` attribute.
 */

let twemojiLoaded = false;
let twemojiLoading: Promise<void> | null = null;

export function loadTwemojiScript(): Promise<void> {
    if (twemojiLoaded && (window as any).twemoji) return Promise.resolve();
    if (twemojiLoading) return twemojiLoading;

    twemojiLoading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@twemoji/api@latest/dist/twemoji.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            twemojiLoaded = true;
            resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Twemoji'));
        document.head.appendChild(script);
    });

    return twemojiLoading;
}

/** Parse a specific DOM element with Twemoji (sync — requires script already loaded) */
export function parseTwemoji(element?: HTMLElement | null) {
    const tw = (window as any).twemoji;
    if (!tw || !element) return;

    tw.parse(element, {
        folder: 'svg',
        ext: '.svg',
        base: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/',
    });
}

/** Parse a specific DOM element with Twemoji, loading script first if needed */
export async function parseTwemojiAsync(element?: HTMLElement | null) {
    if (!element) return;
    await loadTwemojiScript();
    parseTwemoji(element);
}

/**
 * Safe Twemoji parsing that only targets elements with [data-twemoji].
 * This avoids modifying React-managed DOM nodes directly.
 */
function parseTwemojiSafe() {
    const tw = (window as any).twemoji;
    if (!tw) return;

    // Only parse elements explicitly marked for Twemoji
    const targets = document.querySelectorAll('[data-twemoji]');
    targets.forEach((el) => {
        tw.parse(el as HTMLElement, {
            folder: 'svg',
            ext: '.svg',
            base: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/',
        });
    });
}

/**
 * Hook that loads Twemoji and auto-parses emojis.
 * Only targets elements with the `data-twemoji` attribute to avoid
 * React DOM conflicts (removeChild / insertBefore errors).
 */
export function useTwemoji() {
    const observerRef = useRef<MutationObserver | null>(null);
    const parseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isParsing = useRef(false);

    const debouncedParse = useCallback(() => {
        if (parseTimeoutRef.current) clearTimeout(parseTimeoutRef.current);
        parseTimeoutRef.current = setTimeout(() => {
            if (isParsing.current) return;
            isParsing.current = true;
            // Disconnect observer during parsing to avoid re-trigger loop
            observerRef.current?.disconnect();
            parseTwemojiSafe();
            // Reconnect observer after parsing
            requestAnimationFrame(() => {
                observerRef.current?.observe(document.body, {
                    childList: true,
                    subtree: true,
                });
                isParsing.current = false;
            });
        }, 200);
    }, []);

    useEffect(() => {
        loadTwemojiScript().then(() => {
            // Initial parse
            parseTwemojiSafe();

            // Observe DOM changes to re-parse new emojis (childList only, no characterData)
            const observer = new MutationObserver((mutations) => {
                // Only re-parse if there are actual node additions (not Twemoji's own changes)
                const hasRelevantChange = mutations.some(m =>
                    m.type === 'childList' && m.addedNodes.length > 0
                );
                if (hasRelevantChange) {
                    debouncedParse();
                }
            });
            observerRef.current = observer;
            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }).catch(console.error);

        return () => {
            observerRef.current?.disconnect();
            if (parseTimeoutRef.current) clearTimeout(parseTimeoutRef.current);
        };
    }, [debouncedParse]);
}
