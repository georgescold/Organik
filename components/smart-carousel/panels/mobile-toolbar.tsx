'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    Type,
    Palette,
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    Italic,
    Minus,
    Plus,
    Image as ImageIcon,
    Sparkles,
    X,
    ChevronDown,
    RotateCcw,
    Trash2,
    Copy,
    Layers,
    SlidersHorizontal,
    Star,
} from 'lucide-react';
import { ColorPicker } from '../controls/color-picker';
import { FILTER_PRESETS, FILTER_CATEGORIES, getFilterCSS, type FilterCategory } from '@/lib/filter-presets';
import { TEXT_STYLE_PRESETS, type TextStylePreset } from '@/lib/text-style-presets';
import type { TextLayer, TextMode, EditorSlide, BackgroundImage, UserImage } from '@/types/post';

// ============================================
// Bottom Sheet Modes
// ============================================
type SheetMode = 'none' | 'text-style' | 'presets' | 'filters' | 'background';

// ============================================
// Mobile Toolbar (shown when text layer selected)
// ============================================
interface MobileToolbarProps {
    selectedLayer: TextLayer | null;
    activeSlide: EditorSlide;
    images: UserImage[];
    onUpdateLayer: (updates: Partial<TextLayer>) => void;
    onUpdateSlide: (updates: Partial<EditorSlide>) => void;
    onDeleteLayer: () => void;
    onDuplicateLayer: () => void;
    onApplyPreset: (preset: TextStylePreset) => void;
    onSaveAsDefault?: () => void;
    hasSelection: boolean;
}

