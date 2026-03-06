import type { TextMode } from '@/types/post';

export interface TextStylePreset {
    id: string;
    name: string;
    previewBg: string;
    isCustom?: boolean;
    style: {
        fontFamily?: string;
        fontWeight?: string;
        fontStyle?: 'normal' | 'italic';
        color?: string;
        fontSize?: number;
        x?: number;
        y?: number;
        letterSpacing?: number;
        lineHeight?: number;
        backgroundColor?: string;
        outlineColor?: string;
        outlineWidth?: number;
        textMode?: TextMode;
    };
}

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
    // ═══ TikTok core styles ═══
    {
        id: 'tiktok-classic',
        name: 'Classic',
        previewBg: '#1a1a2e',
        style: {
            fontFamily: 'Montserrat',
            fontWeight: '700',
            color: '#ffffff',
            textMode: 'outline',
            outlineColor: '#000000',
            outlineWidth: 1.5,
            lineHeight: 1.5,
        },
    },
    {
        id: 'tiktok-box-white',
        name: 'Boîte TikTok',
        previewBg: '#333333',
        style: {
            fontFamily: 'Montserrat',
            fontWeight: '700',
            color: '#000000',
            textMode: 'box',
            backgroundColor: 'rgba(255,255,255,0.95)',
            outlineWidth: 0,
            lineHeight: 1.6,
        },
    },
    {
        id: 'tiktok-caption',
        name: 'Caption TikTok',
        previewBg: '#333333',
        style: {
            fontFamily: 'Montserrat',
            fontWeight: '700',
            color: '#000000',
            textMode: 'caption' as TextMode,
            backgroundColor: 'rgba(255,255,255,0.92)',
            outlineWidth: 0,
            lineHeight: 1.5,
        },
    },
    {
        id: 'tiktok-box-dark',
        name: 'Boîte Sombre',
        previewBg: '#cccccc',
        style: {
            fontFamily: 'Montserrat',
            fontWeight: '700',
            color: '#ffffff',
            textMode: 'box',
            backgroundColor: 'rgba(0,0,0,0.75)',
            outlineWidth: 0,
            lineHeight: 1.6,
        },
    },
    {
        id: 'tiktok-shadow',
        name: 'Ombre',
        previewBg: '#333333',
        style: {
            fontFamily: 'Poppins',
            fontWeight: '700',
            color: '#ffffff',
            textMode: 'shadow',
            outlineWidth: 0,
            lineHeight: 1.3,
        },
    },
    {
        id: 'tiktok-neon',
        name: 'Neon',
        previewBg: '#0a0a1a',
        style: {
            fontFamily: 'Abel',
            fontWeight: '400',
            color: '#ffffff',
            textMode: 'outline',
            outlineColor: '#000000',
            outlineWidth: 1.5,
            lineHeight: 1.3,
        },
    },
    {
        id: 'tiktok-elegance',
        name: 'Elegance',
        previewBg: '#1a1a2e',
        style: {
            fontFamily: 'Playfair Display',
            fontWeight: '700',
            color: '#ffffff',
            textMode: 'outline',
            outlineColor: '#000000',
            outlineWidth: 1.5,
            lineHeight: 1.3,
        },
    },
    {
        id: 'tiktok-impact',
        name: 'Impact',
        previewBg: '#000000',
        style: {
            fontFamily: 'Bebas Neue',
            fontWeight: '400',
            color: '#ffffff',
            textMode: 'outline',
            outlineColor: '#000000',
            outlineWidth: 1.5,
            lineHeight: 1.2,
        },
    },
    {
        id: 'tiktok-retro',
        name: 'Retro',
        previewBg: '#1a0d00',
        style: {
            fontFamily: 'Bungee Shade',
            fontWeight: '400',
            color: '#FFD700',
            textMode: 'shadow',
            outlineWidth: 0,
            lineHeight: 1.4,
        },
    },
    {
        id: 'tiktok-handwriting',
        name: 'Signature',
        previewBg: '#1e1e2e',
        style: {
            fontFamily: 'Dancing Script',
            fontWeight: '700',
            color: '#ffffff',
            textMode: 'shadow',
            outlineWidth: 0,
            lineHeight: 1.4,
        },
    },
];

// ============================================
// Custom presets — persisted in localStorage
// ============================================

const CUSTOM_PRESETS_KEY = 'carousel-custom-presets';

export function loadCustomPresets(): TextStylePreset[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(CUSTOM_PRESETS_KEY);
        return stored ? (JSON.parse(stored) as TextStylePreset[]) : [];
    } catch {
        return [];
    }
}

export function saveCustomPresets(presets: TextStylePreset[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
}
