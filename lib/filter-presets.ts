import type { FilterPreset } from '@/types/post';

export const FILTER_PRESETS: FilterPreset[] = [
    // ═══ Portrait ═══
    {
        id: 'normal',
        name: 'Normal',
        category: 'portrait',
        filter: { brightness: 100, contrast: 100, blur: 0, saturate: 100, hueRotate: 0, sepia: 0 },
    },
    {
        id: 'caramel',
        name: 'Caramel',
        category: 'portrait',
        filter: { brightness: 105, contrast: 110, blur: 0, saturate: 80, hueRotate: 15, sepia: 25 },
    },
    {
        id: 'sky',
        name: 'Sky',
        category: 'portrait',
        filter: { brightness: 110, contrast: 95, blur: 0, saturate: 120, hueRotate: 200, sepia: 0 },
    },
    {
        id: 'automne',
        name: 'Automne',
        category: 'portrait',
        filter: { brightness: 100, contrast: 115, blur: 0, saturate: 130, hueRotate: 10, sepia: 15 },
    },
    {
        id: 'cozy',
        name: 'Cozy',
        category: 'portrait',
        filter: { brightness: 108, contrast: 105, blur: 0, saturate: 85, hueRotate: 20, sepia: 20 },
    },
    {
        id: 'bloom',
        name: 'Bloom',
        category: 'portrait',
        filter: { brightness: 115, contrast: 90, blur: 0, saturate: 110, hueRotate: 340, sepia: 5 },
    },
    // ═══ Paysage ═══
    {
        id: 'vivid',
        name: 'Vivid',
        category: 'paysage',
        filter: { brightness: 105, contrast: 120, blur: 0, saturate: 140, hueRotate: 0, sepia: 0 },
    },
    {
        id: 'golden',
        name: 'Golden',
        category: 'paysage',
        filter: { brightness: 110, contrast: 105, blur: 0, saturate: 90, hueRotate: 25, sepia: 30 },
    },
    {
        id: 'ocean',
        name: 'Ocean',
        category: 'paysage',
        filter: { brightness: 100, contrast: 110, blur: 0, saturate: 130, hueRotate: 190, sepia: 0 },
    },
    {
        id: 'sunset',
        name: 'Sunset',
        category: 'paysage',
        filter: { brightness: 108, contrast: 115, blur: 0, saturate: 120, hueRotate: 345, sepia: 10 },
    },
    {
        id: 'forest',
        name: 'Forêt',
        category: 'paysage',
        filter: { brightness: 95, contrast: 115, blur: 0, saturate: 110, hueRotate: 100, sepia: 5 },
    },
    // ═══ Gastronomie ═══
    {
        id: 'warm',
        name: 'Warm',
        category: 'gastronomie',
        filter: { brightness: 110, contrast: 108, blur: 0, saturate: 115, hueRotate: 15, sepia: 10 },
    },
    {
        id: 'fresh',
        name: 'Fresh',
        category: 'gastronomie',
        filter: { brightness: 112, contrast: 100, blur: 0, saturate: 125, hueRotate: 0, sepia: 0 },
    },
    {
        id: 'rustic',
        name: 'Rustique',
        category: 'gastronomie',
        filter: { brightness: 100, contrast: 120, blur: 0, saturate: 80, hueRotate: 20, sepia: 30 },
    },
    // ═══ Ambiance ═══
    {
        id: 'neon',
        name: 'Néon',
        category: 'ambiance',
        filter: { brightness: 95, contrast: 130, blur: 0, saturate: 160, hueRotate: 0, sepia: 0 },
    },
    {
        id: 'dreamy',
        name: 'Rêveur',
        category: 'ambiance',
        filter: { brightness: 115, contrast: 85, blur: 1, saturate: 90, hueRotate: 330, sepia: 15 },
    },
    {
        id: 'moody',
        name: 'Moody',
        category: 'ambiance',
        filter: { brightness: 90, contrast: 125, blur: 0, saturate: 70, hueRotate: 200, sepia: 10 },
    },
    {
        id: 'retro',
        name: 'Rétro',
        category: 'ambiance',
        filter: { brightness: 105, contrast: 95, blur: 0, saturate: 75, hueRotate: 10, sepia: 40 },
    },
    // ═══ Noir & Blanc ═══
    {
        id: 'bw-classic',
        name: 'N&B Classic',
        category: 'noir-blanc',
        filter: { brightness: 100, contrast: 110, blur: 0, saturate: 0, hueRotate: 0, sepia: 0 },
    },
    {
        id: 'bw-high',
        name: 'N&B Contraste',
        category: 'noir-blanc',
        filter: { brightness: 105, contrast: 140, blur: 0, saturate: 0, hueRotate: 0, sepia: 0 },
    },
    {
        id: 'bw-vintage',
        name: 'N&B Vintage',
        category: 'noir-blanc',
        filter: { brightness: 100, contrast: 115, blur: 0, saturate: 0, hueRotate: 0, sepia: 20 },
    },
];

export const FILTER_CATEGORIES = [
    { id: 'portrait', name: 'Portrait' },
    { id: 'paysage', name: 'Paysage' },
    { id: 'gastronomie', name: 'Gastronomie' },
    { id: 'ambiance', name: 'Ambiance' },
    { id: 'noir-blanc', name: 'N&B' },
] as const;

export type FilterCategory = typeof FILTER_CATEGORIES[number]['id'];

export function getFilterCSS(filter: FilterPreset['filter']): string {
    const parts: string[] = [];
    if (filter.brightness !== 100) parts.push(`brightness(${filter.brightness}%)`);
    if (filter.contrast !== 100) parts.push(`contrast(${filter.contrast}%)`);
    if (filter.blur > 0) parts.push(`blur(${filter.blur}px)`);
    if (filter.saturate !== 100) parts.push(`saturate(${filter.saturate}%)`);
    if (filter.hueRotate !== 0) parts.push(`hue-rotate(${filter.hueRotate}deg)`);
    if (filter.sepia > 0) parts.push(`sepia(${filter.sepia}%)`);
    return parts.length > 0 ? parts.join(' ') : 'none';
}
