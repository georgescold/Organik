'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ColorPicker } from '../controls/color-picker';
import {
    Bold,
    Italic,
    AlignLeft,
    AlignCenter,
    AlignRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TextLayer, TextMode } from '@/types/post';

// TikTok editor font names mapped to real Google Fonts equivalents
const fontFamilies = [
    { label: 'Classic', family: 'Montserrat' },
    { label: 'Elegance', family: 'Playfair Display' },
    { label: 'Neon', family: 'Abel' },
    { label: 'Retro', family: 'Bungee Shade' },
    { label: 'Comic Sans', family: 'Comic Neue' },
    { label: 'Tallhaus', family: 'Oswald' },
    { label: 'Vintage', family: 'Special Elite' },
    { label: 'Bomb', family: 'Permanent Marker' },
    { label: 'Signature', family: 'Dancing Script' },
    { label: 'Typewriter', family: 'Source Code Pro' },
    { label: 'Lyrical', family: 'Caveat' },
    { label: 'Verve', family: 'Rubik' },
    { label: 'Oxygen', family: 'Oxygen' },
    // Impact / Bold extras
    { label: 'Anton', family: 'Anton' },
    { label: 'Bebas Neue', family: 'Bebas Neue' },
    { label: 'Poppins', family: 'Poppins' },
];

const fontWeights = [
    { value: '400', label: 'Regular' },
    { value: '600', label: 'Semi Bold' },
    { value: '700', label: 'Bold' },
    { value: '800', label: 'Extra Bold' },
    { value: '900', label: 'Black' },
];

interface TextPanelProps {
    layer: TextLayer;
    onUpdate: (updates: Partial<TextLayer>) => void;
}

