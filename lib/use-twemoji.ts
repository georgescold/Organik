'use client';

import { useEffect, useCallback } from 'react';

/**
 * Twemoji - replaces native emojis with Twitter-style SVG images.
 * This ensures consistent mobile-style emoji rendering across all platforms.
 * Uses Twemoji CDN (jdecked fork - maintained, MIT licensed).
 */

let twemojiLoaded = false;
let twemojiScript: HTMLScriptElement | null = null;

function loadTwemojiScript(): Promise<void> {
    if (twemojiLoaded && (window as any).twemoji) return Promise.resolve();

    return new Promise((resolve, reject) => {
        if (twemojiScript) {
            // Already loading
            twemojiScript.addEventListener('load', () => resolve());
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@twemoji/api@latest/dist/twemoji.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            twemojiLoaded = true;
            resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Twemoji'));
        twemojiScript = script;
        document.head.appendChild(script);
    });
}

/** Parse a specific DOM element with Twemoji */
export function parseTwemoji(element?: HTMLElement | null) {
    const tw = (window as any).twemoji;
    if (!tw) return;

    const target = element || document.body;
    tw.parse(target, {
        folder: 'svg',
        ext: '.svg',
        base: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/',
    });
}

/**
 * Hook that loads Twemoji and auto-parses emojis in the document.
 * Re-parses on every render cycle via MutationObserver.
 */
export function useTwemoji() {
    const parse = useCallback(() => {
        if ((window as any).twemoji) {
            parseTwemoji(document.body);
        }
    }, []);

    useEffect(() => {
        let observer: MutationObserver | null = null;
        let parseTimeout: ReturnType<typeof setTimeout> | null = null;

        // Debounced parse to avoid excessive re-parses
        const debouncedParse = () => {
            if (parseTimeout) clearTimeout(parseTimeout);
            parseTimeout = setTimeout(() => {
                parse();
            }, 100);
        };

        loadTwemojiScript().then(() => {
            // Initial parse
            parse();

            // Observe DOM changes to re-parse new emojis
            observer = new MutationObserver(debouncedParse);
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }).catch(console.error);

        return () => {
            observer?.disconnect();
            if (parseTimeout) clearTimeout(parseTimeout);
        };
    }, [parse]);
}
