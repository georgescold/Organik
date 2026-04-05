'use client';

import { useEffect, useRef } from 'react';

/**
 * Lazy-loads Google Fonts used in the carousel editor.
 * Mapped to TikTok's actual editor font categories:
 * - Classic → Proxima Nova alternative = Montserrat (closest free)
 * - Elegance → Playfair Display
 * - Neon → Abel
 * - Retro → Bungee Shade
 * - Typewriter → Source Code Pro
 * - Handwriting → Yesteryear
 * - Serif → Georgia (system font)
 * - Tallhaus → Oswald (condensed gothic)
 * - Vintage → Special Elite
 * - Bomb → Permanent Marker
 * - Signature → Dancing Script
 * - Comic Sans → Comic Neue (libre alternative)
 * - Lyrical → Caveat
 * - Verve → Rubik
 * - Oxygen → Oxygen
 * + Bold impact fonts: Anton, Bebas Neue, Archivo Black, Barlow Condensed
 */

const EDITOR_FONTS_URL =
    'https://fonts.googleapis.com/css2?family=Abel&family=Anton&family=Archivo+Black&family=Barlow+Condensed:wght@600;700;800&family=Bebas+Neue&family=Bungee+Shade&family=Caveat:wght@400;700&family=Comic+Neue:wght@400;700&family=Dancing+Script:wght@400;700&family=Inter:wght@400;600;700;800&family=Montserrat:wght@400;600;700;800;900&family=Oswald:wght@400;500;600;700&family=Oxygen:wght@400;700&family=Permanent+Marker&family=Playfair+Display:wght@400;700;900&family=Poppins:wght@400;600;700;800&family=Roboto:wght@400;700;900&family=Rubik:wght@400;600;700;800&family=Source+Code+Pro:wght@400;700&family=Special+Elite&family=Yesteryear&display=swap';

let fontsLoaded = false;

export function useEditorFonts() {
    const attempted = useRef(false);

    useEffect(() => {
        if (fontsLoaded || attempted.current) return;
        attempted.current = true;

        const existingLink = document.querySelector(`link[href="${EDITOR_FONTS_URL}"]`);
        if (existingLink) {
            fontsLoaded = true;
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = EDITOR_FONTS_URL;
        link.onload = () => {
            fontsLoaded = true;
        };
        document.head.appendChild(link);
    }, []);
}
