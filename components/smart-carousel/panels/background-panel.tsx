'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ImagePickerModal } from '@/components/analytics/image-picker-modal';
import { ColorPicker } from '../controls/color-picker';
import { Image as ImageIcon, Trash2, ZoomIn, Sun, Contrast, Droplets, Palette, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FILTER_PRESETS, FILTER_CATEGORIES, getFilterCSS, type FilterCategory } from '@/lib/filter-presets';
import type { EditorSlide, BackgroundImage, UserImage } from '@/types/post';

interface BackgroundPanelProps {
    slide: EditorSlide;
    images: UserImage[];
    onUpdate: (updates: Partial<EditorSlide>) => void;
}

export function BackgroundPanel({ slide, images, onUpdate }: BackgroundPanelProps) {
    const [imagePickerOpen, setImagePickerOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState<FilterCategory>('portrait');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const bgImage = slide.backgroundImage;

    const handleImageSelect = (image: UserImage) => {
        onUpdate({
            backgroundImage: {
                imageId: image.id,
                imageUrl: image.storageUrl,
                objectFit: 'cover',
                objectPosition: 'center',
                scale: 1,
                filter: {
                    brightness: 100,
                    contrast: 100,
                    blur: 0,
                    saturate: 100,
                    hueRotate: 0,
                    sepia: 0,
                },
            },
        });
    };

    const handleRemoveImage = () => {
        onUpdate({ backgroundImage: undefined });
    };

    const updateBackgroundImage = (updates: Partial<BackgroundImage>) => {
        if (!bgImage) return;
        onUpdate({
            backgroundImage: { ...bgImage, ...updates },
        });
    };

    const updateFilter = (filterUpdates: Partial<NonNullable<BackgroundImage['filter']>>) => {
        if (!bgImage) return;
        onUpdate({
            backgroundImage: {
                ...bgImage,
                filter: {
                    brightness: bgImage.filter?.brightness ?? 100,
                    contrast: bgImage.filter?.contrast ?? 100,
                    blur: bgImage.filter?.blur ?? 0,
                    saturate: bgImage.filter?.saturate ?? 100,
                    hueRotate: bgImage.filter?.hueRotate ?? 0,
                    sepia: bgImage.filter?.sepia ?? 0,
                    ...filterUpdates,
                },
            },
        });
    };

    const applyFilterPreset = (preset: typeof FILTER_PRESETS[0]) => {
        if (!bgImage) return;
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

    const filteredPresets = FILTER_PRESETS.filter(p => p.category === filterCategory);

    return (
        <div className="space-y-4">
            {/* Background Color */}
            <ColorPicker
                label="Couleur de fond"
                value={slide.backgroundColor}
                onChange={(color) => onUpdate({ backgroundColor: color })}
            />

            {/* Image Selection */}
            <div className="space-y-2">
                <label className="text-xs text-white/60 block">Image de fond</label>
                {bgImage ? (
                    <div className="space-y-3">
                        {/* Image preview */}
                        <div className="relative aspect-video rounded overflow-hidden border border-white/10">
                            <img
                                src={bgImage.imageUrl}
                                alt="Background"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setImagePickerOpen(true)}
                                    className="text-xs"
                                >
                                    Changer
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleRemoveImage}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        {/* Object Fit */}
                        <div className="space-y-1">
                            <label className="text-xs text-white/60">Ajustement</label>
                            <Select
                                value={bgImage.objectFit}
                                onValueChange={(v) => updateBackgroundImage({ objectFit: v as 'cover' | 'contain' | 'fill' })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cover">Couvrir</SelectItem>
                                    <SelectItem value="contain">Contenir</SelectItem>
                                    <SelectItem value="fill">Remplir</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Object Position */}
                        <div className="space-y-1">
                            <label className="text-xs text-white/60">Position</label>
                            <Select
                                value={bgImage.objectPosition}
                                onValueChange={(v) => updateBackgroundImage({ objectPosition: v })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="center">Centre</SelectItem>
                                    <SelectItem value="top">Haut</SelectItem>
                                    <SelectItem value="bottom">Bas</SelectItem>
                                    <SelectItem value="left">Gauche</SelectItem>
                                    <SelectItem value="right">Droite</SelectItem>
                                    <SelectItem value="top left">Haut Gauche</SelectItem>
                                    <SelectItem value="top right">Haut Droite</SelectItem>
                                    <SelectItem value="bottom left">Bas Gauche</SelectItem>
                                    <SelectItem value="bottom right">Bas Droite</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Scale/Zoom */}
                        <div className="space-y-1">
                            <label className="text-xs text-white/60 flex justify-between">
                                <span className="flex items-center gap-1">
                                    <ZoomIn className="h-3 w-3" />
                                    Zoom
                                </span>
                                <span className="text-primary">{Math.round(bgImage.scale * 100)}%</span>
                            </label>
                            <Slider
                                value={[bgImage.scale]}
                                onValueChange={([v]) => updateBackgroundImage({ scale: v })}
                                min={0.5}
                                max={3}
                                step={0.1}
                            />
                        </div>

                        {/* ═══ TikTok Filter Presets ═══ */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <div className="flex items-center gap-2">
                                <Palette className="h-3.5 w-3.5 text-white/60" />
                                <label className="text-xs text-white/60 font-medium">Filtres prédéfinis</label>
                            </div>

                            {/* Category tabs */}
                            <div className="flex gap-1 flex-wrap">
                                {FILTER_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setFilterCategory(cat.id)}
                                        className={cn(
                                            "px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                                            filterCategory === cat.id
                                                ? "bg-primary/20 text-primary border border-primary/30"
                                                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                                        )}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {/* Filter preset grid with image previews */}
                            <div className="grid grid-cols-4 gap-1.5">
                                {/* Normal/Reset */}
                                <button
                                    onClick={() => applyFilterPreset(FILTER_PRESETS[0])}
                                    className="flex flex-col items-center gap-0.5"
                                >
                                    <div className="w-full aspect-square rounded-lg overflow-hidden border border-white/20 relative">
                                        <img src={bgImage.imageUrl} alt="Normal" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <RotateCcw className="h-3 w-3 text-white" />
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-white/50">Normal</span>
                                </button>

                                {filteredPresets.map(preset => {
                                    const filterCSS = getFilterCSS(preset.filter);
                                    const isActive = bgImage.filter?.brightness === preset.filter.brightness
                                        && bgImage.filter?.contrast === preset.filter.contrast
                                        && (bgImage.filter?.saturate ?? 100) === preset.filter.saturate
                                        && (bgImage.filter?.hueRotate ?? 0) === preset.filter.hueRotate;

                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => applyFilterPreset(preset)}
                                            className="flex flex-col items-center gap-0.5"
                                        >
                                            <div className={cn(
                                                "w-full aspect-square rounded-lg overflow-hidden border-2 transition-all",
                                                isActive ? "border-primary ring-1 ring-primary/30" : "border-white/10"
                                            )}>
                                                <img
                                                    src={bgImage.imageUrl}
                                                    alt={preset.name}
                                                    className="w-full h-full object-cover"
                                                    style={{ filter: filterCSS }}
                                                />
                                            </div>
                                            <span className={cn(
                                                "text-[9px]",
                                                isActive ? "text-primary font-medium" : "text-white/50"
                                            )}>
                                                {preset.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ═══ Manual Filters (collapsible) ═══ */}
                        <div className="space-y-3 pt-2 border-t border-white/10">
                            <button
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className="flex items-center justify-between w-full text-xs text-white/60 font-medium hover:text-white/80 transition-colors"
                            >
                                <span>Réglages manuels</span>
                                {showAdvancedFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>

                            {showAdvancedFilters && (
                                <div className="space-y-3">
                                    {/* Brightness */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-white/40">
                                            <span className="flex items-center gap-1">
                                                <Sun className="h-3 w-3" />
                                                Luminosité
                                            </span>
                                            <span>{bgImage.filter?.brightness ?? 100}%</span>
                                        </div>
                                        <Slider
                                            value={[bgImage.filter?.brightness ?? 100]}
                                            onValueChange={([v]) => updateFilter({ brightness: v })}
                                            min={0}
                                            max={200}
                                        />
                                    </div>

                                    {/* Contrast */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-white/40">
                                            <span className="flex items-center gap-1">
                                                <Contrast className="h-3 w-3" />
                                                Contraste
                                            </span>
                                            <span>{bgImage.filter?.contrast ?? 100}%</span>
                                        </div>
                                        <Slider
                                            value={[bgImage.filter?.contrast ?? 100]}
                                            onValueChange={([v]) => updateFilter({ contrast: v })}
                                            min={0}
                                            max={200}
                                        />
                                    </div>

                                    {/* Saturation */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-white/40">
                                            <span className="flex items-center gap-1">
                                                <Palette className="h-3 w-3" />
                                                Saturation
                                            </span>
                                            <span>{bgImage.filter?.saturate ?? 100}%</span>
                                        </div>
                                        <Slider
                                            value={[bgImage.filter?.saturate ?? 100]}
                                            onValueChange={([v]) => updateFilter({ saturate: v })}
                                            min={0}
                                            max={200}
                                        />
                                    </div>

                                    {/* Hue Rotate */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-white/40">
                                            <span>Teinte</span>
                                            <span>{bgImage.filter?.hueRotate ?? 0}°</span>
                                        </div>
                                        <Slider
                                            value={[bgImage.filter?.hueRotate ?? 0]}
                                            onValueChange={([v]) => updateFilter({ hueRotate: v })}
                                            min={0}
                                            max={360}
                                        />
                                    </div>

                                    {/* Sepia */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-white/40">
                                            <span>Sépia</span>
                                            <span>{bgImage.filter?.sepia ?? 0}%</span>
                                        </div>
                                        <Slider
                                            value={[bgImage.filter?.sepia ?? 0]}
                                            onValueChange={([v]) => updateFilter({ sepia: v })}
                                            min={0}
                                            max={100}
                                        />
                                    </div>

                                    {/* Blur */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-white/40">
                                            <span className="flex items-center gap-1">
                                                <Droplets className="h-3 w-3" />
                                                Flou
                                            </span>
                                            <span>{bgImage.filter?.blur ?? 0}px</span>
                                        </div>
                                        <Slider
                                            value={[bgImage.filter?.blur ?? 0]}
                                            onValueChange={([v]) => updateFilter({ blur: v })}
                                            min={0}
                                            max={20}
                                        />
                                    </div>

                                    {/* Reset Filters Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-white/10 text-white/60"
                                        onClick={() => updateBackgroundImage({
                                            filter: { brightness: 100, contrast: 100, blur: 0, saturate: 100, hueRotate: 0, sepia: 0 }
                                        })}
                                    >
                                        Réinitialiser les filtres
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full border-white/10 border-dashed text-white/60 hover:text-white hover:border-white/30"
                        onClick={() => setImagePickerOpen(true)}
                    >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Choisir une image
                    </Button>
                )}
            </div>

            <ImagePickerModal
                open={imagePickerOpen}
                onOpenChange={setImagePickerOpen}
                images={images}
                selectedImageId={bgImage?.imageId}
                onSelect={handleImageSelect}
            />
        </div>
    );
}