export function TextPanel({ layer, onUpdate }: TextPanelProps) {
    return (
        <div className="space-y-3">
            {/* Content */}
            <div className="space-y-1">
                <label className="text-xs text-white/60">Contenu</label>
                <Textarea
                    value={layer.content}
                    onChange={(e) => onUpdate({ content: e.target.value })}
                    className="bg-white/5 border-white/10 text-white min-h-[60px] resize-none text-sm"
                    placeholder="Entrez votre texte..."
                />
            </div>

            {/* Font Family */}
            <div className="space-y-1">
                <label className="text-xs text-white/60">Police</label>
                <Select
                    value={layer.fontFamily}
                    onValueChange={(v) => onUpdate({ fontFamily: v })}
                >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {fontFamilies.map((font) => (
                            <SelectItem key={font.family} value={font.family} style={{ fontFamily: font.family }}>
                                {font.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-xs text-white/60">Taille</label>
                    <div className="flex items-center gap-1">
                        <Input
                            type="number"
                            value={layer.fontSize}
                            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 16 })}
                            className="bg-white/5 border-white/10 text-white h-9"
                            min={8}
                            max={120}
                        />
                        <span className="text-white/40 text-xs">px</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-white/60">Graisse</label>
                    <Select
                        value={layer.fontWeight}
                        onValueChange={(v) => onUpdate({ fontWeight: v })}
                    >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {fontWeights.map((fw) => (
                                <SelectItem key={fw.value} value={fw.value}>
                                    {fw.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Style + Alignment in one row */}
            <div className="space-y-1">
                <label className="text-xs text-white/60">Style & Alignement</label>
                <div className="flex gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "border-white/10 h-8 w-8 p-0",
                            parseInt(layer.fontWeight) >= 700
                                ? "bg-white/20 text-white"
                                : "text-white/60 hover:text-white"
                        )}
                        onClick={() => onUpdate({
                            fontWeight: parseInt(layer.fontWeight) >= 700 ? '400' : '700'
                        })}
                    >
                        <Bold className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "border-white/10 h-8 w-8 p-0",
                            layer.fontStyle === 'italic'
                                ? "bg-white/20 text-white"
                                : "text-white/60 hover:text-white"
                        )}
                        onClick={() => onUpdate({
                            fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic'
                        })}
                    >
                        <Italic className="h-3.5 w-3.5" />
                    </Button>
                    <div className="w-px bg-white/10 mx-0.5" />
                    {(['left', 'center', 'right'] as const).map((align) => (
                        <Button
                            key={align}
                            variant="outline"
                            size="sm"
                            className={cn(
                                "border-white/10 h-8 w-8 p-0",
                                layer.textAlign === align
                                    ? "bg-white/20 text-white"
                                    : "text-white/60 hover:text-white"
                            )}
                            onClick={() => onUpdate({ textAlign: align })}
                        >
                            {align === 'left' && <AlignLeft className="h-3.5 w-3.5" />}
                            {align === 'center' && <AlignCenter className="h-3.5 w-3.5" />}
                            {align === 'right' && <AlignRight className="h-3.5 w-3.5" />}
                        </Button>
                    ))}
                </div>
            </div>

            {/* TikTok Text Mode Toggle */}
            <div className="space-y-1">
                <label className="text-xs text-white/60">Mode TikTok</label>
                <div className="flex gap-1">
                    {([
                        { value: 'outline' as TextMode, label: 'Contour' },
                        { value: 'box' as TextMode, label: 'Boîte' },
                        { value: 'caption' as TextMode, label: 'Caption' },
                        { value: 'shadow' as TextMode, label: 'Ombre' },
                    ]).map((mode) => (
                        <Button
                            key={mode.value}
                            variant="outline"
                            size="sm"
                            className={cn(
                                "flex-1 border-white/10 text-[10px] h-8 px-1.5",
                                (layer.textMode || 'outline') === mode.value
                                    ? "bg-primary/30 text-white border-primary/50"
                                    : "text-white/60 hover:text-white"
                            )}
                            onClick={() => {
                                const updates: Partial<TextLayer> = { textMode: mode.value };
                                if (mode.value === 'outline') {
                                    updates.outlineWidth = layer.outlineWidth || 1.5;
                                    updates.outlineColor = layer.outlineColor || '#000000';
                                    updates.color = '#ffffff';
                                    updates.backgroundColor = '#00000000';
                                } else if (mode.value === 'box') {
                                    updates.outlineWidth = 0;
                                    updates.color = '#000000';
                                    updates.backgroundColor = layer.backgroundColor && layer.backgroundColor !== '#00000000'
                                        ? layer.backgroundColor : 'rgba(255,255,255,0.95)';
                                    updates.lineHeight = 1.6;
                                } else if (mode.value === 'caption') {
                                    updates.outlineWidth = 0;
                                    updates.color = '#000000';
                                    updates.backgroundColor = layer.backgroundColor && layer.backgroundColor !== '#00000000'
                                        ? layer.backgroundColor : 'rgba(255,255,255,0.92)';
                                    updates.lineHeight = 1.5;
                                } else if (mode.value === 'shadow') {
                                    updates.outlineWidth = 0;
                                    updates.backgroundColor = '#00000000';
                                }
                                onUpdate(updates);
                            }}
                        >
                            {mode.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Text Color */}
            <ColorPicker
                label="Couleur du texte"
                value={layer.color}
                onChange={(color) => onUpdate({ color })}
            />

            {/* Mode-specific controls */}
            {(layer.textMode || 'outline') === 'outline' && (
                <>
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 flex justify-between">
                            <span>Épaisseur du contour</span>
                            <span className="text-primary">{layer.outlineWidth || 0}px</span>
                        </label>
                        <Slider
                            value={[layer.outlineWidth || 2]}
                            onValueChange={([v]) => onUpdate({ outlineWidth: v })}
                            min={0}
                            max={8}
                            step={0.5}
                        />
                    </div>
                    {(layer.outlineWidth || 0) > 0 && (
                        <ColorPicker
                            label="Couleur du contour"
                            value={layer.outlineColor || '#000000'}
                            onChange={(color) => onUpdate({ outlineColor: color })}
                        />
                    )}
                </>
            )}

            {(layer.textMode === 'box' || layer.textMode === 'caption') && (
                <ColorPicker
                    label="Fond de la boîte"
                    value={layer.backgroundColor || 'rgba(255,255,255,0.95)'}
                    onChange={(color) => onUpdate({ backgroundColor: color })}
                />
            )}

            {/* Line Height */}
            <div className="space-y-1">
                <label className="text-xs text-white/60 flex justify-between">
                    <span>Interligne</span>
                    <span className="text-primary">{(layer.lineHeight || 1.2).toFixed(1)}</span>
                </label>
                <Slider
                    value={[layer.lineHeight || 1.2]}
                    onValueChange={([v]) => onUpdate({ lineHeight: v })}
                    min={0.8}
                    max={2.5}
                    step={0.1}
                />
            </div>

            {/* Opacity */}
            <div className="space-y-1">
                <label className="text-xs text-white/60 flex justify-between">
                    <span>Opacité</span>
                    <span className="text-primary">{layer.opacity}%</span>
                </label>
                <Slider
                    value={[layer.opacity]}
                    onValueChange={([v]) => onUpdate({ opacity: v })}
                    min={0}
                    max={100}
                    step={1}
                />
            </div>
        </div>
    );
}