export function MobileToolbar({
    selectedLayer,
    activeSlide,
    images,
    onUpdateLayer,
    onUpdateSlide,
    onDeleteLayer,
    onDuplicateLayer,
    onApplyPreset,
    onSaveAsDefault,
    hasSelection,
}: MobileToolbarProps) {
    const [sheetMode, setSheetMode] = useState<SheetMode>('none');
    const [filterCategory, setFilterCategory] = useState<FilterCategory>('portrait');

    // Close sheet when selection changes
    useEffect(() => {
        if (!hasSelection) setSheetMode('none');
    }, [hasSelection]);

    const toggleSheet = (mode: SheetMode) => {
        setSheetMode(prev => prev === mode ? 'none' : mode);
    };

    return (
        <div className="md:hidden" data-export-ignore="true">
            {/* Bottom Sheet */}
            <AnimatePresence>
                {sheetMode !== 'none' && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-[104px] left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl z-50 max-h-[45vh] overflow-y-auto"
                    >
                        {/* Sheet handle */}
                        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl z-10 flex justify-center pt-2 pb-1">
                            <div className="w-8 h-1 bg-white/20 rounded-full" />
                        </div>

                        {/* Sheet Header */}
                        <div className="flex items-center justify-between px-4 pb-2">
                            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                                {sheetMode === 'text-style' && 'Style du texte'}
                                {sheetMode === 'presets' && 'Presets TikTok'}
                                {sheetMode === 'filters' && 'Filtres'}
                                {sheetMode === 'background' && 'Arrière-plan'}
                            </span>
                            <button
                                onClick={() => setSheetMode('none')}
                                className="p-1.5 rounded-full bg-white/10 text-white/60"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Sheet Content */}
                        <div className="px-4 pb-4">
                            {sheetMode === 'text-style' && selectedLayer && (
                                <TextStyleSheet layer={selectedLayer} onUpdate={onUpdateLayer} />
                            )}
                            {sheetMode === 'presets' && (
                                <PresetsSheet onApply={onApplyPreset} />
                            )}
                            {sheetMode === 'filters' && activeSlide.backgroundImage && (
                                <FiltersSheet
                                    slide={activeSlide}
                                    onUpdate={onUpdateSlide}
                                    category={filterCategory}
                                    onCategoryChange={setFilterCategory}
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Toolbar */}
            <div className="fixed bottom-[52px] left-0 right-0 z-40">
                {/* Context toolbar: Text selected */}
                {selectedLayer && (
                    <div className="bg-black/90 backdrop-blur-xl border-t border-white/10">
                        {/* Quick font size controls */}
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
                            <span className="text-[10px] text-white/40 font-medium">{selectedLayer.fontFamily}</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onUpdateLayer({ fontSize: Math.max(12, selectedLayer.fontSize - 2) })}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 text-white active:bg-white/20"
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-xs text-white font-mono w-8 text-center">{selectedLayer.fontSize}</span>
                                <button
                                    onClick={() => onUpdateLayer({ fontSize: Math.min(120, selectedLayer.fontSize + 2) })}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 text-white active:bg-white/20"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onDuplicateLayer()}
                                    className="p-1.5 rounded-lg text-white/50 active:bg-white/10"
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => onDeleteLayer()}
                                    className="p-1.5 rounded-lg text-red-400 active:bg-red-500/10"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Icon toolbar row */}
                        <div className="flex items-center justify-around px-2 py-2">
                            {/* Font picker */}
                            <ToolbarButton
                                icon={<Type className="h-4 w-4" />}
                                label="Police"
                                active={sheetMode === 'text-style'}
                                onClick={() => toggleSheet('text-style')}
                            />
                            {/* Color */}
                            <ToolbarColorButton
                                color={selectedLayer.color}
                                label="Couleur"
                                onChange={(color) => onUpdateLayer({ color })}
                            />
                            {/* Alignment */}
                            <ToolbarButton
                                icon={
                                    selectedLayer.textAlign === 'left' ? <AlignLeft className="h-4 w-4" /> :
                                    selectedLayer.textAlign === 'right' ? <AlignRight className="h-4 w-4" /> :
                                    <AlignCenter className="h-4 w-4" />
                                }
                                label="Aligner"
                                onClick={() => {
                                    const cycle: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
                                    const idx = cycle.indexOf(selectedLayer.textAlign);
                                    onUpdateLayer({ textAlign: cycle[(idx + 1) % 3] });
                                }}
                            />
                            {/* TikTok mode */}
                            <ToolbarButton
                                icon={<span className="text-xs font-bold">Aa</span>}
                                label={
                                    (selectedLayer.textMode || 'outline') === 'outline' ? 'Contour' :
                                    selectedLayer.textMode === 'box' ? 'Boîte' :
                                    selectedLayer.textMode === 'caption' ? 'Caption' : 'Ombre'
                                }
                                onClick={() => {
                                    const modes: TextMode[] = ['outline', 'box', 'caption', 'shadow'];
                                    const idx = modes.indexOf(selectedLayer.textMode || 'outline');
                                    const next = modes[(idx + 1) % modes.length];
                                    const updates: Partial<TextLayer> = { textMode: next };
                                    if (next === 'outline') {
                                        updates.outlineWidth = selectedLayer.outlineWidth || 2;
                                        updates.outlineColor = selectedLayer.outlineColor || '#000000';
                                    } else if (next === 'box') {
                                        updates.outlineWidth = 0;
                                        updates.backgroundColor = selectedLayer.backgroundColor || 'rgba(255,255,255,0.95)';
                                    } else if (next === 'caption') {
                                        updates.outlineWidth = 0;
                                        updates.color = '#000000';
                                        updates.backgroundColor = selectedLayer.backgroundColor || 'rgba(255,255,255,0.92)';
                                    } else {
                                        updates.outlineWidth = 0;
                                        updates.backgroundColor = '#00000000';
                                    }
                                    onUpdateLayer(updates);
                                }}
                            />
                            {/* Presets */}
                            <ToolbarButton
                                icon={<Sparkles className="h-4 w-4" />}
                                label="Presets"
                                active={sheetMode === 'presets'}
                                onClick={() => toggleSheet('presets')}
                            />
                            {/* Save as default */}
                            {onSaveAsDefault && (
                                <ToolbarButton
                                    icon={<Star className="h-4 w-4" />}
                                    label="Défaut"
                                    onClick={onSaveAsDefault}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Context toolbar: No selection (background tools) */}
                {!hasSelection && activeSlide.backgroundImage && (
                    <div className="bg-black/90 backdrop-blur-xl border-t border-white/10">
                        <div className="flex items-center justify-around px-2 py-2">
                            <ToolbarButton
                                icon={<SlidersHorizontal className="h-4 w-4" />}
                                label="Filtres"
                                active={sheetMode === 'filters'}
                                onClick={() => toggleSheet('filters')}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// Sub-components
// ============================================

function ToolbarButton({
    icon,
    label,
    active,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors",
                active ? "text-primary bg-primary/10" : "text-white/70 active:bg-white/10"
            )}
        >
            {icon}
            <span className="text-[9px]">{label}</span>
        </button>
    );
}

function ToolbarColorButton({
    color,
    label,
    onChange,
}: {
    color: string;
    label: string;
    onChange: (color: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(prev => !prev)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-white/70 active:bg-white/10"
            >
                <div
                    className="w-5 h-5 rounded-full border-2 border-white/30 shadow-sm"
                    style={{ backgroundColor: color }}
                />
                <span className="text-[9px]">{label}</span>
            </button>
            {open && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                    <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 shadow-2xl">
                        <div className="grid grid-cols-6 gap-1.5 mb-2">
                            {['#ffffff', '#000000', '#FF3B3B', '#FFD700', '#00D084', '#0096FF',
                              '#FF6B6B', '#FFA726', '#66BB6A', '#42A5F5', '#AB47BC', '#EC407A',
                            ].map(c => (
                                <button
                                    key={c}
                                    className={cn(
                                        "w-7 h-7 rounded-full border-2 transition-transform active:scale-90",
                                        color === c ? "border-primary scale-110" : "border-white/10"
                                    )}
                                    style={{ backgroundColor: c }}
                                    onClick={() => { onChange(c); setOpen(false); }}
                                />
                            ))}
                        </div>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full h-8 rounded cursor-pointer"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// Text Style Bottom Sheet — FULL PARITY with desktop
// ============================================
function TextStyleSheet({ layer, onUpdate }: { layer: TextLayer; onUpdate: (u: Partial<TextLayer>) => void }) {
    const fontFamilies = [
        'Anton', 'Bebas Neue', 'Archivo Black', 'Barlow Condensed',
        'Montserrat', 'Oswald', 'Poppins', 'Inter', 'Roboto',
    ];

    return (
        <div className="space-y-3">
            {/* Font selector — horizontal scroll */}
            <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Police</label>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                    {fontFamilies.map(font => (
                        <button
                            key={font}
                            onClick={() => onUpdate({ fontFamily: font })}
                            className={cn(
                                "shrink-0 px-3 py-2 rounded-lg border text-sm transition-all",
                                layer.fontFamily === font
                                    ? "border-primary bg-primary/15 text-white"
                                    : "border-white/10 bg-white/5 text-white/60 active:bg-white/10"
                            )}
                            style={{ fontFamily: font }}
                        >
                            {font}
                        </button>
                    ))}
                </div>
            </div>

            {/* Weight row */}
            <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Graisse</label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                        { v: '400', l: 'Regular' },
                        { v: '600', l: 'Semi' },
                        { v: '700', l: 'Bold' },
                        { v: '800', l: 'Extra' },
                        { v: '900', l: 'Black' },
                    ].map(fw => (
                        <button
                            key={fw.v}
                            onClick={() => onUpdate({ fontWeight: fw.v })}
                            className={cn(
                                "shrink-0 px-3 py-1.5 rounded-lg border text-xs",
                                layer.fontWeight === fw.v
                                    ? "border-primary bg-primary/15 text-white"
                                    : "border-white/10 bg-white/5 text-white/60"
                            )}
                            style={{ fontWeight: fw.v }}
                        >
                            {fw.l}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bold + Italic row */}
            <div className="flex gap-2">
                <button
                    onClick={() => onUpdate({ fontWeight: parseInt(layer.fontWeight) >= 700 ? '400' : '700' })}
                    className={cn(
                        "flex-1 py-2 rounded-lg border text-sm font-bold",
                        parseInt(layer.fontWeight) >= 700 ? "border-primary bg-primary/15 text-white" : "border-white/10 bg-white/5 text-white/60"
                    )}
                >
                    B
                </button>
                <button
                    onClick={() => onUpdate({ fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    className={cn(
                        "flex-1 py-2 rounded-lg border text-sm italic",
                        layer.fontStyle === 'italic' ? "border-primary bg-primary/15 text-white" : "border-white/10 bg-white/5 text-white/60"
                    )}
                >
                    I
                </button>
            </div>

            {/* Outline width + outline color (only in outline mode) */}
            {(layer.textMode || 'outline') === 'outline' && (
                <>
                    <div className="space-y-1.5">
                        <div className="flex justify-between">
                            <label className="text-[10px] text-white/40 uppercase tracking-wider">Contour</label>
                            <span className="text-[10px] text-primary">{layer.outlineWidth || 0}px</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={10}
                            step={0.5}
                            value={layer.outlineWidth || 2}
                            onChange={(e) => onUpdate({ outlineWidth: parseFloat(e.target.value) })}
                            className="w-full accent-primary h-1.5"
                        />
                    </div>
                    {/* Outline color */}
                    {(layer.outlineWidth || 0) > 0 && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40 uppercase tracking-wider">Couleur contour</label>
                            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                                {['#000000', '#ffffff', '#FF3B3B', '#FFD700', '#0096FF', '#00D084', '#AB47BC'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => onUpdate({ outlineColor: c })}
                                        className={cn(
                                            "shrink-0 w-8 h-8 rounded-full border-2 transition-transform active:scale-90",
                                            (layer.outlineColor || '#000000') === c ? "border-primary scale-110" : "border-white/10"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Box background color (box and caption modes) */}
            {(layer.textMode === 'box' || layer.textMode === 'caption') && (
                <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider">Fond de la boîte</label>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                        {['rgba(255,255,255,0.95)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.6)', 'rgba(255,59,59,0.8)', 'rgba(0,150,255,0.8)'].map(c => (
                            <button
                                key={c}
                                onClick={() => onUpdate({ backgroundColor: c })}
                                className={cn(
                                    "shrink-0 w-8 h-8 rounded-full border-2 transition-transform",
                                    layer.backgroundColor === c ? "border-primary scale-110" : "border-white/10"
                                )}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Line height */}
            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider">Interligne</label>
                    <span className="text-[10px] text-primary">{(layer.lineHeight || 1.4).toFixed(1)}</span>
                </div>
                <input
                    type="range"
                    min={0.8}
                    max={3}
                    step={0.1}
                    value={layer.lineHeight || 1.4}
                    onChange={(e) => onUpdate({ lineHeight: parseFloat(e.target.value) })}
                    className="w-full accent-primary h-1.5"
                />
            </div>

            {/* Letter spacing */}
            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider">Espacement</label>
                    <span className="text-[10px] text-primary">{layer.letterSpacing || 0}px</span>
                </div>
                <input
                    type="range"
                    min={-5}
                    max={20}
                    step={0.5}
                    value={layer.letterSpacing || 0}
                    onChange={(e) => onUpdate({ letterSpacing: parseFloat(e.target.value) })}
                    className="w-full accent-primary h-1.5"
                />
            </div>

            {/* Text width */}
            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider">Largeur texte</label>
                    <span className="text-[10px] text-primary">{layer.maxWidth || 320}px</span>
                </div>
                <input
                    type="range"
                    min={100}
                    max={800}
                    step={10}
                    value={layer.maxWidth || 320}
                    onChange={(e) => onUpdate({ maxWidth: parseInt(e.target.value) })}
                    className="w-full accent-primary h-1.5"
                />
            </div>

            {/* Rotation */}
            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider">Rotation</label>
                    <span className="text-[10px] text-primary">{layer.rotation || 0}°</span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={layer.rotation || 0}
                    onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) })}
                    className="w-full accent-primary h-1.5"
                />
                <div className="flex gap-1">
                    {[0, 45, 90, 180, 270].map(angle => (
                        <button
                            key={angle}
                            onClick={() => onUpdate({ rotation: angle })}
                            className={cn(
                                "flex-1 py-1 rounded-md border text-[10px] transition-colors",
                                (layer.rotation || 0) === angle
                                    ? "border-primary bg-primary/15 text-white"
                                    : "border-white/10 bg-white/5 text-white/50"
                            )}
                        >
                            {angle}°
                        </button>
                    ))}
                </div>
            </div>

            {/* Opacity */}
            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider">Opacité</label>
                    <span className="text-[10px] text-primary">{layer.opacity}%</span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={layer.opacity}
                    onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) })}
                    className="w-full accent-primary h-1.5"
                />
            </div>
        </div>
    );
}

// ============================================
// Presets Bottom Sheet
// ============================================
function PresetsSheet({ onApply }: { onApply: (preset: TextStylePreset) => void }) {
    return (
        <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
                {TEXT_STYLE_PRESETS.map(preset => (
                    <button
                        key={preset.id}
                        onClick={() => onApply(preset)}
                        className="shrink-0 w-20 rounded-xl overflow-hidden border border-white/10 active:scale-95 transition-transform"
                    >
                        <div
                            className="h-14 flex items-center justify-center"
                            style={{ backgroundColor: preset.previewBg }}
                        >
                            <span
                                style={{
                                    fontFamily: preset.style.fontFamily,
                                    fontWeight: preset.style.fontWeight,
                                    color: preset.style.color,
                                    fontSize: '18px',
                                    backgroundColor: (preset.style.textMode === 'box' || preset.style.textMode === 'caption')
                                        ? preset.style.backgroundColor : undefined,
                                    padding: (preset.style.textMode === 'box' || preset.style.textMode === 'caption') ? '3px 8px' : undefined,
                                    borderRadius: (preset.style.textMode === 'box' || preset.style.textMode === 'caption') ? '5px' : undefined,
                                    textShadow: preset.style.textMode === 'shadow'
                                        ? '0 2px 6px rgba(0,0,0,0.8)'
                                        : preset.style.outlineWidth && preset.style.outlineColor
                                            ? (() => {
                                                const w = preset.style.outlineWidth!;
                                                const c = preset.style.outlineColor!;
                                                const s: string[] = [];
                                                for (let i = 0; i < 12; i++) {
                                                    const a = (2 * Math.PI * i) / 12;
                                                    s.push(`${(Math.cos(a)*w).toFixed(1)}px ${(Math.sin(a)*w).toFixed(1)}px 0 ${c}`);
                                                }
                                                return s.join(', ');
                                            })()
                                            : undefined,
                                } as React.CSSProperties}
                            >
                                Aa
                            </span>
                        </div>
                        <div className="py-1 px-1.5 bg-white/5">
                            <p className="text-[9px] text-white/60 truncate text-center">{preset.name}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ============================================
// Filters Bottom Sheet (TikTok-style)
// ============================================
function FiltersSheet({
    slide,
    onUpdate,
    category,
    onCategoryChange,
}: {
    slide: EditorSlide;
    onUpdate: (u: Partial<EditorSlide>) => void;
    category: FilterCategory;
    onCategoryChange: (c: FilterCategory) => void;
}) {
    const bgImage = slide.backgroundImage;
    if (!bgImage) return null;

    const filteredPresets = FILTER_PRESETS.filter(p => p.category === category);

    const applyFilter = (preset: typeof FILTER_PRESETS[0]) => {
        onUpdate({
            backgroundImage: {
                ...bgImage,
                filter: {
                    brightness: preset.filter.brightness,
                    contrast: preset.filter.contrast,
                    blur: preset.filter.blur,
                    saturate: preset.filter.saturate,
                    hueRotate: preset.filter.hueRotate,
                    sepia: preset.filter.sepia,
                },
            },
        });
    };

    return (
        <div className="space-y-3">
            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                {FILTER_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => onCategoryChange(cat.id)}
                        className={cn(
                            "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                            category === cat.id
                                ? "bg-white text-black"
                                : "bg-white/10 text-white/60 active:bg-white/20"
                        )}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Filter presets — horizontal scroll with image previews */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {/* Reset / Normal */}
                <button
                    onClick={() => applyFilter(FILTER_PRESETS[0])}
                    className="shrink-0 flex flex-col items-center gap-1"
                >
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 relative">
                        <img
                            src={bgImage.imageUrl}
                            alt="Normal"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <RotateCcw className="h-4 w-4 text-white" />
                        </div>
                    </div>
                    <span className="text-[10px] text-white/60">Normal</span>
                </button>

                {filteredPresets.map(preset => {
                    const filterCSS = getFilterCSS(preset.filter);
                    const isActive = bgImage.filter?.brightness === preset.filter.brightness
                        && bgImage.filter?.contrast === preset.filter.contrast
                        && (bgImage.filter?.saturate ?? 100) === preset.filter.saturate;

                    return (
                        <button
                            key={preset.id}
                            onClick={() => applyFilter(preset)}
                            className="shrink-0 flex flex-col items-center gap-1"
                        >
                            <div className={cn(
                                "w-16 h-16 rounded-full overflow-hidden border-2 transition-all",
                                isActive ? "border-primary scale-105" : "border-white/10"
                            )}>
                                <img
                                    src={bgImage.imageUrl}
                                    alt={preset.name}
                                    className="w-full h-full object-cover"
                                    style={{ filter: filterCSS }}
                                />
                            </div>
                            <span className={cn(
                                "text-[10px]",
                                isActive ? "text-primary font-medium" : "text-white/60"
                            )}>
                                {preset.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
