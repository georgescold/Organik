'use client';

import { useEffect } from 'react';

interface ProfileThemeAdapterProps {
    avatarUrl?: string | null;
}

export function ProfileThemeAdapter({ avatarUrl }: ProfileThemeAdapterProps) {
    useEffect(() => {
        if (!avatarUrl) {
            // Reset to default if no avatar
            // We don't remove property to strictly fall back to CSS defaults to avoid flashing
            return;
        }

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = avatarUrl; // Assuming this URL is accessible via CORS

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);

                // Sample pixels
                const data = ctx.getImageData(0, 0, img.width, img.height).data;
                let r = 0, g = 0, b = 0, count = 0;

                for (let i = 0; i < data.length; i += 4 * 50) {
                    const currentR = data[i];
                    const currentG = data[i + 1];
                    const currentB = data[i + 2];
                    const alpha = data[i + 3];

                    // Ignore transparent
                    if (alpha < 10) continue;

                    // Calculate brightness to skip extreme whites/blacks
                    const brightness = (currentR + currentG + currentB) / 3;
                    // Relaxed range to capture more colors
                    if (brightness > 10 && brightness < 250) {
                        r += currentR;
                        g += currentG;
                        b += currentB;
                        count++;
                    }
                }

                if (count > 0) {
                    const avgR = Math.round(r / count);
                    const avgG = Math.round(g / count);
                    const avgB = Math.round(b / count);

                    const { h, s, l } = rgbToHsl(avgR, avgG, avgB);

                    // Adjust for visibility as a Secondary/Background color
                    // We want the color to be clearly visible but not neon
                    // Boost saturation slightly
                    const adjustedS = Math.min(s + 10, 90);

                    // Clamp lightness:
                    // Only target Secondary color
                    const colorValue = `${h} ${adjustedS}% ${l}%`;

                    document.documentElement.style.setProperty('--secondary', colorValue);

                    // Determine contrasting text color based on lightness
                    // If color is dark, text should be light, and vice - versa
                    const isDark = l < 50;
                    document.documentElement.style.setProperty(
                        '--secondary-foreground',
                        isDark ? '210 40% 98%' : '222.2 47.4% 11.2%'
                    );
                }
            } catch (e) {
                console.error("Theme extraction failed (security or error)", e);
            }
        };

    }, [avatarUrl]);

    return null;
}

function rgbToHsl(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
