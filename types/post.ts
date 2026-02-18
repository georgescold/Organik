export type SlideData = {
    imageId: string; // Reference to Image.id
    imageHumanId: string; // IMG-00001 for display
    description: string; // From Image.descriptionLong
    text: string; // User-entered text for this slide
};

export type PostFormData = {
    platform: 'tiktok' | 'instagram';
    slides: SlideData[];
    metrics: {
        views: number;
        likes: number;
        saves: number;
        comments: number;
    };
};

export type UserImage = {
    id: string;
    humanId: string;
    descriptionLong: string;
    storageUrl: string;
};

// ============================================
// Carousel Editor Types (TikTok-like editor)
// ============================================

// Base layer properties shared by all layer types
export interface BaseLayer {
    id: string;
    type: 'text' | 'overlay';
    x: number;              // Position in percentage (0-100)
    y: number;              // Position in percentage (0-100)
    rotation: number;       // Rotation in degrees (0-360)
    opacity: number;        // 0-100
    zIndex: number;         // Layer stacking order
    visible?: boolean;      // Toggle visibility (default true)
    locked?: boolean;       // Prevent editing/moving
}

// TikTok text display modes
// - outline: classic white text with colored stroke (text-shadow)
// - box: continuous background boxes per line (box-decoration-break: clone)
// - shadow: drop shadow effect
// - caption: TikTok-native caption style — each line rendered as individual box with gap between lines
export type TextMode = 'outline' | 'box' | 'shadow' | 'caption';

// Text layer for text elements
export interface TextLayer extends BaseLayer {
    type: 'text';
    content: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    fontStyle: 'normal' | 'italic';
    textAlign: 'left' | 'center' | 'right';
    color: string;
    backgroundColor?: string;
    lineHeight?: number;
    letterSpacing?: number;
    textDecoration?: 'none' | 'underline' | 'line-through';
    outlineColor?: string;
    outlineWidth?: number;
    maxWidth?: number; // Largeur max en pixels pour contrôler les sauts de ligne
    textMode?: TextMode; // TikTok style mode: outline, box, or shadow
}

// Overlay layer for color/gradient overlays
export interface OverlayLayer extends BaseLayer {
    type: 'overlay';
    backgroundColor: string;
    blur?: number;          // Backdrop blur in pixels
    width?: number;         // Width in percentage (100 = full width)
    height?: number;        // Height in percentage (100 = full height)
}

// Union type for all layers
export type EditorLayer = TextLayer | OverlayLayer;

// Background image filter presets
export interface FilterPreset {
    id: string;
    name: string;
    category: 'portrait' | 'paysage' | 'gastronomie' | 'ambiance' | 'noir-blanc';
    filter: {
        brightness: number;
        contrast: number;
        blur: number;
        saturate: number;
        hueRotate: number;
        sepia: number;
    };
}

// Background image configuration
export interface BackgroundImage {
    imageId: string;
    imageUrl: string;
    objectFit: 'cover' | 'contain' | 'fill';
    objectPosition: string;     // CSS object-position (e.g., "center", "top left")
    scale: number;              // Zoom/scale factor (1 = 100%)
    filter?: {
        brightness: number;     // 0-200, default 100
        contrast: number;       // 0-200, default 100
        blur: number;           // Blur in pixels, default 0
        saturate?: number;      // 0-200, default 100
        hueRotate?: number;     // 0-360 degrees, default 0
        sepia?: number;         // 0-100, default 0
    };
}

// Enhanced slide for the TikTok-like editor
export interface EditorSlide {
    id: string;
    backgroundColor: string;
    backgroundImage?: BackgroundImage;
    layers: EditorLayer[];
}

// Undo/Redo history entry
export interface HistoryEntry {
    slides: EditorSlide[];
    activeSlideIndex: number;
    timestamp: number;
}
